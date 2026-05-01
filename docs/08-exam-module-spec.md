# 考试管理模块规格（exam）

## 职责
- 定义考试管理模块的接口契约与业务规则，覆盖考试计划、考试科目、班级关联与状态流转。

## 包含内容
- 考试模块接口
- 状态机规则
- 核心校验规则

## 不包含内容
- 阅卷任务执行细节（见后续marking文档）
- 成绩分析报表定义
- 认证与档案模块细节

---

## 一、模块范围
- 考试计划（ExamPlan）管理
- 考试覆盖班级管理
- 考试科目管理
- 考试状态流转（创建中 -> 阅卷中 -> 待发布 -> 已发布）

---

## 二、统一约定

### 1) 路由前缀
- 统一前缀：`/api/v1/exams`

### 2) 权限
- `SYSTEM_ADMIN`：可跨学校查看（MVP可限制仅运维场景）
- `SCHOOL_ADMIN`：可管理本校考试
- `TEACHER`：可查看被授权考试（只读）

### 3) 状态枚举
- `CREATED`
- `MARKING`
- `PENDING_PUBLISH`
- `PUBLISHED`

---

## 三、接口定义

### 1) `GET /api/v1/exams`
- 说明：考试列表查询
- 查询参数：
  - `page`, `pageSize`
  - `keyword`（考试名称）
  - `examType`（如期中、月考、模拟）
  - `status`
  - `startDate`, `endDate`

#### 响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 10001,
        "name": "2026级高一期中",
        "examType": "MIDTERM",
        "status": "MARKING",
        "startDate": "2026-05-10",
        "endDate": "2026-05-12",
        "createdBy": 1001,
        "createdAt": "2026-05-01T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2) `POST /api/v1/exams`
- 说明：创建考试计划

#### 请求体
```json
{
  "name": "2026级高一期中",
  "examType": "MIDTERM",
  "startDate": "2026-05-10",
  "endDate": "2026-05-12",
  "gradeIds": [3001],
  "classIds": [4001, 4002, 4003]
}
```

#### 规则
- `name` 在同一学校+同一学期建议唯一
- `startDate <= endDate`
- `classIds` 必须属于当前学校

### 3) `GET /api/v1/exams/:id`
- 说明：查询考试详情（基础信息 + 关联班级 + 科目列表）

### 4) `PATCH /api/v1/exams/:id`
- 说明：更新考试基础信息
- 可更新字段：`name`, `examType`, `startDate`, `endDate`

#### 限制
- 状态为 `PUBLISHED` 时不可修改核心字段

### 5) `POST /api/v1/exams/:id/classes`
- 说明：设置考试覆盖班级（覆盖式更新）

#### 请求体
```json
{
  "classIds": [4001, 4002, 4003]
}
```

### 6) `POST /api/v1/exams/:id/subjects`
- 说明：设置考试科目（覆盖式更新）

#### 请求体
```json
{
  "subjects": [
    { "subjectId": 7001, "fullScore": 150 },
    { "subjectId": 7002, "fullScore": 150 },
    { "subjectId": 7003, "fullScore": 100 }
  ]
}
```

#### 规则
- `fullScore` 必须大于0
- 同一考试下 `subjectId` 不可重复

### 7) `POST /api/v1/exams/:id/change-status`
- 说明：考试状态流转接口

#### 请求体
```json
{
  "targetStatus": "MARKING"
}
```

#### 规则
- 仅允许顺序流转（默认）：
  - `CREATED -> MARKING`
  - `MARKING -> PENDING_PUBLISH`
  - `PENDING_PUBLISH -> PUBLISHED`
- 允许回退策略（可选，需权限）：
  - `PENDING_PUBLISH -> MARKING`

### 8) `POST /api/v1/exams/:id/publish`
- 说明：发布考试成绩（快捷动作，本质流转到 `PUBLISHED`）
- 前置校验：存在至少一个已完成阅卷的科目成绩

### 9) `POST /api/v1/exams/:id/unpublish`
- 说明：撤回发布（仅学校管理员可执行，建议记录原因）

#### 请求体
```json
{
  "reason": "发现成绩异常，需重新核对"
}
```

---

## 四、关键业务规则
- 考试必须先配置班级与科目，才能进入 `MARKING`。
- 若存在进行中的阅卷任务，不允许删除考试。
- 已发布考试默认只允许“撤回发布”，不允许直接删除。
- 删除考试应采用软删除并写审计日志。

---

## 五、错误码建议（exam）
- `EXAM_400`：参数错误
- `EXAM_403`：无权限
- `EXAM_404`：考试不存在
- `EXAM_409`：状态冲突（非法流转）
- `EXAM_422`：前置条件未满足（如未配置班级/科目）

---

## 六、验收标准（exam模块）
- 学校管理员可独立完成建考、配置班级、配置科目。
- 状态流转受控，非法流转被阻止且提示明确。
- 发布与撤回发布动作可追踪（日志完整）。
