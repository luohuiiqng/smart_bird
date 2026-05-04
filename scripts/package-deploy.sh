#!/usr/bin/env bash
# 在开发机仓库根目录执行，生成可上传到服务器的部署包（不含 node_modules / dist，由服务器 Docker 构建）
# 用法: ./scripts/package-deploy.sh
# 输出: 当前目录下 smart_bird-deploy-YYYYmmdd-HHMMSS.tar.gz

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v rsync >/dev/null 2>&1; then
  echo "需要 rsync" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
RELEASE_NAME="smart_bird"
ARCHIVE_NAME="smart_bird-deploy-${TS}.tar.gz"
TMP="$(mktemp -d)"
STAGE="${TMP}/${RELEASE_NAME}"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$STAGE/apps/api" "$STAGE/apps/web" "$STAGE/deploy"

if [[ ! -f docker-compose.prod.yml ]] || [[ ! -f deploy/deploy-on-server.sh ]]; then
  echo "请在仓库根目录运行（缺少 docker-compose.prod.yml 或 deploy/deploy-on-server.sh）" >&2
  exit 1
fi

RSYNC_EXCLUDES=(
  --exclude 'node_modules'
  --exclude 'dist'
  --exclude '.git'
  --exclude '.env'
  --exclude '.cursor'
  --exclude '*.tar.gz'
  --exclude 'coverage'
)

rsync -a "${RSYNC_EXCLUDES[@]}" apps/api/ "$STAGE/apps/api/"
rsync -a "${RSYNC_EXCLUDES[@]}" apps/web/ "$STAGE/apps/web/"
rsync -a "${RSYNC_EXCLUDES[@]}" deploy/ "$STAGE/deploy/"

cp docker-compose.prod.yml docker.env.example "$STAGE/"

cp deploy/deploy-on-server.sh "$STAGE/deploy.sh"
chmod +x "$STAGE/deploy.sh"

(
  cd "$TMP"
  tar czvf "${ROOT}/${ARCHIVE_NAME}" "$RELEASE_NAME"
)

echo "已生成: ${ROOT}/${ARCHIVE_NAME}"
echo "上传到服务器后:"
echo "  tar xzf ${ARCHIVE_NAME} && cd ${RELEASE_NAME} && ./deploy.sh"
