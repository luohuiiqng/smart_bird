#!/usr/bin/env bash
# 在「能正常拉镜像」的开发机上，把 compose 所需的镜像打成单个包，上传到服务器后 docker load，再 compose up（无需再拉 Hub）。
#
# 用法（仓库根目录、已有含 POSTGRES_PASSWORD 等的 .env）：
#   chmod +x scripts/export-docker-bundle.sh
#   ./scripts/export-docker-bundle.sh
#   ./scripts/export-docker-bundle.sh /path/to/smart-bird-images.tar
#
# 服务器上：
#   docker load -i smart-bird-images.tar
#   cd smart_bird && docker compose -f docker-compose.prod.yml up -d
#   （不要加 --build，除非你要在服务器重新构建）
#
# 注意：
# - 本地与服务器 compose 的「项目目录名」最好一致，或两边设置相同的 COMPOSE_PROJECT_NAME。
# - 若笔记本是 Apple Silicon（M 系列），服务器是常见 x86 云主机，请在 build/pull 前指定平台，否则架构不符无法在云上运行：
#     export DOCKER_DEFAULT_PLATFORM=linux/amd64
#     ./scripts/export-docker-bundle.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
OUT="${1:-${ROOT}/smart-bird-docker-$(date +%Y%m%d-%H%M%S).tar}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "未找到 $COMPOSE_FILE，请在仓库根目录执行。" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "需要根目录 .env（至少含 POSTGRES_PASSWORD、MINIO_ROOT_PASSWORD 等，以便 compose 校验通过）。" >&2
  exit 1
fi

echo "==> pull 基础镜像（postgres / redis / minio）…"
docker compose -f "$COMPOSE_FILE" pull

echo "==> build api / web…"
docker compose -f "$COMPOSE_FILE" build

# macOS 自带 Bash 3.2 无 mapfile，用 while read（需 Bash 以支持 < <(...)）
IMAGES=()
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "${line// }" ]] && continue
  IMAGES+=("$line")
done < <(docker compose -f "$COMPOSE_FILE" config --images | sort -u)

if [[ ${#IMAGES[@]} -eq 0 ]]; then
  echo "未解析到镜像列表（docker compose config --images 为空）。" >&2
  exit 1
fi

echo "==> 将写入 $OUT"
echo "    镜像列表:"
printf '    %s\n' "${IMAGES[@]}"

docker save "${IMAGES[@]}" -o "$OUT"

BYTES=$(wc -c <"$OUT" | tr -d ' ')
echo "==> 完成: $OUT ($(numfmt --to=iec-i --suffix=B "$BYTES" 2>/dev/null || echo "$BYTES bytes"))"
echo
echo "上传到服务器后执行:"
echo "  docker load -i $(basename "$OUT")"
echo "  cd $(basename "$ROOT")   # 进入部署目录"
echo "  docker compose -f $COMPOSE_FILE up -d"
