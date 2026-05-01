# CI/CD 规范（GitHub）

## 职责
- 定义本仓库持续集成与持续交付的流程、阶段闸门与环境约定。
- 约定代码托管与流水线载体：**GitHub + GitHub Actions**。

## 包含内容
- 分支与触发策略
- CI 阶段（lint / test / build / 镜像）
- CD 阶段与环境分层
- Secrets 与密钥管理原则

## 不包含内容
- 具体服务器运维手册（防火墙、内核参数等）
- 业务模块接口契约（见 `06`～`11`）

---

## 一、代码托管

- **本仓库地址**：<https://github.com/luohuiiqng/smart_bird>
- 维护者账号：<https://github.com/luohuiiqng/>
- 流水线实现首选 **GitHub Actions**（官方文档：<https://docs.github.com/en/actions>）。

---

## 二、环境与分层

| 环境 | 用途 | 部署触发 |
|------|------|----------|
| `development` | 开发者本地 / 可选远程开发机 | 手动 |
| `staging` | 联调与预发布验证 | 合并 `main` 或手动 workflow |
| `production` | 生产 | 仅标签或审批后的手动部署 |

所有环境差异仅允许来自 **配置与环境变量**，代码二进制保持一致（见 `00-development-standards.md`）。

---

## 三、分支策略（建议）

- `main`：可发布分支，受保护；合并需 PR + CI 通过。
- `develop`（可选）：集成分支，频繁合并特性分支。
- `feat/*`、`fix/*`：短期分支，完成后 PR 合并。

---

## 四、CI 流水线阶段（合并请求 / Push）

必选阶段（随代码落地逐项启用）：

1. **依赖安装**：锁定 lockfile（`pnpm-lock.yaml` / `package-lock.json` 等），禁止无锁随意升级破坏构建。
2. **静态检查**：ESLint / Prettier（前端）、ESLint（后端 Nest）。
3. **单元测试**：核心领域与关键 API。
4. **构建**：Nest `build`、前端生产构建。
5. **（可选）镜像构建**：`Dockerfile` 构建并通过镜像扫描（依赖选型后再启用）。

失败即阻断合并（除非文档约定豁免项）。

---

## 五、CD 流水线阶段（发布）

1. **制品**：Docker 镜像（推荐）或静态资源上传对象存储。
2. **标签**：生产发布建议使用语义化版本标签（如 `v1.0.0`）。
3. **数据库迁移**：单独 Job 或运维步骤；必须有回滚预案；禁止在未备份生产库的情况下自动执行破坏性迁移。
4. **审批**：生产部署建议 **Environment protection rules** 或人工确认后再执行。

---

## 六、Secrets 管理

- 使用 GitHub **Repository secrets / Environment secrets**，禁止将密钥写入仓库与流水线 YAML 明文。
- 区分：`staging` 与 `production` 使用不同密钥与数据库连接。
- 流水线仅需最小权限（部署密钥、镜像推送凭证只授予 CI 角色）。

---

## 七、与本项目其它文档的关系

- 质量底线：`00-development-standards.md`
- 交付节奏：`12-delivery-plan-mvp.md`
- 架构组件：`03-system-architecture.md`

---

## 八、验收标准（CI/CD 就绪）

- [ ] PR 触发的 CI 可在 15 分钟内完成常规变更。
- [ ] `main` 合并自动产出可部署制品（镜像或构建产物）。
- [ ] 生产发布有可追溯的版本标签与流水线日志。
- [ ] 无明文凭据入库或出现在日志中。

---

## 九、本仓库 GitHub Actions 落地说明

- **工作流路径**：`.github/workflows/ci.yml`
- **触发条件**：推送到 `main` / `develop`、任意分支的 `pull_request`、以及手动 **Run workflow**（`workflow_dispatch`）。
- **当前行为（仅有文档阶段）**：
  - 校验关键文档存在：`docs/README.md`、`docs/00-development-standards.md`、`docs/13-ci-cd-spec.md`
- **引入 Node 工程后（根目录或 `apps/api`、`apps/web`）**：
  - 存在对应 `package-lock.json` 时执行 `npm ci`，并依次尝试（均以脚本存在为准）：`npm run lint`、`npm run build`、`npm run test`
- **与规范的衔接**：依赖必须以 lockfile 锁定后再进入 CI（与本节「四」一致）；请勿在未提交 lockfile 的情况下依赖 CI 自动 `npm install`。
