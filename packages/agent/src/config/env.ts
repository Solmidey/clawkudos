import { z } from "zod";

const envSchema = z.object({
  BASE_RPC_URL: z.string().url(),
  BASE_CHAIN_ID: z.coerce.number().int(),
  BASE_PRIVATE_KEY: z.string().min(1),
  KUDOS_CONTRACT_ADDRESS: z.string().min(1),
  NEYNAR_API_KEY: z.string().min(1),
  NEYNAR_SIGNER_UUID: z.string().min(1),
  FARCASTER_SEARCH_MODE: z.enum(["keywords", "channel"]).default("keywords"),
  FARCASTER_KEYWORDS: z.string().default("buildonbase,shipped,deployed,base mainnet"),
  FARCASTER_CHANNELS: z.string().default("base,build"),
  RUN_INTERVAL_MINUTES: z.coerce.number().int().default(10),
  MAX_MINTS_PER_DAY: z.coerce.number().int().default(20),
  MAX_MINTS_PER_RUN: z.coerce.number().int().default(5),
  DRY_RUN: z.coerce.boolean().default(false),
  LOG_LEVEL: z.string().default("info"),
  DB_PATH: z.string().default("clawkudos.sqlite")
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${missing.join(", ")}`);
  }
  return parsed.data;
}
