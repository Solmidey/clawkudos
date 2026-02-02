#!/usr/bin/env bash
set -euo pipefail

JOB_NAME="clawkudos-10m"
SCHEDULE="*/10 * * * *"
TZ="UTC"
PAYLOAD="Run ClawKudos once now. Use the clawkudos skill."

cron_json=$(openclaw cron list --json 2>/dev/null || echo "[]")
job_id=$(node -e "const data=JSON.parse(process.argv[1]);const job=data.find(j=>j.name==='${JOB_NAME}');console.log(job?job.id:'');" "$cron_json")

if [[ -n "$job_id" ]]; then
  openclaw cron update \
    --id "$job_id" \
    --schedule "$SCHEDULE" \
    --tz "$TZ" \
    --session isolated \
    --payload "$PAYLOAD"
  echo "Updated cron job $JOB_NAME ($job_id)"
else
  openclaw cron add \
    --name "$JOB_NAME" \
    --schedule "$SCHEDULE" \
    --tz "$TZ" \
    --session isolated \
    --payload "$PAYLOAD"
  echo "Installed cron job $JOB_NAME"
fi

openclaw cron list
