import util from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  type Account,
  BaseError,
  type Chain,
  type GetContractReturnType,
  type Hex,
  type PublicClient,
  type RpcRequestError,
  type Transport,
  type WalletClient,
  hexToBytes,
  toHex,
  keccak256,
  pad,
} from "viem";
import { fromZodError } from "zod-validation-error";
import { type EstimateUserOperationGasReturnType } from "permissionless";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless/utils";
import type { PimlicoBundlerClient } from "permissionless/clients/pimlico";
import type {
  ENTRYPOINT_ADDRESS_V07_TYPE,
  UserOperation,
} from "permissionless/types";
import {
  InternalBundlerError,
  type JsonRpcSchema,
  RpcError,
  ValidationErrors,
  ethEstimateUserOperationGasParamsSchema,
  jsonRpcSchema,
  pmGetPaymasterData,
  pmGetPaymasterStubDataParamsSchema,
  pmSponsorUserOperationParamsSchema,
} from "./helpers/schema";
import {PAYMASTER_ABI as PaymasterAbi} from "./helpers/abi";
// Constants
const PAYMASTER_VERSION = "1";
const ENTRYPOINT_ADDRESS_V08 = "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108";
/**
 * Generate EIP712 signature for paymaster data
 */
const generatePaymasterSignature = async (
    walletClient: WalletClient<Transport, Chain, Account>,
    paymasterAddress: Hex,
    validUntil: number,
    validAfter: number,
    userOperation: UserOperation<"v0.8">,
    paymasterVerificationGasLimit: bigint,
    paymasterPostOpGasLimit: bigint
): Promise<Hex> => {
  const chainId = await walletClient.getChainId();

  const domain = {
    name: "SSVPaymasterECDSASigner",
    version: PAYMASTER_VERSION,
    chainId,
    verifyingContract: paymasterAddress
  };

  const types = {
    UserOperationRequest: [
      { name: "sender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "initCode", type: "bytes32" },
      { name: "callData", type: "bytes32" },
      { name: "accountGasLimits", type: "bytes32" },
      { name: "preVerificationGas", type: "uint256" },
      { name: "gasFees", type: "bytes32" },
      { name: "paymasterVerificationGasLimit", type: "uint256" },
      { name: "paymasterPostOpGasLimit", type: "uint256" },
      { name: "validAfter", type: "uint48" },
      { name: "validUntil", type: "uint48" }
    ]
  } as const;

  const accountGasLimits = `0x${pad(toHex(userOperation.verificationGasLimit), { size: 16 }).slice(2)}${pad(toHex(userOperation.callGasLimit), { size: 16 }).slice(2)}` as Hex;
  const gasFees = `0x${pad(toHex(userOperation.maxPriorityFeePerGas), { size: 16 }).slice(2)}${pad(toHex(userOperation.maxFeePerGas), { size: 16 }).slice(2)}` as Hex;

  const message = {
    sender: userOperation.sender,
    nonce: userOperation.nonce,
    initCode: keccak256(userOperation.initCode),
    callData: keccak256(userOperation.callData),
    accountGasLimits,
    preVerificationGas: userOperation.preVerificationGas,
    gasFees,
    paymasterVerificationGasLimit,
    paymasterPostOpGasLimit,
    validAfter: BigInt(validAfter),
    validUntil: BigInt(validUntil)
  };

  return await walletClient.signTypedData({
    domain,
    types,
    primaryType: "UserOperationRequest",
    message
  });
};
/**
 * Create paymaster data by combining timestamps and signature
 * @param validAfter The timestamp after which the signature is valid
 * @param validUntil The timestamp until which the signature is valid
 * @param signature The EIP712 signature
 * @returns The formatted paymaster data
 */
const createPaymasterData = (
    validAfter: number,
    validUntil: number,
    signature: Hex
): Hex => {
  const validAfterHex = validAfter.toString(16).padStart(12, '0');
  const validUntilHex = validUntil.toString(16).padStart(12, '0');
  return `0x${validAfterHex}${validUntilHex}${signature.slice(2)}` as Hex;
};
// SBC methods
/**
 * Handle the SBC method for v0.8 entrypoint
 * @param userOperation The user operation to handle
 * @param altoBundlerV08 The bundler client for v0.8
 * @param paymasterV08 The paymaster contract for v0.8
 * @param walletClient The wallet client of the Trusted Signer
 * @param estimateGas Whether to estimate the gas
 * @returns The result of the method
 */
const handleSbcMethodV08 = async (
    userOperation: UserOperation<"v0.7">,
    altoBundlerV08: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>,
    paymasterV08: GetContractReturnType<
        typeof PaymasterAbi,
        PublicClient<Transport, Chain>
    >,
    trustedSignerWalletClient: WalletClient<Transport, Chain, Account>,
    estimateGas: boolean
) => {
  try {
    // Set timestamps for validation window
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const validAfter = currentTimestamp - 10; // 10 seconds before current timestamp
    const validUntil = currentTimestamp + 3600; // 1 hour validity

    // Use the sender address from the userOperation
    const senderAddress = userOperation.sender;

    const payVerGasInitial = 100000n;
    const payPostOpGas = 50000n;
    let payVerGas = payVerGasInitial;

    let signature = await generatePaymasterSignature(
        trustedSignerWalletClient,
        paymasterV08.address,
        validUntil,
        validAfter,
        userOperation,
        payVerGas,
        payPostOpGas
    );

    let paymasterData = createPaymasterData(validAfter, validUntil, signature);

    if (estimateGas) {
      // Build packed paymasterAndData
      const packed = `0x${paymasterV08.address.slice(2)}${pad(toHex(payVerGas), { size: 16 }).slice(2)}${pad(toHex(payPostOpGas), { size: 16 }).slice(2)}${paymasterData.slice(2)}` as Hex;

      const op = {
        ...userOperation,
        paymasterAndData: packed
      };

      let gasEstimates: EstimateUserOperationGasReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>;
      // try {
      //   gasEstimates = await altoBundlerV08.estimateUserOperationGas({
      //     userOperation: op,
      //   });
      // } catch (e) {
      //   console.error("Gas estimation error:", e);
      //   if (!(e instanceof BaseError)) throw new InternalBundlerError();
      //   throw e.walk() as RpcRequestError;
      // }

      // Hardcode gas estimates with buffers
      gasEstimates = {
        preVerificationGas: 60000n, // 50k + 20%
        verificationGasLimit: 600000n, // 500k + 20%
        callGasLimit: 120000n, // 100k + 20%
        paymasterVerificationGasLimit: 120000n, // 100k + 20%
        paymasterPostOpGasLimit: 60000n // 50k + 20%
      };

      const estimatedPayVer = gasEstimates.paymasterVerificationGasLimit || payVerGasInitial;
      if (estimatedPayVer !== payVerGas) {
        payVerGas = estimatedPayVer;
        signature = await generatePaymasterSignature(
            trustedSignerWalletClient,
            paymasterV08.address,
            validUntil,
            validAfter,
            userOperation,
            payVerGas,
            payPostOpGas
        );
        paymasterData = createPaymasterData(validAfter, validUntil, signature);
      }

      return {
        preVerificationGas: toHex(gasEstimates.preVerificationGas),
        callGasLimit: toHex(gasEstimates.callGasLimit),
        paymasterVerificationGasLimit: toHex(payVerGas),
        paymasterPostOpGasLimit: toHex(gasEstimates.paymasterPostOpGasLimit || payPostOpGas),
        verificationGasLimit: toHex(gasEstimates.verificationGasLimit),
        paymaster: paymasterV08.address,
        paymasterData: paymasterData,
      };
    } else {
      // For non-estimation
      return {
        preVerificationGas: toHex(userOperation.preVerificationGas || 60000n),
        callGasLimit: toHex(userOperation.callGasLimit || 120000n),
        paymasterVerificationGasLimit: toHex(payVerGas),
        paymasterPostOpGasLimit: toHex(payPostOpGas),
        verificationGasLimit: toHex(userOperation.verificationGasLimit || 600000n),
        paymaster: paymasterV08.address,
        paymasterData: paymasterData,
      };
    }
  } catch (error) {
    console.error("Critical error during paymaster signing:", error);
    throw error;
  }
};
/**
 * Handle the SBC method
 * @param altoBundlerV08 The bundler client for v0.8
 * @param paymasterV08 The paymaster contract for v0.8
 * @param walletClient The wallet client of the Trusted Signer
 * @param parsedBody The parsed body of the request
 * @returns The result of the method
 */
const handleSbcMethod = async (
    altoBundlerV08: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>,
    paymasterV08: GetContractReturnType<
        typeof PaymasterAbi,
        PublicClient<Transport, Chain>
    >,
    trustedSignerWalletClient: WalletClient<Transport, Chain, Account>,
    parsedBody: JsonRpcSchema
) => {
  if (parsedBody.method === "pm_getPaymasterStubData") {
    const params = pmGetPaymasterStubDataParamsSchema.safeParse(
        parsedBody.params
    );
    if (!params.success) {
      throw new RpcError(
          fromZodError(params.error).message,
          ValidationErrors.InvalidFields
      );
    }
    const [userOperation, entryPoint, chainId] = params.data;
    if (entryPoint !== ENTRYPOINT_ADDRESS_V08) {
      throw new RpcError(
          "EntryPoint not supported",
          ValidationErrors.InvalidFields
      );
    }

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const validAfter = currentTimestamp - 10; // 10 seconds before current timestamp
      const validUntil = currentTimestamp + 3600; // 1 hour validity

      const payVerGas = 120000n; // 100k + 20%
      const payPostOpGas = 60000n; // 50k + 20%

      const signature = await generatePaymasterSignature(
          trustedSignerWalletClient,
          paymasterV08.address,
          validUntil,
          validAfter,
          userOperation as UserOperation<"v0.7">,
          payVerGas,
          payPostOpGas
      );

      const paymasterData = createPaymasterData(validAfter, validUntil, signature);

      return {
        paymasterData: paymasterData,
        paymasterVerificationGasLimit: toHex(payVerGas),
        paymasterPostOpGasLimit: toHex(payPostOpGas),
        paymaster: paymasterV08.address
      };
    } catch (error) {
      console.error("Critical error during paymaster stub data generation:", error);
      throw error;
    }
  }

  if (parsedBody.method === "pm_getPaymasterData") {
    const params = pmGetPaymasterData.safeParse(parsedBody.params);
    if (!params.success) {
      throw new RpcError(
          fromZodError(params.error).message,
          ValidationErrors.InvalidFields
      );
    }
    const [userOperation, entryPoint, chainId] = params.data;
    if (entryPoint === ENTRYPOINT_ADDRESS_V08) {
      console.log("Handling pm_getPaymasterData for v0.8 entrypoint");
      return await handleSbcMethodV08(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV08,
          paymasterV08,
          trustedSignerWalletClient,
          false
      );
    }
    throw new RpcError(
        "EntryPoint not supported",
        ValidationErrors.InvalidFields
    );
  }
  if (parsedBody.method === "pm_sponsorUserOperation") {
    const params = pmSponsorUserOperationParamsSchema.safeParse(
        parsedBody.params
    );
    if (!params.success) {
      throw new RpcError(
          fromZodError(params.error).message,
          ValidationErrors.InvalidFields
      );
    }
    const [userOperation, entryPoint] = params.data;
    if (entryPoint === ENTRYPOINT_ADDRESS_V08) {
      console.log("Handling pm_sponsorUserOperation for v0.8 entrypoint");
      return await handleSbcMethodV08(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV08,
          paymasterV08,
          trustedSignerWalletClient,
          true
      );
    }
    throw new RpcError(
        "EntryPoint not supported",
        ValidationErrors.InvalidFields
    );
  }
  if (parsedBody.method === "eth_estimateUserOperationGas") {
    const params = ethEstimateUserOperationGasParamsSchema.safeParse(parsedBody.params);
    if (!params.success) {
      throw new RpcError(
          fromZodError(params.error).message,
          ValidationErrors.InvalidFields
      );
    }
    const [userOperation, entryPoint] = params.data;
    if (entryPoint === ENTRYPOINT_ADDRESS_V08) {
      console.log("Handling eth_estimateUserOperationGas for v0.8 entrypoint");
      return await handleSbcMethodV08(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV08,
          paymasterV08,
          trustedSignerWalletClient,
          true
      );
    }
    throw new RpcError(
        "EntryPoint not supported",
        ValidationErrors.InvalidFields
    );

  }
  if (parsedBody.method === "pm_prepareUserOperation") {
    const params = pmSponsorUserOperationParamsSchema.safeParse(
        parsedBody.params
    );
    if (!params.success) {
      throw new RpcError(
          fromZodError(params.error).message,
          ValidationErrors.InvalidFields
      );
    }
    const [userOperation, entryPoint] = params.data;
    if (entryPoint !== ENTRYPOINT_ADDRESS_V08) {
      throw new RpcError(
          "EntryPoint not supported",
          ValidationErrors.InvalidFields
      );
    }
    const result = await handleSbcMethodV08(
        userOperation as UserOperation<"v0.7">,
        altoBundlerV08,
        paymasterV08,
        trustedSignerWalletClient,
        true
    );
    const paymasterVerificationGasLimit = result.paymasterVerificationGasLimit;
    const paymasterPostOpGasLimit = result.paymasterPostOpGasLimit;
    const paymasterAndData = `0x${result.paymaster.slice(2)}${paymasterVerificationGasLimit.slice(2)}${paymasterPostOpGasLimit.slice(2)}${result.paymasterData.slice(2)}` as Hex;
    const updatedUserOperation = {
      sender: userOperation.sender,
      nonce: toHex(userOperation.nonce),
      initCode: userOperation.initCode,
      callData: userOperation.callData,
      accountGasLimits: `0x${pad(result.verificationGasLimit, { size: 16 }).slice(2)}${pad(result.callGasLimit, { size: 16 }).slice(2)}` as Hex,
      preVerificationGas: result.preVerificationGas,
      gasFees: `0x${pad(toHex(userOperation.maxPriorityFeePerGas), { size: 16 }).slice(2)}${pad(toHex(userOperation.maxFeePerGas), { size: 16 }).slice(2)}` as Hex,
      paymasterAndData,
      signature: "0x" as Hex,
    };
    return updatedUserOperation;
  }
  throw new RpcError(
      "Attempted to call an unknown method",
      ValidationErrors.InvalidFields
  );
};
export const createSbcRpcHandler = (
    altoBundlerV08: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE>,
    paymasterV08: GetContractReturnType<
        typeof PaymasterAbi,
        PublicClient<Transport, Chain>
    >,
    trustedSignerWalletClient: WalletClient<Transport, Chain, Account>
) => {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const body = request.body;
    const parsedBody = jsonRpcSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new RpcError(
          fromZodError(parsedBody.error).message,
          ValidationErrors.InvalidFields
      );
    }
    try {
      const result = await handleSbcMethod(
          altoBundlerV08,
          paymasterV08,
          trustedSignerWalletClient,
          parsedBody.data
      );
      return {
        jsonrpc: "2.0",
        id: parsedBody.data.id,
        result,
      };
    } catch (err: unknown) {
      console.log(`JSON.stringify(err): ${util.inspect(err)}`);
      const error = {
        // biome-ignore lint/suspicious/noExplicitAny:
        message: (err as any).message,
        // biome-ignore lint/suspicious/noExplicitAny:
        data: (err as any).data,
        // biome-ignore lint/suspicious/noExplicitAny:
        code: (err as any).code ?? -32603,
      };
      return {
        jsonrpc: "2.0",
        id: parsedBody.data.id,
        error,
      };
    }
  };
};