# 构建阶段（compose 可传入 IMAGE_NODE=… 以走国内镜像代理，见 docker-compose.prod.yml）
# ARG 须在首个 FROM 之前，两个 FROM 才能共用（见 Docker 文档 ARG/FROM）
ARG IMAGE_NODE=node:22-alpine
FROM ${IMAGE_NODE} AS builder

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --fund=false --audit=false

COPY . .

RUN npm run build

# 运行阶段
FROM ${IMAGE_NODE} AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache wget

ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --fund=false --audit=false \
  && npm install prisma@6.19.0 --no-save \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/v1/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
