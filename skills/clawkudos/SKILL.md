---
name: clawkudos
version: "1.0"
description: "Run the ClawKudos agent once for cron execution."
metadata: "{\"requires\":[\"node\",\"pnpm\"]}"
---

## Purpose
Run the ClawKudos agent once using the workspace install.

## Steps
1. Ensure dependencies are installed from the repo root: `pnpm install`.
2. Run the agent once: `pnpm -C {baseDir}/../../packages/agent start`.

## Notes
- This skill is intended for OpenClaw cron jobs and should be invoked in an isolated session.
