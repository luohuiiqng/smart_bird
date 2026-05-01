# 阅卷任务模块规格（marking）

## 职责
- 定义阅卷任务模块的接口契约与业务规则，覆盖任务分配、阅卷提交、进度统计与复核入口。

## 包含内容
- 阅卷任务接口清单
- 阅卷状态流转规则
- 提交分数规则与并发约束

## 不包含内容
- 考试创建与发布规则（见 `08-exam-module-spec.md`）
- 成绩分析报表定义
- 文件存储底层实现细节

---

## 一、模块范围
- 按考试科目生成与分配阅卷任务
- 教师领取/开始任务
- 提交分数（客观 + 主观）
- 任务与科目进度统计

---

## 二、统一约定

### 1) 路由前缀
- 统一前缀：`/api/v1/marking`

### 2) 权限
- `SCHOOL_ADMIN`：分配任务、查看全量进度、强制回退任务状态
- `TEACHER`：查看本人任务、提交阅卷结果

### 3) 任务状态
- `TODO`：未开始
- `IN_PROGRESS`：进行中
- `DONE`：已完成
- `LOCKED`：锁定（复核或发布后）

---

## 三、接口定义

### 1) `GET /api/v1/marking/tasks`
- 说明：查询阅卷任务列表
- 查询参数：
  - `examId`（可选）
  - `examSubjectId`（可选）
  - `teacherId`（管理员可用）
  - `status`（TODO/IN_PROGRESS/DONE/LOCKED）
  - `page`, `pageSize`

### 2) `POST /api/v1/marking/tasks/assign`
- 说明：管理员批量分配阅卷任务

#### 请求体
```json
{
  "examSubjectId": 21001,
  "assignments": [
    { "teacherId": 5001, "studentIds": [8001, 8002, 8003] },
    { "teacherId": 5002, "studentIds": [8004, 8005] }
  ]
}
```

#### 规则
- 同一 `examSubjectId + studentId` 仅能分配给一个主阅老师（MVP）
- 分配后自动生成 `TODO` 状态任务

### 3) `POST /api/v1/marking/tasks/:id/start`
- 说明：教师开始阅卷任务

#### 规则
- 仅任务归属教师可执行
- `TODO -> IN_PROGRESS`
- 首次开始记录 `startedAt`

### 4) `GET /api/v1/marking/tasks/:id/detail`
- 说明：获取任务详情（待阅学生、题目分值结构、当前进度）

### 5) `POST /api/v1/marking/tasks/:id/submit-score`
- 说明：提交单个学生分数（可重复保存，最终提交锁定）

#### 请求体
```json
{
  "studentId": 8001,
  "scores": [
    { "questionNo": 1, "score": 8 },
    { "questionNo": 2, "score": 10 },
    { "questionNo": 3, "score": 12 }
  ],
  "finalSubmit": false
}
```

#### 规则
- 每题得分范围：`0 <= score <= questionFullScore`
- `finalSubmit = false`：保存草稿，不锁定
- `finalSubmit = true`：该学生科目成绩确认，写入最终分值

### 6) `POST /api/v1/marking/tasks/:id/finish`
- 说明：任务完成

#### 规则
- 前置：该任务下所有学生均已 `finalSubmit=true`
- `IN_PROGRESS -> DONE`

### 7) `POST /api/v1/marking/tasks/:id/reopen`
- 说明：管理员回退任务（复核或异常修正）

#### 请求体
```json
{
  "reason": "发现异常分值，需重审"
}
```

#### 规则
- `DONE -> IN_PROGRESS`
- 必须记录回退原因与操作者

### 8) `GET /api/v1/marking/exam-subjects/:id/progress`
- 说明：查询科目阅卷进度

#### 响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "examSubjectId": 21001,
    "totalStudents": 300,
    "submittedStudents": 240,
    "progressRate": 0.8,
    "taskStats": {
      "todo": 1,
      "inProgress": 4,
      "done": 8
    }
  }
}
```

---

## 四、并发与一致性规则
- 同一学生同一科目在同一时刻只允许一个“提交写入”事务成功。
- 建议使用乐观锁版本号 `version` 防止覆盖更新。
- 任务完成后默认锁定，禁止教师继续修改。

---

## 五、与成绩模块边界
- 本模块负责“分数采集与确认”。
- 成绩汇总、排名计算、发布动作由 `scores` 模块处理。

---

## 六、错误码建议（marking）
- `MARK_400`：参数错误
- `MARK_403`：无权限操作任务
- `MARK_404`：任务不存在
- `MARK_409`：状态冲突（如任务已锁定）
- `MARK_422`：分数超范围/前置条件不满足

---

## 七、验收标准（marking模块）
- 管理员可按科目完成任务分配。
- 教师可完整执行“开始 -> 保存 -> 最终提交 -> 完成”链路。
- 科目进度统计准确反映已提交人数与任务状态分布。
- 回退重开有审计记录且不破坏历史追踪。
