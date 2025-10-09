import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless/utils";
import { createPimlicoBundlerClient } from "permissionless/clients/pimlico";
import { Address, getContract, http } from "viem";
import { getDeployerWalletClient, getChain, getTrustedSignerWalletClient, getRPCUrl, getBundlerUrl, isChainSupported } from "../helpers/utils";
import {PAYMASTER_ABI as PaymasterAbi} from "../helpers/abi";
import { createSbcRpcHandler } from "../relay";
const Sentry = require("@sentry/node");
interface IQueryString {
  name: string;
}
interface CustomRouteGenericQuery {
  Querystring: IQueryString;
}
interface IParams {
  chain: string;
}
interface CustomRouteGenericParam {
  Params: IParams;
}
const setupHandler = async (chain: string) => {
  const rpcUrl = getRPCUrl(chain);
  if (!rpcUrl) {
    const error = new Error(`RPC_URL for chain (${chain}) is not set`);
    Sentry.captureException(error);
    throw error;
  }

  const bundlerUrl = getBundlerUrl(chain);
  let altoBundlerV07;
  if (bundlerUrl) {
    altoBundlerV07 = createPimlicoBundlerClient({
      chain: getChain(chain),
      transport: http(bundlerUrl),
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });
  } else {
    altoBundlerV07 = null; // or undefined
  }

  try {
    const walletClient = getDeployerWalletClient(chain);

    if (!walletClient) {
      const error = new Error("Failed to initialize deployer wallet client");
      Sentry.captureException(error);
      throw error;
    }

    const owner = walletClient.account.address;
    console.log(`Deployer/Owner address: ${owner}`);
    const trustedSignerWalletClient = getTrustedSignerWalletClient(chain);

    if (!trustedSignerWalletClient) {
      const error = new Error("Failed to initialize trusted signer wallet client");
      Sentry.captureException(error);
      throw error;
    }

    const trustedSigner = trustedSignerWalletClient.account.address;
    console.log(`Trusted signer address: ${trustedSigner}`);
    const paymasterAddress = process.env.PROXY_ADDRESS as Address;
    console.log(`Using paymaster at address: ${paymasterAddress}`);

    if (!paymasterAddress) {
      const error = new Error("PROXY_ADDRESS environment variable is not set");
      Sentry.captureException(error);
      throw error;
    }
    const paymasterContract = getContract({
      address: paymasterAddress,
      abi: PaymasterAbi,
      client: walletClient,
    });
    let version;
    try {
      //version = await paymasterContract.read.VERSION();
    } catch (error) {
      const errorMessage = `Paymaster is not deployed for chain (${chain})`;
      Sentry.captureMessage(errorMessage, "error");
      throw new Error(errorMessage);
    }
    const altoBundlerV07 = createPimlicoBundlerClient({
      chain: getChain(chain),
      transport: http(bundlerUrl),
      entryPoint: ENTRYPOINT_ADDRESS_V07,
    });
    const rpcHandler = createSbcRpcHandler(
        altoBundlerV07,
        paymasterContract,
        trustedSignerWalletClient
    );

    console.log(`Paymaster v${version} ready for chain (${chain})`);
    return rpcHandler;
  } catch (error) {
    console.error(`Error setting up paymaster system for chain (${chain}):`, error);
    Sentry.captureException(error);
    throw error;
  }
};
const routes: FastifyPluginAsync = async (server) => {
  server.register(cors, {
    origin: "*",
    methods: ["POST", "GET", "OPTIONS"],
  });
  server.get("/", async (req: FastifyRequest, res: FastifyReply) => {
    res.status(200).send("Custom paymaster from SBC");
  });
  server.get("/debug-sentry", async (req: FastifyRequest, res: FastifyReply) => {
    throw new Error("This is a test error for Sentry");
  });
  server.register(
      async (instance: FastifyInstance, opts: FastifyServerOptions) => {
        instance.get(
            "/ping",
            async (
                req: FastifyRequest<CustomRouteGenericQuery>,
                res: FastifyReply
            ) => {
              res.status(200).send({ message: "pong" });
            }
        );
        instance.register(
            async (chainInstance: FastifyInstance) => {
              chainInstance.post(
                  "/v1/:chain",
                  async (
                      req: FastifyRequest<CustomRouteGenericParam>,
                      res: FastifyReply
                  ) => {
                    const { chain } = req.params;
                    if (!isChainSupported(chain)) {
                      const errorMessage = `Chain (${chain}) is not supported`;
                      Sentry.captureMessage(errorMessage, "error");
                      res.status(400).send({
                        error: errorMessage
                      });
                    }
                    try {
                      const rpcHandler = await setupHandler(chain);
                      return rpcHandler(req, res);
                    } catch (error) {
                      const errorMessage = `Error handling RPC request for chain (${chain}): ${error}`;
                      Sentry.captureMessage(errorMessage, "error");
                      res.status(500).send({
                        error: `Failed to process request for chain (${chain})`,
                        details: error instanceof Error ? error.message : 'Unknown error'
                      });
                    }
                  }
              );
            },
            {
              prefix: "/rpc",
            }
        );
      }
  );
};
export default routes;