import pino from "pino";

const SENSITIVE_KEYS = ["BASE_PRIVATE_KEY", "NEYNAR_API_KEY", "NEYNAR_SIGNER_UUID"] as const;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["config.basePrivateKey", "config.neynarApiKey", "config.neynarSignerUuid"],
    censor: "[REDACTED]"
  }
});

export function maskSecrets(input: Record<string, string | undefined>) {
  const masked: Record<string, string | undefined> = { ...input };
  for (const key of SENSITIVE_KEYS) {
    if (masked[key]) {
      masked[key] = "[REDACTED]";
    }
  }
  return masked;
}
