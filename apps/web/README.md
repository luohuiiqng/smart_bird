# 管理端前端（Vue 3）

基于 **Vue 3**、**TypeScript**、**Vite** 与 **Vue Router** 的学校考试管理后台。

## 本地开发

```sh
npm install
npm run dev
```

## 环境变量

- `VITE_API_BASE_URL`：后端 API 根路径，默认 `http://localhost:3000/api/v1`。**须与**仓库根目录 `.env` 里的 **`PORT`** 一致；可在 `apps/web/.env` 覆盖（修改后需重启 `npm run dev`）。

## 构建

```sh
npm run build
```

## 代码检查

```sh
npm run lint
```
