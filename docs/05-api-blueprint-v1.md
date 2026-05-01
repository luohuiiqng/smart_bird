# API蓝图（V1）

## 职责
- 定义V1阶段API模块边界与接口清单，指导后端与前端联调。

## 包含内容
- API分组与命名规范
- V1接口列表
- 统一返回与错误处理约定（简版）

## 不包含内容
- 每个接口字段级DTO
- 数据库实现细节
- 非V1接口规划

---

## 一、设计原则
- 资源化命名优先，动词仅用于明确动作型接口
- 所有业务接口默认鉴权，按学校维度隔离数据
- 分页接口统一参数：`page`, `pageSize`

## 二、接口分组

### 1) 认证与会话
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### 2) 基础档案（org）
- `GET /org/grades`
- `POST /org/grades`
- `GET /org/classes`
- `POST /org/classes`
- `GET /org/subjects`
- `POST /org/subjects`
- `GET /org/teachers`
- `POST /org/teachers`
- `GET /org/students`
- `POST /org/students`
- `POST /org/students/import`
- `GET /org/students/template`

### 3) 考试管理（exams）
- `GET /exams`
- `POST /exams`
- `GET /exams/:id`
- `PATCH /exams/:id`
- `POST /exams/:id/subjects`
- `POST /exams/:id/publish`
- `POST /exams/:id/unpublish`

### 4) 阅卷任务（marking）
- `GET /marking/tasks`
- `POST /marking/tasks/assign`
- `POST /marking/tasks/:id/start`
- `POST /marking/tasks/:id/submit-score`
- `GET /marking/exam-subjects/:id/progress`

### 5) 成绩与分析（scores/analysis）
- `GET /scores/exams/:id`
- `POST /scores/exams/:id/recalculate`
- `GET /analysis/exams/:id/summary`
- `GET /analysis/exams/:id/class-compare`

### 6) 文件（files）
- `POST /files/upload`
- `GET /files/:key/presigned-url`

## 三、统一响应约定（建议）
- 成功：`{ code: 0, message: "ok", data: ... }`
- 失败：`{ code: <非0>, message: "...", details?: ... }`

## 四、错误码建议（最小集）
- `AUTH_401`：未登录或令牌失效
- `AUTH_403`：无权限访问
- `BIZ_404`：资源不存在
- `BIZ_409`：状态冲突（例如重复发布）
- `SYS_500`：系统异常

## 五、版本管理建议
- 路由前缀建议：`/api/v1`
- 不兼容变更通过 `v2` 演进，避免破坏前端联调
