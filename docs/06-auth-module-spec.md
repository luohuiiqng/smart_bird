# 认证与账号模块规格（auth/users/schools）

## 职责
- 定义首批可开发模块（`auth`、`users`、`schools`）的接口契约与业务规则。

## 包含内容
- 业务边界
- 接口定义（请求/响应）
- 基础校验规则
- 权限规则

## 不包含内容
- 考试/阅卷/成绩模块契约
- ORM与代码实现细节
- UI交互原型

---

## 一、模块边界

### 1) auth
- 登录、刷新令牌、退出、获取当前登录用户信息。

### 2) users
- 用户查询、创建、更新、状态变更（限管理员）。

### 3) schools
- 学校基础信息查询与更新（系统管理员或学校管理员）。

---

## 二、统一约定

### 1) 路由前缀
- 统一前缀：`/api/v1`

### 2) 鉴权
- 使用 Bearer Token（JWT）
- 除登录与刷新外，其余接口默认需鉴权

### 3) 响应结构
- 成功：`{ code: 0, message: "ok", data: ... }`
- 失败：`{ code: <非0>, message: "...", details?: ... }`

### 4) 时间字段
- 统一使用 ISO 8601 字符串（UTC）

---

## 三、Auth 接口

### 1) `POST /api/v1/auth/login`

#### 请求体
```json
{
  "username": "admin001",
  "password": "******"
}
```

#### 成功响应
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 7200,
    "user": {
      "id": 1001,
      "schoolId": 2001,
      "username": "admin001",
      "realName": "管理员",
      "role": "SCHOOL_ADMIN"
    }
  }
}
```

#### 规则
- 用户名与密码必填
- 密码错误返回统一提示，不暴露账号是否存在
- 连续失败可触发限流/风控（后续可接Redis）

### 2) `POST /api/v1/auth/refresh`

#### 请求体
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

#### 成功响应
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token",
    "expiresIn": 7200
  }
}
```

### 3) `POST /api/v1/auth/logout`

#### 请求体（可选）
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

#### 成功响应
```json
{
  "code": 0,
  "message": "ok",
  "data": true
}
```

### 4) `GET /api/v1/auth/me`

#### 成功响应
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1001,
    "schoolId": 2001,
    "username": "admin001",
    "realName": "管理员",
    "role": "SCHOOL_ADMIN",
    "status": "ENABLED"
  }
}
```

---

## 四、Users 接口

## 权限说明
- `SYSTEM_ADMIN`：可操作全租户用户
- `SCHOOL_ADMIN`：仅可操作本校用户
- `TEACHER`：仅可查看自身信息（MVP可不开放用户管理接口）

### 1) `GET /api/v1/users`

#### 查询参数
- `page`（默认1）
- `pageSize`（默认20）
- `keyword`（可选，匹配用户名/姓名）
- `role`（可选）
- `status`（可选）

#### 成功响应（示例）
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1001,
        "schoolId": 2001,
        "username": "admin001",
        "realName": "管理员",
        "role": "SCHOOL_ADMIN",
        "status": "ENABLED",
        "createdAt": "2026-05-01T12:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2) `POST /api/v1/users`

#### 请求体
```json
{
  "schoolId": 2001,
  "username": "teacher001",
  "realName": "张老师",
  "password": "Init@123456",
  "role": "TEACHER",
  "phone": "13800000000"
}
```

#### 规则
- `username` 全局唯一
- `password` 最小长度与复杂度校验
- `SCHOOL_ADMIN` 创建用户时 `schoolId` 必须等于自身所属学校

### 3) `PATCH /api/v1/users/:id`
- 可更新：`realName`, `phone`, `role`（受权限限制）, `status`
- 禁止直接更新 `password_hash`

### 4) `POST /api/v1/users/:id/reset-password`

#### 请求体
```json
{
  "newPassword": "New@123456"
}
```

#### 规则
- 仅管理员可重置他人密码
- 记录审计日志（操作者、目标用户、时间）

---

## 五、Schools 接口

### 1) `GET /api/v1/schools/:id`
- 返回学校基础信息（名称、编码、状态、创建时间）
- `SCHOOL_ADMIN` 仅可查询本校

### 2) `PATCH /api/v1/schools/:id`

#### 请求体
```json
{
  "name": "泰和中等专业学校",
  "status": "ENABLED"
}
```

#### 规则
- 学校编码 `code` 默认不可随意修改（需系统管理员特殊流程）

---

## 六、错误码建议（本模块）
- `AUTH_401`：未登录或令牌失效
- `AUTH_403`：无权限
- `AUTH_429`：登录过于频繁
- `USER_404`：用户不存在
- `USER_409`：用户名冲突
- `SCHOOL_404`：学校不存在

---

## 七、验收标准（首批开发）
- 能完成登录、刷新、退出、当前用户信息查询
- 学校管理员能完成本校用户的增删改查（至少增查改）
- 权限边界正确：跨学校数据不可见不可改
- 关键操作有审计日志记录
