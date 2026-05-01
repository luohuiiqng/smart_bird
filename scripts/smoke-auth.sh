#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
LOGIN_USERNAME="${LOGIN_USERNAME:-schooladmin}"
PASSWORD="${PASSWORD:-Schooladmin123}"

echo "[1/4] login -> $BASE_URL/auth/login"
LOGIN_JSON=$(curl -sS -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$LOGIN_USERNAME\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_JSON"
ACCESS_TOKEN=$(python3 - <<'PY' "$LOGIN_JSON"
import json,sys
obj=json.loads(sys.argv[1])
print(obj['data']['accessToken'])
PY
)
REFRESH_TOKEN=$(python3 - <<'PY' "$LOGIN_JSON"
import json,sys
obj=json.loads(sys.argv[1])
print(obj['data']['refreshToken'])
PY
)

echo "[2/4] me"
curl -sS "$BASE_URL/auth/me" -H "Authorization: Bearer $ACCESS_TOKEN"
echo

echo "[3/4] refresh"
curl -sS -X POST "$BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
echo

echo "[4/4] logout"
curl -sS -X POST "$BASE_URL/auth/logout" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{}"
echo

echo "Smoke auth flow done"
