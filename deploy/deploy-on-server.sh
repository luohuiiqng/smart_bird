#!/usr/bin/env bash
# 解压部署包后，在包根目录执行：chmod +x deploy.sh && ./deploy.sh
# 依赖：Docker（含 compose 插件）、仓库根目录存在 .env（首次会从 docker.env.example 生成模板并退出一次）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "未找到命令: $1" >&2
    exit 1
  }
}

need_cmd docker
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "需要 Docker Compose（docker compose 或 docker-compose）" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "未找到 $COMPOSE_FILE，请在部署包根目录下运行本脚本。" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ -f docker.env.example ]]; then
    cp docker.env.example .env
    echo "已从 docker.env.example 生成 .env。"
    echo "请用编辑器填写数据库口令、JWT、MinIO 等，保存后再次执行: ./deploy.sh"
    exit 1
  fi
  echo "缺少 .env 且没有 docker.env.example，无法继续。" >&2
  exit 1
fi

echo "开始构建并启动（首次或代码变更会较慢）..."
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d --build

echo
echo "当前状态:"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" ps

echo
echo "查看 API 日志: ${COMPOSE[*]} -f $COMPOSE_FILE logs -f api"
echo "若宿主机 Nginx 反代，请设 WEB_PORT=8080 等，并参考 deploy/host-nginx-example.conf"
