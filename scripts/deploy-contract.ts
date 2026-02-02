import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const required = ["BASE_RPC_URL", "BASE_CHAIN_ID", "BASE_PRIVATE_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key}`);
  }
}

const rpcUrl = process.env.BASE_RPC_URL as string;
const chainId = Number(process.env.BASE_CHAIN_ID);
const account = privateKeyToAccount(process.env.BASE_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: {
    id: chainId,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  },
  transport: http(rpcUrl)
});

const walletClient = createWalletClient({
  account,
  chain: {
    id: chainId,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } }
  },
  transport: http(rpcUrl)
});

const artifactPath = resolve("contracts/artifacts/contracts/KudosNFT.sol/KudosNFT.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

async function main() {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: []
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`KudosNFT deployed at ${receipt.contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
