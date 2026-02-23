#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/abit_hex/wojak-ink-nightshift"
cd "$REPO_ROOT"

BRANCH_EXPECTED='^codex/nightly/'
MAX_HOURS="${MAX_HOURS:-8}"
PULL_INTERVAL_SECONDS="${PULL_INTERVAL_SECONDS:-600}"   # 10 minutes
HEARTBEAT_SECONDS="${HEARTBEAT_SECONDS:-1800}"          # 30 minutes

RUNNER_CMD=(node scripts/nightshift.mjs --real)

mkdir -p logs reports .nightshift/state

ts() { date +"%Y-%m-%dT%H:%M:%S%z"; }
stamp() { date +"%Y%m%d-%H%M%S"; }

SESSION_ID="supervisor-$(stamp)"
LOG_FILE="logs/${SESSION_ID}.log"
PROGRESS_FILE="reports/${SESSION_ID}.md"

START_EPOCH="$(date +%s)"
END_EPOCH="$((START_EPOCH + MAX_HOURS * 3600))"
LAST_HEARTBEAT=0

log() {
  printf '[%s] %s\n' "$(ts)" "$*" | tee -a "$LOG_FILE"
}

branch="$(git branch --show-current || true)"
if [[ ! "$branch" =~ $BRANCH_EXPECTED ]]; then
  echo "Refusing to run outside nightly branch. Current branch: ${branch}" | tee -a "$LOG_FILE"
  exit 1
fi

cat > "$PROGRESS_FILE" <<EOF
# Night Shift Supervisor — ${SESSION_ID}

- Started: $(ts)
- Repo: ${REPO_ROOT}
- Branch: ${branch}
- Max hours: ${MAX_HOURS}
- Pull interval: ${PULL_INTERVAL_SECONDS}s
- Heartbeat interval: ${HEARTBEAT_SECONDS}s

## Heartbeats
EOF

checkpoint_and_push() {
  # Stage everything except runtime artifacts and operator notes.
  git add -A . \
    ':(exclude)reports/**' \
    ':(exclude)logs/**' \
    ':(exclude).nightshift/state/**' \
    ':(exclude).nightshift/APPROVED_*' \
    ':(exclude).nightshift/CODEX-INSTRUCTIONS.md' \
    ':(exclude).nightshift/PERFORMANCE-UX-ROADMAP.md' || true

  if ! git diff --cached --quiet; then
    local msg="chore(nightshift): checkpoint $(date +"%Y-%m-%d %H:%M")"
    if git commit -m "$msg" >>"$LOG_FILE" 2>&1; then
      log "Committed checkpoint: $msg"
      git push >>"$LOG_FILE" 2>&1 || log "Push failed (non-fatal); will retry next cycle."
    else
      log "Checkpoint commit failed (non-fatal); leaving changes in worktree."
      git reset --mixed >>"$LOG_FILE" 2>&1 || true
    fi
  fi
}

heartbeat() {
  local now elapsed latest_report latest_report_path summary_line
  now="$(date +%s)"
  elapsed="$((now - START_EPOCH))"
  latest_report_path="$(ls -1t reports/nightshift-*.md 2>/dev/null | head -n 1 || true)"
  if [[ -n "$latest_report_path" ]]; then
    summary_line="$(rg -n "Tasks attempted|Succeeded|Failed|Skipped|Report-only mode activated" "$latest_report_path" 2>/dev/null | sed 's/^/- /' || true)"
  else
    summary_line="- No nightshift report yet"
  fi
  {
    echo
    echo "### $(ts)"
    echo "- Elapsed: ${elapsed}s"
    echo "- HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo "- Working tree: $(git status --short | wc -l | tr -d ' ') changes/untracked entries"
    if [[ -n "$latest_report_path" ]]; then
      echo "- Latest report: ${latest_report_path}"
      echo "$summary_line"
    fi
  } >> "$PROGRESS_FILE"
}

pull_updates() {
  # Rebase pull if clean enough. If pull fails, continue and retry next cycle.
  if git pull --rebase --autostash >>"$LOG_FILE" 2>&1; then
    log "Pulled latest changes."
  else
    log "git pull failed (non-fatal). Will continue current queue and retry later."
  fi
}

log "Supervisor session ${SESSION_ID} starting on ${branch}"
log "Runner command: ${RUNNER_CMD[*]}"
log "Ends at epoch ${END_EPOCH}"

while true; do
  now="$(date +%s)"
  if (( now >= END_EPOCH )); then
    log "Reached 8h window. Final checkpoint and exit."
    checkpoint_and_push
    heartbeat
    break
  fi

  pull_updates

  log "Starting nightshift runner cycle."
  if "${RUNNER_CMD[@]}" >>"$LOG_FILE" 2>&1; then
    log "Nightshift runner cycle completed successfully."
  else
    log "Nightshift runner cycle exited non-zero (non-fatal); restarting after interval."
  fi

  checkpoint_and_push

  now="$(date +%s)"
  if (( now - LAST_HEARTBEAT >= HEARTBEAT_SECONDS )); then
    heartbeat
    LAST_HEARTBEAT="$now"
    log "Heartbeat written to ${PROGRESS_FILE}"
  fi

  sleep_remaining="$PULL_INTERVAL_SECONDS"
  while (( sleep_remaining > 0 )); do
    now="$(date +%s)"
    if (( now >= END_EPOCH )); then
      break 2
    fi
    if (( sleep_remaining > 60 )); then
      sleep 60
      sleep_remaining=$((sleep_remaining - 60))
    else
      sleep "$sleep_remaining"
      sleep_remaining=0
    fi
  done
done

log "Supervisor session ${SESSION_ID} finished."
