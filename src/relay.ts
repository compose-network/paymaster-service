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

const generatePaymasterSignature = async (
    walletClient: WalletClient<Transport, Chain, Account>,
    paymasterAddress: Hex,
    validUntil: number,
    validAfter: number,
    userOp: UserOperation<"v0.7">
): Promise<Hex> => {
  const chainId = await walletClient.getChainId();

  const accountGasLimitsHex = userOp.accountGasLimits ?? '0x0000000000000000000000000000000000000000000000000000000000000000';
  const verificationGasLimitBig = BigInt(accountGasLimitsHex.slice(0, 34));
  const callGasLimitBig = BigInt(`0x${accountGasLimitsHex.slice(34)}`);

  const gasFeesHex = userOp.gasFees ?? '0x0000000000000000000000000000000000000000000000000000000000000000';
  const maxPriorityFeePerGasBig = BigInt(gasFeesHex.slice(0, 34));
  const maxFeePerGasBig = BigInt(`0x${gasFeesHex.slice(34)}`);

  const initCodeHash = userOp.initCode ? keccak256(hexToBytes(userOp.initCode)) : "0x0000000000000000000000000000000000000000000000000000000000000000";
  const callDataHash = keccak256(hexToBytes(userOp.callData));

  return await walletClient.signTypedData({
    domain: {
      name: "SignatureVerifyingPaymaster",
      version: PAYMASTER_VERSION,
      chainId: chainId,
      verifyingContract: paymasterAddress,
    },
    types: {
      UserOperationRequest: [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCode", type: "bytes32" },
        { name: "callData", type: "bytes32" },
        { name: "verificationGasLimit", type: "uint256" },
        { name: "callGasLimit", type: "uint256" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "maxPriorityFeePerGas", type: "uint256" },
        { name: "maxFeePerGas", type: "uint256" },
        { name: "paymasterVerificationGasLimit", type: "uint256" },
        { name: "paymasterPostOpGasLimit", type: "uint256" },
        { name: "validAfter", type: "uint48" },
        { name: "validUntil", type: "uint48" },
      ]
    },
    primaryType: "UserOperationRequest",
    message: {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: initCodeHash,
      callData: callDataHash,
      verificationGasLimit: verificationGasLimitBig,
      callGasLimit: callGasLimitBig,
      preVerificationGas: userOp.preVerificationGas || 0n,
      maxPriorityFeePerGas: maxPriorityFeePerGasBig,
      maxFeePerGas: maxFeePerGasBig,
      paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit || 0n,
      paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit || 0n,
      validAfter,
      validUntil,
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
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const validAfter = currentTimestamp - 10;
    const validUntil = currentTimestamp + 7200;

    // Generate EIP712 signature with fixed function
    const signature = await generatePaymasterSignature(
        trustedSignerWalletClient,
        paymasterV07.address,
        validUntil,
        validAfter,
        userOperation
    );

    const paymasterData = createPaymasterData(validUntil, validAfter, signature);

    if (estimateGas && altoBundlerV07) {
      // Gas estimation disabled for private chains
    }

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
      const validAfter = currentTimestamp - 10;
      const validUntil = currentTimestamp + 7200;

      const signature = await generatePaymasterSignature(
          trustedSignerWalletClient,
          paymasterV07.address,
          validUntil,
          validAfter,
          userOperation
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
        message: (err as any).message,
        data: (err as any).data,
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