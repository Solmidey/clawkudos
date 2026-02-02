import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { EnvConfig } from "../config/env.js";

export function buildPublicClient(config: EnvConfig) {
  return createPublicClient({
    chain: {
      id: config.BASE_CHAIN_ID,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [config.BASE_RPC_URL] }
      }
    },
    transport: http(config.BASE_RPC_URL)
  });
}

export function buildWalletClient(config: EnvConfig) {
  const account = privateKeyToAccount(config.BASE_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: {
      id: config.BASE_CHAIN_ID,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [config.BASE_RPC_URL] }
      }
    },
    transport: http(config.BASE_RPC_URL)
  });
}
