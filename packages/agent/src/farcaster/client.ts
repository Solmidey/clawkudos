import { RateLimiter, withBackoff } from "../util/rateLimit.js";
import { sanitizeText, sanitizeUrl } from "../util/sanitize.js";

const NEYNAR_BASE_URL = "https://api.neynar.com";

export type FarcasterCast = {
  hash: string;
  url: string;
  text: string;
  fid: number;
  author: {
    fid: number;
    custody_address?: string | null;
    verified_addresses?: {
      eth_addresses?: string[];
    } | null;
  };
  timestamp: string;
};

export class NeynarClient {
  constructor(
    private apiKey: string,
    private signerUuid: string,
    private readLimiter: RateLimiter,
    private writeLimiter: RateLimiter
  ) {}

  private async request<T>(path: string, init: RequestInit, limiter: RateLimiter): Promise<T> {
    return limiter.schedule(() =>
      withBackoff(async () => {
        const response = await fetch(`${NEYNAR_BASE_URL}${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            "api_key": this.apiKey,
            ...(init.headers ?? {})
          }
        });
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Neynar error ${response.status}: ${body}`);
        }
        return (await response.json()) as T;
      },
      { retries: 3, baseMs: 1000, maxMs: 8000 })
    );
  }

  async searchCastsByKeywords(query: string): Promise<FarcasterCast[]> {
    const data = await this.request<{ casts: FarcasterCast[] }>(
      `/v2/farcaster/cast/search?q=${encodeURIComponent(query)}`,
      { method: "GET" },
      this.readLimiter
    );
    return data.casts ?? [];
  }

  async fetchChannelCasts(channel: string): Promise<FarcasterCast[]> {
    const data = await this.request<{ casts: FarcasterCast[] }>(
      `/v2/farcaster/channel/casts?channel_id=${encodeURIComponent(channel)}&limit=25`,
      { method: "GET" },
      this.readLimiter
    );
    return data.casts ?? [];
  }

  async replyToCast(options: { parentHash: string; text: string; idem: string }): Promise<void> {
    const payload = {
      signer_uuid: this.signerUuid,
      text: sanitizeText(options.text, 280),
      parent: options.parentHash,
      idem: options.idem
    };
    await this.request(
      "/v2/farcaster/cast",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      this.writeLimiter
    );
  }
}

export function resolveEvmAddress(cast: FarcasterCast): string | null {
  const verified = cast.author.verified_addresses?.eth_addresses?.[0];
  if (verified) {
    return sanitizeText(verified, 42);
  }
  const custody = cast.author.custody_address;
  if (custody) {
    return sanitizeText(custody, 42);
  }
  return null;
}

export function sanitizeCastUrl(url: string) {
  return sanitizeUrl(url, 1024);
}
