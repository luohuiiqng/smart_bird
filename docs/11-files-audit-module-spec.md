# 文件与审计模块规格（files / audit）

## 职责
- 定义文件模块与审计模块的接口契约和业务规则，覆盖上传下载、对象访问控制与关键操作留痕。

## 包含内容
- 文件上传下载接口
- MinIO对象访问策略（签名URL）
- 审计日志查询与记录规则

## 不包含内容
- 具体业务模块（考试、阅卷、成绩）流程
- 统计报表与分析口径
- MinIO部署细节与运维脚本

---

## 一、模块范围
- 文件上传（答题卡模板、导入文件、导出文件、扫描图）
- 文件元数据管理（归属、类型、大小、上传者）
- 文件访问控制（短期签名URL）
- 审计日志写入与查询

---

## 二、统一约定

### 1) 路由前缀
- 文件：`/api/v1/files`
- 审计：`/api/v1/audit`

### 2) 鉴权与隔离
- 文件与日志均受学校隔离
- 任一对象访问前必须校验 `schoolId` 一致性

### 3) 文件分类（建议）
- `ANSWER_SHEET_TEMPLATE`
- `IMPORT_FILE`
- `EXPORT_FILE`
- `SCAN_IMAGE`
- `OTHER`

---

## 三、文件模块接口（files）

### 1) `POST /api/v1/files/upload`
- 说明：上传文件到对象存储并登记元数据
- 请求类型：`multipart/form-data`
- 表单字段：
  - `file`（必填）
  - `category`（必填）
  - `bizType`（可选，如 `exam`, `student-import`）
  - `bizId`（可选）

#### 成功响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "fileId": 91001,
    "objectKey": "school-2001/exam/10001/scan/abc123.png",
    "fileName": "paper-01.png",
    "size": 238812,
    "contentType": "image/png"
  }
}
```

#### 规则
- 限制扩展名与MIME白名单
- 限制单文件大小（如 20MB，可配置）
- 上传成功后必须落库元数据（避免孤儿对象）

### 2) `GET /api/v1/files/:fileId`
- 说明：查询文件元数据（不直接返回公网URL）

### 3) `GET /api/v1/files/:fileId/presigned-url`
- 说明：获取短期签名下载地址
- 查询参数：
  - `expiresIn`（秒，默认300，最大900）

#### 返回示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "url": "https://minio.example.com/...signature...",
    "expiresIn": 300
  }
}
```

### 4) `DELETE /api/v1/files/:fileId`
- 说明：删除文件（默认软删除 + 对象延迟清理）

#### 规则
- 若文件被关键业务引用（如已发布成绩附件），不允许直接删除
- 删除动作必须写审计日志

---

## 四、审计模块接口（audit）

### 1) `GET /api/v1/audit/logs`
- 说明：查询操作日志
- 查询参数：
  - `module`（auth/org/exam/marking/scores/files）
  - `action`（create/update/delete/publish/login...）
  - `operatorId`
  - `targetType`, `targetId`
  - `startTime`, `endTime`
  - `page`, `pageSize`

### 2) `GET /api/v1/audit/logs/:id`
- 说明：查看日志详情（含变更前后摘要，如有）

---

## 五、审计日志写入规范
- 建议日志结构字段：
  - `id`
  - `schoolId`
  - `operatorId`
  - `module`
  - `action`
  - `targetType`
  - `targetId`
  - `content`（摘要）
  - `metadata`（JSON，可存差异字段）
  - `createdAt`

- 必须记录的动作（MVP）：
  - 登录成功/失败（失败可脱敏）
  - 用户新增、改密、状态变更
  - 档案导入、批量删除
  - 考试创建、状态变更、发布/撤回
  - 阅卷任务回退
  - 文件上传/删除

---

## 六、对象存储命名建议
- 路径模板：
  - `school-{schoolId}/{bizType}/{bizId}/{category}/{yyyyMMdd}/{uuid}.{ext}`
- 目标：
  - 易追踪归属
  - 减少对象Key冲突
  - 便于生命周期管理

---

## 七、安全与合规建议
- 下载一律使用签名URL，禁止裸露公共桶。
- 对日志中的手机号、身份证等敏感信息做脱敏存储/展示。
- 文件类型必须二次校验（扩展名 + MIME + 魔数可选）。

---

## 八、错误码建议（files/audit）
- `FILE_400`：文件参数非法
- `FILE_403`：无权限访问文件
- `FILE_404`：文件不存在
- `FILE_409`：文件被业务引用不可删
- `AUDIT_403`：无权限查看日志
- `AUDIT_404`：日志不存在

---

## 九、验收标准（files/audit）
- 文件上传、元数据登记、签名下载完整可用。
- 文件跨学校不可访问。
- 关键业务操作可在日志中检索并定位操作者与时间。
