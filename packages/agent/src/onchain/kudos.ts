import type { Address } from "viem";
import { parseAbi } from "viem";
import type { PublicClient, WalletClient } from "viem";
import { PolicyEngine } from "../policy/policy.js";
import { RateLimiter, withBackoff } from "../util/rateLimit.js";

const kudosAbi = parseAbi([
  "function mint(address to, string tokenURI, string castHash, string castUrl) external returns (uint256)",
  "event KudosMinted(address indexed to, uint256 indexed tokenId, string castHash, string castUrl)"
]);

export type MintResult = {
  txHash: string;
  tokenId: string;
};

export async function mintKudosNFT(options: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  contractAddress: Address;
  to: Address;
  tokenURI: string;
  castHash: string;
  castUrl: string;
  policy: PolicyEngine;
  rateLimiter: RateLimiter;
}): Promise<MintResult> {
  const { publicClient, walletClient, contractAddress, to, tokenURI, castHash, castUrl, policy, rateLimiter } = options;

  const policyCheck = policy.canMint(contractAddress);
  if (!policyCheck.allowed) {
    throw new Error(`Policy blocked mint: ${policyCheck.reason}`);
  }

  policy.recordMintAttempt();

  const simulation = await publicClient.simulateContract({
    address: contractAddress,
    abi: kudosAbi,
    functionName: "mint",
    args: [to, tokenURI, castHash, castUrl],
    account: walletClient.account
  });

  const hash = await rateLimiter.schedule(() =>
    withBackoff(
      () => walletClient.writeContract(simulation.request),
      { retries: 2, baseMs: 1000, maxMs: 8000 }
    )
  );

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  const tokenId = receipt.logs
    .map((log) => {
      try {
        const decoded = publicClient.decodeEventLog({
          abi: kudosAbi,
          data: log.data,
          topics: log.topics
        });
        if (decoded.eventName === "KudosMinted") {
          return decoded.args.tokenId?.toString();
        }
      } catch {
        return undefined;
      }
      return undefined;
    })
    .find(Boolean);

  return { txHash: hash, tokenId: tokenId ?? "unknown" };
}
