import {
  http,
  createWalletClient,
  Chain,
  Hex,
  defineChain,
} from "viem";
import { localhost, base, baseSepolia, hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

export const hoodi = defineChain({
  id: 560048,
  name: 'Ethereum Hoodi',
  network: 'hoodi',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://ethereum-hoodi-rpc.publicnode.com'] },
    public: { http: ['https://ethereum-hoodi-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'HoodiScan', url: 'https://hoodi.etherscan.io' },
  },
  testnet: true,
});

export const rollupA = defineChain({
  id: 77777,
  name: 'Rollup A',
  network: 'rollupA',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [process.env.ROLLUPA_RPC_URL] },
    public: { http: [process.env.ROLLUPA_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout-rollup-1.stage.ops.ssvlabsinternal.com/' },
  },
  testnet: true,
});

export const rollupB = defineChain({
  id: 88888,
  name: 'Rollup B',
  network: 'rollupB',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [process.env.ROLLUPB_RPC_URL] },
    public: { http: [process.env.ROLLUPB_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout-rollup-2.stage.ops.ssvlabsinternal.com/' },
  },
  testnet: true,
});

/**
 * Returns the bigger of two BigInts.
 * @param a The first BigInt.
 * @param b The second BigInt.
 * @returns The bigger of the two BigInts.
 */
export const maxBigInt = (a: bigint, b: bigint) => {
  return a > b ? a : b;
};

/**
 * Returns true if the chain is supported.
 * @param chain The name of the chain to check.
 * @returns True if the chain is supported, false otherwise.
 */
export const isChainSupported = (chain: string) => {
  return (
      chain === "baseSepolia" ||
      chain === "base" ||
      chain === "localhost" ||
      chain === "hardhat" ||
      chain === "hoodi" ||
      chain === "rollupA" ||
      chain === "rollupB"
  );
};

/**
 * Returns the chain to use based on the chain name.
 * @param chain The name of the chain to use.
 * @returns The chain to use.
 */
export const getChain = (chain: string): Chain => {
  if (chain === "baseSepolia") {
    return baseSepolia;
  } else if (chain === "base") {
    return base;
  } else if (chain === "localhost") {
    return localhost;
  } else if (chain === "hardhat") {
    return hardhat;
  } else if (chain === "hoodi") {
    return hoodi;
  } else if (chain === "rollupA") {
    return rollupA;
  } else if (chain === "rollupB") {
    return rollupB;
  }
  throw new Error(`Unsupported chain: ${chain}`);
};

/**
 * Returns a wallet client for the given chain.
 * @param chain The name of the chain to use.
 * @returns The wallet client.
 */
export const getDeployerWalletClient = (chain: string) => {
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is not set");
  }
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  const account = privateKeyToAccount(privateKey as Hex);

  return createWalletClient({
    account,
    chain: getChain(chain),
    transport: http(getRPCUrl(chain)),
  });
};

/**
 * Returns a wallet client for the trusted signer.
 * @param chain The name of the chain to use.
 * @returns The wallet client for the trusted signer.
 */
export const getTrustedSignerWalletClient = (chain: string) => {
  let privateKey = process.env.TRUSTED_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TRUSTED_SIGNER_PRIVATE_KEY is not set");
  }
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  const account = privateKeyToAccount(privateKey as Hex);

  return createWalletClient({
    account,
    chain: getChain(chain),
    transport: http(getRPCUrl(chain)),
  });
};

/**
 * Returns the RPC URL for the given chain.
 * @param chain The name of the chain to use.
 * @returns The RPC URL.
 */
export const getRPCUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return process.env.BASE_SEPOLIA_RPC_URL;
  } else if (chain === "base") {
    return process.env.BASE_RPC_URL;
  } else if (chain === "localhost" || chain === "hardhat") {
    return process.env.LOCALHOST_RPC_URL;
  } else if (chain === "hoodi") {
    return process.env.HOODI_RPC_URL;
  } else if (chain === "rollupA") {
    return process.env.ROLLUPA_RPC_URL;
  } else if (chain === "rollupB") {
    return process.env.ROLLUPB_RPC_URL;
  }
  throw new Error(`Unsupported chain: ${chain}`);
};

/**
 * Returns the bundler URL for the given chain.
 * @param chain The name of the chain to use.
 * @returns The bundler URL.
 */
export const getBundlerUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return process.env.BASE_SEPOLIA_BUNDLER_URL;
  } else if (chain === "base") {
    return process.env.BASE_BUNDLER_URL;
  } else if (chain === "localhost" || chain === "hardhat") {
    return process.env.LOCALHOST_BUNDLER_URL;
  } else if (chain === "hoodi") {
    return process.env.HOODI_BUNDLER_URL;
  } else if (chain === "rollupA") {
    return process.env.ROLLUPA_BUNDLER_URL;
  } else if (chain === "rollupB") {
    return process.env.ROLLUPB_BUNDLER_URL;
  }
  throw new Error(`Unsupported chain: ${chain}`);
};

/**
 * Returns the scanner URL for the given chain.
 * @param chain The name of the chain to use.
 * @returns The scanner URL.
 */
export const getScannerUrl = (chain: string) => {
  if (chain === "baseSepolia") {
    return "https://sepolia.basescan.org";
  } else if (chain === "base") {
    return "https://basescan.org";
  } else if (chain === "localhost" || chain === "hardhat") {
    return "http://localhost:8545";
  } else if (chain === "hoodi") {
    return "https://hoodi.etherscan.io";
  } else if (chain === "rollupA") {
    return "https://blockscout-rollup-1.stage.ops.ssvlabsinternal.com/";
  } else if (chain === "rollupB") {
    return "https://blockscout-rollup-2.stage.ops.ssvlabsinternal.com/";
  }
  throw new Error(`Unsupported chain: ${chain}`);
};