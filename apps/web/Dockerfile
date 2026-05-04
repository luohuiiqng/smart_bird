# 构建阶段：生产构建时 API 经 Nginx 反代，浏览器与站点同源，使用相对路径 /api/v1
# IMAGE_* 必须出现在首个 FROM 之前，才可在多个 FROM 中使用（见 Docker 文档 ARG/FROM）
ARG IMAGE_NODE=node:22-alpine
ARG IMAGE_NGINX=nginx:1.27-alpine
FROM ${IMAGE_NODE} AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 构建阶段拉 npm 易超时；默认 npmmirror，境外可 build-arg NPM_REGISTRY=https://registry.npmjs.org
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000

COPY package.json package-lock.json* ./
RUN npm ci --fund=false --audit=false

COPY . .
RUN npm run build

# 静态资源 + 反代 API
FROM ${IMAGE_NGINX}

RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ > /dev/null || exit 1
