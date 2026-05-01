# 成绩与分析模块规格（scores / analysis）

## 职责
- 定义成绩汇总、发布、查询与分析统计模块的接口契约和业务规则。

## 包含内容
- 成绩模块接口
- 发布与撤回规则
- 分析统计口径（MVP）

## 不包含内容
- 阅卷提交过程（见 `09-marking-module-spec.md`）
- 考试创建过程（见 `08-exam-module-spec.md`）
- 登录与权限底层实现

---

## 一、模块范围
- 分科成绩汇总到考试总分
- 排名计算（班级/年级）
- 成绩发布与撤回
- 基础统计分析（均分、最高、最低、及格率、班级对比）

---

## 二、统一约定

### 1) 路由前缀
- 成绩：`/api/v1/scores`
- 分析：`/api/v1/analysis`

### 2) 权限
- `SCHOOL_ADMIN`：可执行汇总、发布、撤回、查看全量分析
- `TEACHER`：可查看授权考试/班级的成绩和分析结果

### 3) 发布状态
- `UNPUBLISHED`：未发布
- `PUBLISHED`：已发布

---

## 三、成绩模块接口（scores）

### 1) `POST /api/v1/scores/exams/:examId/recalculate`
- 说明：按当前分科成绩重算汇总成绩与排名

#### 规则
- 前置：考试存在且至少有已确认的分科成绩
- 建议异步化（MVP数据量小可同步）

#### 响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "examId": 10001,
    "recalculatedStudents": 320
  }
}
```

### 2) `GET /api/v1/scores/exams/:examId`
- 说明：查询考试成绩列表（学生维度）
- 查询参数：
  - `gradeId`, `classId`, `keyword`
  - `page`, `pageSize`
  - `sortBy`（`totalScore`, `rankInClass`, `rankInGrade`）
  - `sortOrder`（`asc`, `desc`）

### 3) `GET /api/v1/scores/exams/:examId/students/:studentId`
- 说明：查询单个学生该考试的分科与总分详情

### 4) `POST /api/v1/scores/exams/:examId/publish`
- 说明：发布考试成绩

#### 请求体（可选）
```json
{
  "publishNote": "期中成绩正式发布"
}
```

#### 前置规则
- 考试状态需满足可发布条件（通常 `PENDING_PUBLISH`）
- 存在汇总成绩数据（已执行recalculate）

### 5) `POST /api/v1/scores/exams/:examId/unpublish`
- 说明：撤回发布

#### 请求体
```json
{
  "reason": "发现英语成绩导入异常，需修正后重发"
}
```

#### 规则
- 仅管理员可执行
- 撤回后教师端/查询端应立即按未发布处理

---

## 四、分析模块接口（analysis）

### 1) `GET /api/v1/analysis/exams/:examId/summary`
- 说明：考试总体统计

#### 响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "examId": 10001,
    "studentCount": 320,
    "avgScore": 468.2,
    "maxScore": 612,
    "minScore": 189,
    "passRate": 0.83
  }
}
```

### 2) `GET /api/v1/analysis/exams/:examId/class-compare`
- 说明：班级对比统计

#### 查询参数
- `gradeId`（可选）

#### 响应示例
```json
{
  "code": 0,
  "message": "ok",
  "data": [
    { "classId": 4001, "className": "高一(1)班", "avgScore": 478.1, "passRate": 0.86 },
    { "classId": 4002, "className": "高一(2)班", "avgScore": 463.5, "passRate": 0.81 }
  ]
}
```

### 3) `GET /api/v1/analysis/exams/:examId/subject-breakdown`
- 说明：分科统计（科目均分、最高分、及格率）

---

## 五、统计口径（MVP统一）
- `avgScore`：总分平均值，保留1位小数。
- `passRate`：达到及格线人数 / 总人数。
- 班级排名：同班总分降序，分数相同并列名次。
- 年级排名：同年级总分降序，分数相同并列名次。

> 及格线策略建议配置化：默认总分60%，分科60%，后续可按考试自定义。

---

## 六、一致性与性能建议
- 发布前强制触发一次汇总校验，避免脏数据发布。
- 发布后保留“发布快照版本号”，支持追踪与回滚。
- 大数据量场景下，汇总与分析建议异步任务化。

---

## 七、错误码建议（scores/analysis）
- `SCORE_400`：参数错误
- `SCORE_403`：无权限
- `SCORE_404`：考试或成绩不存在
- `SCORE_409`：发布状态冲突
- `SCORE_422`：前置条件不满足（未汇总、未完成阅卷）

---

## 八、验收标准（scores/analysis）
- 可稳定完成“重算 -> 发布 -> 查询 -> 撤回”闭环。
- 班级与年级排名结果可复核且可追踪。
- 核心分析接口响应正确，口径与文档一致。
