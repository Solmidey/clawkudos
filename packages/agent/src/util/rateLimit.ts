export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimiter {
  private lastRun = 0;

  constructor(private minIntervalMs: number) {}

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRun;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    const result = await fn();
    this.lastRun = Date.now();
    return result;
  }
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: { retries: number; baseMs: number; maxMs: number }
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > options.retries) {
        throw error;
      }
      const jitter = Math.random() * options.baseMs;
      const delay = Math.min(options.baseMs * 2 ** (attempt - 1) + jitter, options.maxMs);
      await sleep(delay);
    }
  }
}
