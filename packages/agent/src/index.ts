import { loadEnv } from "./config/env.js";
import { logger, maskSecrets } from "./util/logger.js";
import { openDatabase } from "./store/db.js";
import { shouldProcessCast, recordFailure, recordSuccess } from "./store/dedupe.js";
import { buildKeywordQuery, parseChannels, parseKeywords } from "./farcaster/queries.js";
import { NeynarClient, resolveEvmAddress, sanitizeCastUrl, type FarcasterCast } from "./farcaster/client.js";
import { buildPublicClient, buildWalletClient } from "./onchain/baseClient.js";
import { mintKudosNFT } from "./onchain/kudos.js";
import { PolicyEngine } from "./policy/policy.js";
import { RateLimiter } from "./util/rateLimit.js";
import { sanitizeText, safeJsonStringify } from "./util/sanitize.js";
import type { Address } from "viem";

function summarizeCast(text: string) {
  const sanitized = sanitizeText(text, 120);
  return sanitized.length > 0 ? sanitized : "Builder shipped an update on Farcaster.";
}

function buildTokenUri(options: {
  cast: FarcasterCast;
  summary: string;
  castUrl: string;
}) {
  const payload = {
    name: "ClawKudos",
    description: options.summary,
    external_url: options.castUrl,
    attributes: [
      { trait_type: "cast_hash", value: options.cast.hash },
      { trait_type: "fid", value: options.cast.fid },
      { trait_type: "timestamp", value: options.cast.timestamp }
    ]
  };
  return `data:application/json,${encodeURIComponent(safeJsonStringify(payload))}`;
}

async function fetchCasts(client: NeynarClient, mode: string, keywords: string[], channels: string[]) {
  if (mode === "channel") {
    const casts = await Promise.all(channels.map((channel) => client.fetchChannelCasts(channel)));
    return casts.flat();
  }
  const query = buildKeywordQuery(keywords);
  return client.searchCastsByKeywords(query);
}

async function runOnce() {
  const config = loadEnv();
  logger.info({ event: "RUN_START", config: maskSecrets(process.env as Record<string, string>) });

  const db = openDatabase(config.DB_PATH);
  const policy = new PolicyEngine(db, {
    contractAllowlist: [config.KUDOS_CONTRACT_ADDRESS.toLowerCase()],
    maxMintsPerDay: config.MAX_MINTS_PER_DAY,
    maxMintsPerRun: config.MAX_MINTS_PER_RUN,
    dryRun: config.DRY_RUN
  });

  const readLimiter = new RateLimiter(1000);
  const writeLimiter = new RateLimiter(2000);
  const txLimiter = new RateLimiter(10_000);

  const neynar = new NeynarClient(config.NEYNAR_API_KEY, config.NEYNAR_SIGNER_UUID, readLimiter, writeLimiter);
  const publicClient = buildPublicClient(config);
  const walletClient = buildWalletClient(config);

  const keywords = parseKeywords(config.FARCASTER_KEYWORDS);
  const channels = parseChannels(config.FARCASTER_CHANNELS);
  const casts = await fetchCasts(neynar, config.FARCASTER_SEARCH_MODE, keywords, channels);

  for (const cast of casts) {
    const castHash = cast.hash;
    if (!shouldProcessCast(db, castHash)) {
      continue;
    }
    logger.info({ event: "CAST_FOUND", cast_hash: castHash, fid: cast.fid });

    const address = resolveEvmAddress(cast);
    if (!address) {
      recordFailure(db, castHash, "No address found");
      continue;
    }

    const castUrl = sanitizeCastUrl(cast.url);
    const summary = summarizeCast(cast.text);
    const tokenUri = buildTokenUri({ cast, summary, castUrl });

    if (config.DRY_RUN) {
      logger.info({ event: "DRY_RUN", cast_hash: castHash, to: address });
      continue;
    }

    try {
      const mintResult = await mintKudosNFT({
        publicClient,
        walletClient,
        contractAddress: config.KUDOS_CONTRACT_ADDRESS as Address,
        to: address as Address,
        tokenURI: tokenUri,
        castHash,
        castUrl,
        policy,
        rateLimiter: txLimiter
      });

      logger.info({ event: "MINT_CONFIRMED", cast_hash: castHash, tx_hash: mintResult.txHash });
      recordSuccess(db, castHash, mintResult.txHash, mintResult.tokenId);

      const replyText = `Kudos minted on Base. tx: ${mintResult.txHash} contract: ${config.KUDOS_CONTRACT_ADDRESS} tokenId: ${mintResult.tokenId}`;
      await neynar.replyToCast({ parentHash: castHash, text: replyText, idem: `clawkudos-${castHash}` });
      logger.info({ event: "REPLY_SENT", cast_hash: castHash, tx_hash: mintResult.txHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      recordFailure(db, castHash, message);
      logger.error({ event: "MINT_FAILED", cast_hash: castHash, error: message });
    }
  }
}

runOnce()
  .then(() => {
    logger.info({ event: "RUN_COMPLETE" });
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : "unknown error";
    logger.error({ event: "RUN_ERROR", error: message });
  });
