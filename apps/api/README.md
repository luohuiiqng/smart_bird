# 智能阅卷系统 (Smart Grading System)

> 🎓 基于 AI 的智能阅卷与教学分析平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-blue?logo=prisma)](https://prisma.io)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)

## 📖 项目简介

智能阅卷系统是一个现代化的教育技术平台，旨在通过人工智能技术自动化考试阅卷流程，并提供深度的学习分析。系统支持从题库管理、在线考试、自动评分到成绩分析的全流程数字化管理。

### ✨ 核心特性

- 🤖 **AI 自动阅卷**：客观题秒级评分，主观题基于 LLM 智能评分
- 📊 **智能分析**：多维度成绩统计、错题分析、知识点掌握度
- 👨‍🏫 **全流程管理**：题库 → 组卷 → 考试 → 批改 → 分析 → 导出
- 🔐 **权限精细控制**：RBAC 模型，支持管理员、教师、学生多角色
- 📱 **响应式设计**：支持 PC、平板、手机多端访问
- ⚡ **高性能架构**：Redis 缓存、队列异步处理、数据库优化
- 🐳 **一键部署**：Docker + Docker Compose 快速部署
- 🌍 **多语言支持**：内置 i18n，支持中英文等

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    技术栈架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend              Backend              Infrastructure │
│  ─────────             ────────              ───────────── │
│  Next.js 14 ═══════>   NestJS 10 ═══════>   PostgreSQL   │
│  React Server          TypeScript            Redis/MinIO    │
│  Components            Prisma ORM            Docker         │
│  Tailwind CSS          BullMQ Queue          AI API         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

详细架构设计请查看：📄 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🚀 快速开始

### 前置要求

- Node.js >= 20.x
- PostgreSQL >= 16
- Redis >= 7
- Docker & Docker Compose (可选，推荐)

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd smart_bird
```

### 2. 环境配置

```bash
# 进入 API 目录
cd apps/api

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接等信息
vim .env
```

### 3. 数据库准备

```bash
# 方式A：使用 Docker Compose（推荐）
cd ../..  # 项目根目录
chmod +x scripts/docker-manage.sh
./scripts/docker-manage.sh up all

# 方式B：手动启动 PostgreSQL
# 确保 PostgreSQL 已运行，然后：
cd apps/api
npx prisma db pull          # 同步数据库结构
npx prisma generate         # 生成 Prisma Client
npx prisma db seed          # 导入种子数据（可选）
```

### 4. 安装依赖

```bash
cd apps/api
npm install
```

### 5. 启动开发服务器

```bash
# 启动后端 API
npm run start:dev
# API 运行在: http://localhost:3001/api/v1

# 在新终端启动前端
cd apps/web
npm install
npm run dev
# 前端运行在: http://localhost:3000
```

### 6. 访问系统

- 🌐 **前端界面**: http://localhost:3000
- 🔌 **API 文档**: http://localhost:3001/api/v1/docs
- 🗄️ **Prisma Studio**: http://localhost:5555 (运行 `npx prisma studio`)

---

## 🔧 开发命令

### 后端 API (apps/api)

```bash
# 开发模式（热重载）
npm run start:dev

# 生产构建
npm run build

# 运行测试
npm run test

# E2E 测试
npm run test:e2e

# 查看测试覆盖率
npm run test:cov

# 代码格式化
npm run format

# Lint 检查
npm run lint

# Prisma 命令
npx prisma studio       # 打开数据库管理界面
npx prisma migrate dev  # 创建并执行迁移
npx prisma db push      # 推送 schema 到数据库（开发用）
npx prisma generate     # 重新生成 client
```

### Docker 命令

```bash
# 启动所有服务
./scripts/docker-manage.sh up all

# 只启动数据库
./scripts/docker-manage.sh up db

# 查看日志
./scripts/docker-manage.sh logs api

# 数据库备份
./scripts/docker-manage.sh db-backup

# 停止所有服务
./scripts/docker-manage.sh down all

# 清理所有数据（危险！）
./scripts/docker-manage.sh clean
```

---

## 📂 项目结构

```
smart_bird/
├── apps/
│   ├── api/              # 后端 (NestJS)
│   │   ├── src/
│   │   │   ├── modules/      # 业务模块
│   │   │   ├── common/       # 通用工具
│   │   │   ├── config/       # 配置文件
│   │   │   └── database/     # 数据库层
│   │   ├── prisma/
│   │   │   ├── schema.prisma # 数据库模型
│   │   │   └── migrations/   # 迁移文件
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/              # 前端 (Next.js)
│       └── (开发中)
│
├── scripts/               # 部署和运维脚本
│   ├── docker-manage.sh
│   ├── init-db.sql
│   └── backup.sh
│
├── docker/                # Docker 配置
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── docs/                  # 项目文档
│   ├── ARCHITECTURE.md       # 架构设计文档
│   ├── API_SPEC.md           # API 接口规范
│   ├── PROJECT_STRUCTURE.md  # 目录结构说明
│   └── DATABASE.md           # 数据库设计文档
│
├── .env.example           # 环境变量模板
└── README.md
```

详细目录结构: 📄 [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)

---

## 🔐 API 快速参考

### 认证
```
POST   /api/v1/auth/login               # 登录
POST   /api/v1/auth/refresh             # 刷新Token
POST   /api/v1/auth/logout              # 退出登录
GET    /api/v1/auth/me                  # 获取当前用户
```

### 题库
```
GET    /api/v1/questions                # 获取题目列表
POST   /api/v1/questions                # 创建题目
GET    /api/v1/questions/:id            # 题目详情
PUT    /api/v1/questions/:id            # 更新题目
DELETE /api/v1/questions/:id            # 删除题目
POST   /api/v1/questions/import         # 批量导入
```

### 试卷
```
GET    /api/v1/papers                   # 试卷列表
POST   /api/v1/papers                   # 创建试卷
GET    /api/v1/papers/:id/preview       # 预览试卷
```

### 考试
```
GET    /api/v1/exams                    # 考试列表
POST   /api/v1/exams                    # 创建考试
POST   /api/v1/exams/:id/start          # 开始考试
POST   /api/v1/exam-sessions/:id/submit # 提交答案
```

### 批改
```
POST   /api/v1/grading/auto/:sessionId  # 自动批改
POST   /api/v1/grading/manual           # 人工评分
POST   /api/v1/ai/grade                 # AI评分
```

### 分析
```
GET    /api/v1/analytics/exams/:id/statistics  # 考试统计
GET    /api/v1/analytics/students/:id/report   # 学生报告
GET    /api/v1/analytics/wrong-questions       # 错题分析
```

完整 API 文档: 📄 [docs/API_SPEC.md](./docs/API_SPEC.md)

---

## 🏃 典型工作流

### 教师创建并发布一场考试

1. **第一步：录入题目**
   ```bash
   POST /api/v1/questions  # 创建题目（或批量导入）
   ```

2. **第二步：创建试卷**
   ```bash
   POST /api/v1/papers
   # 选择题目、设置分值、调整顺序
   ```

3. **第三步：发布考试**
   ```bash
   POST /api/v1/exams
   # 选择试卷、设置班级、时间、规则
   ```

4. **第四步：监控考试**
   ```bash
   GET /api/v1/exams/:id/monitor
   # 实时查看学生答题进度
   ```

5. **第五步：批改与分析**
   ```bash
   POST /api/v1/grading/auto/:sessionId  # AI自动批改
   GET  /api/v1/analytics/exams/:id/stats # 查看统计报表
   ```

---

## 🤖 AI 评分能力

智能阅卷系统的核心 AI 能力：

### 支持的题型
| 题型 | 评分方式 | 说明 |
|------|---------|------|
| **单选题** | 自动 | 精确匹配 |
| **多选题** | 自动 | 支持部分得分 |
| **填空题** | 自动 | 支持同义词、近义词 |
| **判断题** | 自动 | 布尔值比对 |
| **简答题** | AI + 人工 | AI预评分，人工复核 |
| **论述题** | AI + 人工 | 深度语义理解 |
| **阅读理解** | AI + 人工 | 综合分析 |
| **上传题** | 人工 | 图片/文件类题目 |

### AI 评分流程

```
学生答案 → 预处理 → 提示词工程 → LLM调用 → 结果解析 → 分数归一化 → 置信度检查 → 可选人工复核
```

### 支持的 AI 模型

- **云端模型**：阿里云通义千问 (Qwen-Plus/Turbo)
- **本地模型**：Ollama 部署的 Qwen-7B/14B
- **自定义**：支持任何 OpenAI 兼容 API

配置 AI 服务：编辑 `.env` 文件中的 `AI_DASHSCOPE_API_KEY`

---

## 🧪 测试策略

```bash
# 单元测试
npm run test

# E2E 测试（完整业务流程）
npm run test:e2e

# 覆盖率报告
npm run test:cov
  # 打开 coverage/lcov-report/index.html 查看

# 并发测试
npm run test:watch
```

测试覆盖范围：
- ✅ 认证流程 (登录、注册、Token)
- ✅ 题库 CRUD 操作
- ✅ 试卷组卷逻辑
- ✅ 考试流程（开始、答题、提交）
- ✅ AI 评分准确性
- ✅ 数据分析报表
- ✅ WebSocket 实时通信

---

## 📦 依赖项说明

### 核心框架
- **[NestJS](https://nestjs.com/)**: 模块化 Node.js 框架
- **[Prisma](https://prisma.io/)**: 下一代 ORM，类型安全
- **[Passport](http://www.passportjs.org/)**: 认证中间件
- **[BullMQ](https://docs.bullmq.io/)**: 高性能任务队列

### AI 与数据处理
- **[OpenAI SDK](https://github.com/openai/openai-node)**: 兼容 OpenAI API
- **[DashScope SDK](https://help.aliyun.com/document_detail/210968.html)**: 阿里云通义千问
- **[Ollama](https://ollama.ai/)**: 本地大模型服务
- **[Sharp](https://sharp.pixelplumbing.com/)**: 图片处理
- **[pdf-parse](https://github.com/felixge/node-pdf-parse)**: PDF 解析
- **[xlsx](https://github.com/SheetJS/sheetjs)**: Excel 读写

### 前端技术栈（规划）
- **[Next.js](https://nextjs.org/)**: React 全栈框架
- **[Tailwind CSS](https://tailwindcss.com/)**: 实用优先的 CSS 框架
- **[shadcn/ui](https://ui.shadcn.com/)**: 可复用组件库
- **[Zustand](https://zustand-demo.pmnd.rs/)**: 状态管理

---

## 🔐 安全措施

### 已实现
- 🔑 **JWT 认证** + **Refresh Token** 机制
- 🛡️ **RBAC 权限控制** (SUPER_ADMIN, ADMIN, TEACHER, STUDENT)
- 🚦 **API 限流** (Rate Limiting)
- 🛑 **防作弊机制** (切屏检测、复制粘贴限制)
- 🧹 **输入验证** (class-validator)
- 📝 **操作审计日志** (Audit Log)

### 生产环境需要
- [ ] HTTPS 强制
- [ ] CSRF 防护
- [ ] SQL 注入防护 (Prisma 已提供)
- [ ] XSS 防护 (Helmet + CSP)
- [ ] 敏感数据加密存储
- [ ] 定期安全审计

---

## 📈 性能优化

### 数据库
- ✅ **索引优化**: 常用查询字段均已创建索引
- ✅ **查询优化**: 避免 N+1，使用 `include` 预加载
- ✅ **连接池**: PgBouncer 支持

### 缓存
- ✅ **Redis 缓存**: 热点数据缓存
- ✅ **HTTP 缓存**: ETag + Cache-Control

### 异步处理
- ✅ **BullMQ 队列**: AI评分、报表生成异步化
- ✅ **WebSocket**: 实时通信替代轮询

### 前端
- ✅ **代码分割**: 路由级懒加载
- ✅ **图片优化**: WebP + lazy loading
- ✅ **PWA**: Service Worker 支持离线

---

## 🚀 部署指南

### 使用 Docker Compose（推荐）

```bash
# 1. 克隆项目并准备配置
cd smart_bird

# 2. 修改环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 .env，修改 JWT_SECRET 等敏感配置

# 3. 一键启动所有服务
./scripts/docker-manage.sh up all

# 4. 等待所有服务启动 (约1分钟)
./scripts/docker-manage.sh status

# 5. 访问系统
# API: http://localhost:3001/api/v1
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)
```

### 手动部署（生产）

参考文档：待补充

---

## 📊 监控与告警

- **Prometheus**: 指标收集 (http://localhost:9090)
- **Grafana**: 仪表板 (http://localhost:3000)
- **日志**: 结构化日志 + JSON 格式
- **健康检查**: `GET /api/v1/system/health`
- **指标端点**: `GET /api/v1/system/metrics`

---

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. **Fork 项目**
2. **创建功能分支**: `git checkout -b feature/new-feature`
3. **提交代码**: `git commit -m 'feat: add new feature'`
4. **推送分支**: `git push origin feature/new-feature`
5. **创建 PR**: 在 GitHub 创建 Pull Request

### Commit 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

示例：`feat(questions): 添加批量导入题目功能`

---

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 系统架构设计、技术选型、模块说明 |
| [API_SPEC.md](./docs/API_SPEC.md) | 完整的 API 接口文档和示例 |
| [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) | 项目目录结构和代码规范 |
| [DATABASE.md](./docs/DATABASE.md) | 数据库设计、索引策略、迁移 |

---

## 🧑‍💻 开发团队

本项目由 **Hermes Agent** (Nous Research) 担任**架构师**角色，提供完整的系统设计方案。

如果你需要多个 AI 助手协作开发，可以启动多个 Hermes Agent 实例，分别扮演：
- 🎯 **产品经理**: 需求整理、PRD、用户故事
- 🏗️ **架构师**: 技术选型、数据库设计、API 规范
- 💻 **全栈工程师**: 前后端开发、代码实现
- 🧪 **测试工程师**: 测试用例、自动化测试
- 🎨 **UI设计师**: 界面设计、用户体验

---

## 📄 许可证

本项目采用 **MIT License** 开源协议。详见 [LICENSE](./LICENSE) 文件。

---

## ❓ 常见问题

### Q: 如何添加新的题目类型？

A: 修改 `prisma/schema.prisma` 中的 `QuestionType` 枚举，然后运行 `npx prisma db push`。

### Q: 如何接入自己的 AI 模型？

A: 在 `.env` 中配置 `AI_OLLAMA_BASE_URL` 或 `AI_DASHSCOPE_API_KEY`，系统会自动检测并使用。

### Q: 如何导出成绩报表？

A: 调用 `GET /api/v1/reports/exams/{examId}/excel` 接口，会返回 Excel 文件。

### Q: 支持哪些数据库？

A: 官方支持 PostgreSQL 15+。如需 MySQL，需修改 Prisma schema 并调整部分 SQL 语法。

---

## 📞 联系方式

- 📧 Email: hermes@nousresearch.com
- 🐙 GitHub: [NousResearch/Hermes](https://github.com/NousResearch/Hermes)
- 📖 文档: [Hermes Agent 文档](https://hermes-agent.nousresearch.com/docs)

---

## 🙏 致谢

感谢以下开源项目的支持：

- [NestJS](https://nestjs.com/) - 后端框架
- [Prisma](https://prisma.io/) - ORM
- [Next.js](https://nextjs.org/) - 前端框架
- [Qwen](https://github.com/QwenLM/Qwen) - 通义千问大模型
- [BullMQ](https://docs.bullmq.io/) - 任务队列
- [MinIO](https://min.io/) - 对象存储

---

**Happy Coding! 🎉**
