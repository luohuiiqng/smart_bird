#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${MODE:-quick}" # quick | full
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"

log() {
  echo "[pre-release] $1"
}

run_step() {
  local title="$1"
  shift
  log "START: ${title}"
  "$@"
  log "DONE:  ${title}"
}

run_api_checks() {
  local api_dir="${ROOT_DIR}/apps/api"
  run_step "api lint" bash -lc "cd \"$api_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run lint"
  run_step "api build" bash -lc "cd \"$api_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run build"
  if [[ "$MODE" == "full" ]]; then
    run_step "api full e2e" bash -lc "cd \"$api_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run test:e2e"
  else
    run_step "api files-audit e2e" bash -lc "cd \"$api_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run test:e2e -- files-audit.e2e-spec.ts"
  fi
}

run_web_checks() {
  local web_dir="${ROOT_DIR}/apps/web"
  run_step "web lint" bash -lc "cd \"$web_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run lint"
  run_step "web build" bash -lc "cd \"$web_dir\" && NPM_CONFIG_CACHE=/tmp/hongmen-npm-cache npm run build"
}

run_role_smoke() {
  run_step "role smoke flow" bash -lc "cd \"$ROOT_DIR\" && BASE_URL=\"$API_BASE_URL\" bash scripts/smoke-role-flow.sh"
}

log "mode=${MODE}"
log "api_base_url=${API_BASE_URL}"
run_api_checks
run_web_checks
run_role_smoke
log "ALL CHECKS PASSED"
