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

import {
  abi as PaymasterV07Abi,
} from "../contracts/abi/SignatureVerifyingPaymasterV07.json";

// Constants
const PAYMASTER_VERSION = "1";

/**
 * Generate EIP712 signature for paymaster data
 */
const generatePaymasterSignature = async (
    walletClient: WalletClient<Transport, Chain, Account>,
    paymasterAddress: Hex,
    validUntil: number,
    validAfter: number,
    senderAddress: Hex,
    nonce: bigint,
    calldataHash: Hex
): Promise<Hex> => {
  const chainId = await walletClient.getChainId();

  return await walletClient.signTypedData({
    domain: {
      name: "SignatureVerifyingPaymaster",
      version: PAYMASTER_VERSION,
      chainId: chainId,
      verifyingContract: paymasterAddress
    },
    types: {
      PaymasterData: [
        { name: "validUntil", type: "uint48" },
        { name: "validAfter", type: "uint48" },
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "calldataHash", type: "bytes32" }
      ]
    },
    primaryType: "PaymasterData",
    message: {
      validUntil: validUntil,
      validAfter: validAfter,
      sender: senderAddress,
      nonce: nonce,
      calldataHash: calldataHash
    }
  });
};

/**
 * Create paymaster data by combining timestamps and signature
 * @param validUntil The timestamp until which the signature is valid
 * @param validAfter The timestamp after which the signature is valid
 * @param signature The EIP712 signature
 * @returns The formatted paymaster data
 */
const createPaymasterData = (
    validUntil: number,
    validAfter: number,
    signature: Hex
): Hex => {
  const validUntilHex = validUntil.toString(16).padStart(12, '0');
  const validAfterHex = validAfter.toString(16).padStart(12, '0');
  return `0x${validAfterHex}${validUntilHex}${signature.slice(2)}` as Hex;
};

// SBC methods

/**
 * Handle the SBC method for v0.7 entrypoint
 * @param userOperation The user operation to handle
 * @param altoBundlerV07 The bundler client for v0.7
 * @param paymasterV07 The paymaster contract for v0.7
 * @param walletClient The wallet client of the Trusted Signer
 * @param estimateGas Whether to estimate the gas
 * @returns The result of the method
 */
const handleSbcMethodV07 = async (
    userOperation: UserOperation<"v0.7">,
    altoBundlerV07: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE> | undefined,
    paymasterV07: GetContractReturnType<
        typeof PaymasterV07Abi,
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

    // Generate hash of calldata for signature verification
    const calldataHash = keccak256(hexToBytes(userOperation.callData));

    // Generate EIP712 signature
    const signature = await generatePaymasterSignature(
        trustedSignerWalletClient,
        paymasterV07.address,
        validUntil,
        validAfter,
        senderAddress,
        userOperation.nonce,
        calldataHash
    );

    // Construct paymasterData
    const paymasterData = createPaymasterData(validUntil, validAfter, signature);

    if (estimateGas && altoBundlerV07) {
      // For gas estimation - commented out bundler usage for private chains, use hardcoded values instead
      /*
      let op = {
        ...userOperation,
        paymaster: paymasterV07.address,
        paymasterData: paymasterData
      };

      let gasEstimates: EstimateUserOperationGasReturnType<ENTRYPOINT_ADDRESS_V07_TYPE>;
      try {
        gasEstimates = await altoBundlerV07.estimateUserOperationGas({
          userOperation: op,
        });
      } catch (e) {
        console.error("Gas estimation error:", e);
        if (!(e instanceof BaseError)) throw new InternalBundlerError();
        throw e.walk() as RpcRequestError;
      }

      return {
        preVerificationGas: toHex(gasEstimates.preVerificationGas),
        callGasLimit: toHex(gasEstimates.callGasLimit),
        paymasterVerificationGasLimit: toHex(gasEstimates.paymasterVerificationGasLimit || 100_000n),
        paymasterPostOpGasLimit: toHex(gasEstimates.paymasterPostOpGasLimit || 50_000n),
        verificationGasLimit: toHex(gasEstimates.verificationGasLimit),
        paymaster: paymasterV07.address,
        paymasterData: paymasterData,
      };
      */
    }

    // Return with default gas limits (used when no bundler or not estimating)
    const callGasLimit = userOperation.callGasLimit || 500_000n;
    const verificationGasLimit = userOperation.verificationGasLimit || 500_000n;
    const preVerificationGas = userOperation.preVerificationGas || 100_000n;
    const paymasterVerificationGasLimit = userOperation.paymasterVerificationGasLimit || 100_000n;
    const paymasterPostOpGasLimit = userOperation.paymasterPostOpGasLimit || 50_000n;

    return {
      preVerificationGas: toHex(preVerificationGas),
      callGasLimit: toHex(callGasLimit),
      paymasterVerificationGasLimit: toHex(paymasterVerificationGasLimit),
      paymasterPostOpGasLimit: toHex(paymasterPostOpGasLimit),
      verificationGasLimit: toHex(verificationGasLimit),
      paymaster: paymasterV07.address,
      paymasterData: paymasterData,
    };

  } catch (error) {
    console.error("Critical error during paymaster signing:", error);
    throw error;
  }
};

/**
 * Handle the SBC method
 * @param altoBundlerV07 The bundler client for v0.7
 * @param paymasterV07 The paymaster contract for v0.7
 * @param walletClient The wallet client of the Trusted Signer
 * @param parsedBody The parsed body of the request
 * @returns The result of the method
 */
const handleSbcMethod = async (
    altoBundlerV07: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE> | undefined,
    paymasterV07: GetContractReturnType<
        typeof PaymasterV07Abi,
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

    const [userOperation, entryPoint] = params.data;

    if (entryPoint !== ENTRYPOINT_ADDRESS_V07) {
      throw new RpcError(
          "EntryPoint not supported",
          ValidationErrors.InvalidFields
      );
    }

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const validAfter = currentTimestamp - 10; // 10 seconds before current timestamp
      const validUntil = currentTimestamp + 3600; // 1 hour validity

      const senderAddress = userOperation.sender;
      const calldataHash = keccak256(hexToBytes(userOperation.callData));

      const signature = await generatePaymasterSignature(
          trustedSignerWalletClient,
          paymasterV07.address,
          validUntil,
          validAfter,
          senderAddress,
          userOperation.nonce,
          calldataHash
      );

      const paymasterData = createPaymasterData(validUntil, validAfter, signature);

      return {
        paymasterData: paymasterData,
        paymasterVerificationGasLimit: toHex(100_000n),
        paymasterPostOpGasLimit: toHex(50_000n),
        paymaster: paymasterV07.address
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

    const [userOperation, entryPoint] = params.data;

    if (entryPoint === ENTRYPOINT_ADDRESS_V07) {
      console.log("Handling pm_getPaymasterData for v0.7 entrypoint");
      return await handleSbcMethodV07(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV07,
          paymasterV07,
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

    if (entryPoint === ENTRYPOINT_ADDRESS_V07) {
      console.log("Handling pm_sponsorUserOperation for v0.7 entrypoint");
      return await handleSbcMethodV07(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV07,
          paymasterV07,
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

    if (entryPoint === ENTRYPOINT_ADDRESS_V07) {
      console.log("Handling eth_estimateUserOperationGas for v0.7 entrypoint");
      return await handleSbcMethodV07(
          userOperation as UserOperation<"v0.7">,
          altoBundlerV07,
          paymasterV07,
          trustedSignerWalletClient,
          true
      );
    }

    throw new RpcError(
        "EntryPoint not supported",
        ValidationErrors.InvalidFields
    );

  }
  throw new RpcError(
      "Attempted to call an unknown method",
      ValidationErrors.InvalidFields
  );
};

export const createSbcRpcHandler = (
    altoBundlerV07: PimlicoBundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE> | undefined,
    paymasterV07: GetContractReturnType<
        typeof PaymasterV07Abi,
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
          altoBundlerV07,
          paymasterV07,
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
