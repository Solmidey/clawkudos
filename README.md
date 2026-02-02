# ClawKudos

ClawKudos is a production-grade, security-hardened OpenClaw agent that autonomously rewards “builder shipped” Farcaster casts with on-chain Kudos NFTs on Base. It is designed to run without human intervention once configured, and it documents how to verify every on-chain mint against the Farcaster proof of work.

## Why this exists
This repository satisfies the Base Builder Quest requirements by demonstrating a fully autonomous agent that:
- Runs on a cron schedule with OpenClaw.
- Detects qualifying Farcaster activity.
- Mints a Kudos NFT on Base mainnet (chainId 8453).
- Replies to the cast with on-chain proof.

## Quickstart (5–10 commands)
```bash
pnpm install
pnpm -r build
cp .env.example .env
# edit .env with your keys and contract address
pnpm -C contracts build
node scripts/deploy-contract.ts
pnpm -C packages/agent build
pnpm -C packages/agent start
./scripts/install-cron.sh
openclaw cron list
```

## Architecture overview
- **contracts/**: Solidity ERC-721 contract `KudosNFT` (onlyOwner mint).
- **packages/agent/**: TypeScript runtime agent using viem, Neynar, SQLite, zod, pino.
- **skills/clawkudos**: OpenClaw skill that runs the agent once.
- **scripts/**: cron installer and contract deploy helper.

## Requirements
- Node.js 22+
- pnpm
- OpenClaw CLI installed and authenticated
- Base RPC access (default: https://mainnet.base.org)
- Neynar API key and signer UUID

## Environment
See `.env.example` for the full list. The hot wallet private key is required and should be funded for gas.

### Important env defaults
- Base mainnet chainId: 8453
- Base RPC: https://mainnet.base.org

### Local dev (Base Sepolia)
Set:
```
BASE_CHAIN_ID=84532
BASE_RPC_URL=https://sepolia.base.org
```
Deploy a new contract on Sepolia and set `KUDOS_CONTRACT_ADDRESS` accordingly.

## Deploy the contract
```bash
pnpm -C contracts build
node scripts/deploy-contract.ts
```
The deploy script prints the contract address to use in `.env`.

## Run the agent once (cron-compatible)
```bash
pnpm -C packages/agent build
pnpm -C packages/agent start
```

## Install OpenClaw Cron Job
```bash
./scripts/install-cron.sh
openclaw cron list
openclaw cron runs --id <job-id>
```

## Farcaster setup (Neynar)
1. Create a Neynar account and API key.
2. Create a signer and approve it in Warpcast.
3. Set `NEYNAR_API_KEY` and `NEYNAR_SIGNER_UUID` in `.env`.

References:
- Neynar Getting Started: https://docs.neynar.com/docs/getting-started-with-neynar
- Neynar Publish Cast API: https://docs.neynar.com/reference/publish-cast

## Behavior (Every 10 minutes)
1. Fetch recent Farcaster casts that match keyword or channel signals.
2. Resolve builder address (verified address preferred, fallback to custody).
3. Mint a Kudos NFT on Base with tokenURI containing cast URL, timestamp, summary.
4. Reply to the cast with the tx hash and contract address.
5. Dedupe so each cast is processed once.

## Guardrails (The Commandments)
- **Middleware-only access**: All Farcaster and on-chain interactions are centralized in client modules.
- **Strict authorization**: Only cron schedule triggers are supported. No DM/mentions trigger spends.
- **Server-side signing**: All signing is performed by the agent runtime.
- **Secrets**: Env validation with zod; log redaction; no secrets committed.
- **Sanitization**: All Farcaster inputs are sanitized and length-limited before persistence.
- **Rate limiting**: Farcaster read/write and Base tx limits are enforced.
- **Safe logging**: Only hashes, ids, and high-level actions are logged.
- **Dependency hygiene**: Versions pinned; `pnpm audit` script included; see policy below.
- **Error handling**: Bounded retries with backoff; failures recorded and cooldown enforced.
- **Least privilege**: Hard mint caps and allowlisted contract address only; gas simulation before send.

## Security (SECURITY.md excerpt)
- Bind the OpenClaw gateway to loopback.
- Run `openclaw security audit --deep` before going live.
- Rotate tokens and keys if compromise is suspected.
- Use DRY_RUN to validate logic before enabling mints.

## Dependency policy (known-safe)
- All runtime dependencies are pinned to exact versions.
- New dependencies require a justification and must pass `pnpm audit`.

## Judging Proof (Verification steps)
1. Find the ClawKudos Farcaster profile.
2. Open a reply from the bot and copy the tx hash.
3. Visit Base explorer: https://base.blockscout.com and search for the tx hash.
4. Click the contract address and verify the tokenId minted.
5. Confirm the tokenURI contains the cast URL and timestamp.

## Troubleshooting
- **RPC rate limits**: Use a dedicated RPC provider or reduce activity.
- **Neynar 401/429**: Verify API key and signer UUID; check rate limits.
- **Insufficient funds**: Fund the hot wallet for gas.
- **Nonce issues**: Wait for pending txs to confirm, or reset nonce.

## Production checklist
- [ ] Deploy contract on Base mainnet.
- [ ] Fund hot wallet.
- [ ] Set `.env` values.
- [ ] Run once with `DRY_RUN=true` to verify.
- [ ] Enable `DRY_RUN=false`.
- [ ] Install cron job.
- [ ] Verify first tx and Farcaster reply.

## “No human in the loop” explanation
After initial config and `install-cron.sh`, the agent runs every 10 minutes on its own schedule with no manual triggers or approvals.

## References
- Quest tweet context: https://x.com/base
- OpenClaw Skills format: https://docs.openclaw.ai/tools/skills
- OpenClaw Security hardening: https://docs.openclaw.ai/gateway/security
- OpenClaw Cron Jobs: https://docs.openclaw.ai/automation/cron-jobs
- OpenClaw Getting Started: https://docs.openclaw.ai/start/getting-started
- Base “Connecting to Base”: https://docs.base.org/base-chain/quickstart/connecting-to-base
- Base “Launch AI Agents on Base”: https://docs.base.org/cookbook/launch-ai-agents
