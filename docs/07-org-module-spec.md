# 基础档案模块规格（org）

## 职责
- 定义基础档案模块（年级、班级、科目、教师、学生）的接口契约与业务规则。

## 包含内容
- 资源边界与权限规则
- 接口清单（CRUD + 导入导出）
- 关键校验规则

## 不包含内容
- 认证模块细节（见 `06-auth-module-spec.md`）
- 考试/阅卷/成绩模块接口
- ORM实现与SQL细节

---

## 一、资源范围
- `grades` 年级
- `classes` 班级
- `subjects` 科目
- `teachers` 教师（档案维度）
- `students` 学生

> 注：账号体系中的 `users` 与教师档案可一一绑定，但职责不同。  
> `users` 用于登录与权限，`teachers` 用于业务档案信息。

---

## 二、统一约定

### 1) 路由前缀
- 统一前缀：`/api/v1/org`

### 2) 鉴权与租户隔离
- 所有接口必须鉴权
- `SYSTEM_ADMIN` 可跨学校
- `SCHOOL_ADMIN` 仅本校数据
- `TEACHER` 默认只读受限（MVP可只开放学生查询）

### 3) 分页参数
- `page` 默认 `1`
- `pageSize` 默认 `20`

### 4) 通用响应
- 成功：`{ code: 0, message: "ok", data: ... }`
- 失败：`{ code: <非0>, message: "...", details?: ... }`

---

## 三、年级（grades）

### 1) `GET /api/v1/org/grades`
- 查询参数：`keyword`, `status`, `page`, `pageSize`

### 2) `POST /api/v1/org/grades`

#### 请求体
```json
{
  "name": "2026级",
  "stage": "HIGH",
  "status": "ENABLED"
}
```

### 3) `PATCH /api/v1/org/grades/:id`
- 可更新：`name`, `stage`, `status`

### 4) `DELETE /api/v1/org/grades/:id`
- 软删除优先
- 若存在关联班级，默认不允许删除（返回冲突）

---

## 四、班级（classes）

### 1) `GET /api/v1/org/classes`
- 查询参数：`gradeId`, `keyword`, `status`, `page`, `pageSize`

### 2) `POST /api/v1/org/classes`

#### 请求体
```json
{
  "gradeId": 3001,
  "name": "高一(1)班",
  "headTeacherId": 5001,
  "status": "ENABLED"
}
```

### 3) `POST /api/v1/org/classes/batch-create`

#### 请求体
```json
{
  "gradeId": 3001,
  "names": ["高一(1)班", "高一(2)班", "高一(3)班"]
}
```

### 4) `PATCH /api/v1/org/classes/:id`
- 可更新：`name`, `headTeacherId`, `status`

### 5) `DELETE /api/v1/org/classes/:id`
- 存在在读学生时不允许硬删除

---

## 五、科目（subjects）

### 1) `GET /api/v1/org/subjects`
- 查询参数：`keyword`, `type`, `status`, `page`, `pageSize`

### 2) `POST /api/v1/org/subjects`

#### 请求体
```json
{
  "name": "数学",
  "shortName": "数",
  "type": "MAIN",
  "status": "ENABLED"
}
```

### 3) `PATCH /api/v1/org/subjects/:id`

### 4) `POST /api/v1/org/subjects/import`
- Excel导入（multipart/form-data）

### 5) `GET /api/v1/org/subjects/template`
- 下载导入模板

---

## 六、教师（teachers）

### 1) `GET /api/v1/org/teachers`
- 查询参数：`keyword`, `dutyId`, `status`, `page`, `pageSize`

### 2) `POST /api/v1/org/teachers`

#### 请求体
```json
{
  "name": "张老师",
  "gender": "MALE",
  "phone": "13800000000",
  "email": "teacher001@school.edu",
  "dutyId": 9001,
  "subjectIds": [7001, 7002],
  "status": "ENABLED"
}
```

### 3) `PATCH /api/v1/org/teachers/:id`

### 4) `POST /api/v1/org/teachers/import`

### 5) `GET /api/v1/org/teachers/template`

### 6) `POST /api/v1/org/teachers/export`
- 导出筛选结果（可异步，MVP可同步小数据量导出）

---

## 七、学生（students）

### 1) `GET /api/v1/org/students`
- 查询参数：`gradeId`, `classId`, `keyword`, `status`, `page`, `pageSize`

### 2) `POST /api/v1/org/students`

#### 请求体
```json
{
  "studentNo": "2026001001",
  "name": "李同学",
  "gender": "MALE",
  "gradeId": 3001,
  "classId": 4001,
  "status": "ENABLED"
}
```

### 3) `PATCH /api/v1/org/students/:id`

### 4) `POST /api/v1/org/students/import`
- Excel导入（multipart/form-data）

### 5) `GET /api/v1/org/students/template`

### 6) `POST /api/v1/org/students/export`

### 7) `POST /api/v1/org/students/batch-delete`

#### 请求体
```json
{
  "ids": [8001, 8002, 8003]
}
```

---

## 八、关键校验规则
- 同一学校内，年级名称不可重复。
- 同一年级下，班级名称不可重复。
- 同一学校内，科目名称不可重复。
- 学生学号在同一学校内唯一。
- 教师手机号在同一学校内建议唯一（允许空值）。
- 导入时必须返回逐行错误信息（行号 + 原因）。

---

## 九、错误码建议（org）
- `ORG_400`：参数错误
- `ORG_403`：无权限访问该学校资源
- `ORG_404`：资源不存在
- `ORG_409`：唯一性冲突/状态冲突
- `ORG_422`：导入文件格式错误

---

## 十、验收标准（org模块）
- 学校管理员可完成年级/班级/科目/教师/学生的查询与维护。
- 学生与教师至少支持模板下载与导入。
- 所有查询结果严格按学校隔离。
- 批量操作具备基础防误删能力（如二次确认标记或软删除）。
