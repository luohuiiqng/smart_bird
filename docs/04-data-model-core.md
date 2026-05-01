# 核心数据模型（V1）

## 职责
- 定义核心领域对象、关系和状态枚举，为数据库设计与代码实体建模提供统一基准。

## 包含内容
- 领域对象清单
- 核心关系
- 关键状态枚举

## 不包含内容
- SQL建表语句细节
- 索引调优策略
- 非核心扩展字段

---

## 一、核心领域对象
- `School`：学校租户
- `User`：平台用户（管理员/教师）
- `Grade`：年级
- `Class`：班级
- `Subject`：科目
- `Student`：学生
- `ExamPlan`：考试计划
- `ExamSubject`：考试科目实例
- `MarkTask`：阅卷任务
- `StudentSubjectScore`：学生分科成绩
- `StudentExamScore`：学生考试汇总成绩
- `AnswerSheetTemplate`：答题卡模板
- `OperationLog`：操作日志

## 二、核心关系（简版）
- 一个 `School` 拥有多个 `User/Grade/Class/Subject/Student/ExamPlan`
- 一个 `ExamPlan` 关联多个 `ExamSubject`
- 一个 `ExamPlan` 覆盖多个 `Class`（通过中间关系）
- 一个 `ExamSubject` 关联多个 `MarkTask`
- 一个 `Student` 在一个 `ExamSubject` 下对应一条分科成绩
- 一个 `Student` 在一个 `ExamPlan` 下对应一条汇总成绩

## 三、建议状态枚举

### 1) 考试状态 `ExamPlan.status`
- `CREATED`（创建中）
- `MARKING`（阅卷中）
- `PENDING_PUBLISH`（待发布）
- `PUBLISHED`（已发布）

### 2) 阅卷任务状态 `MarkTask.status`
- `TODO`（未开始）
- `IN_PROGRESS`（进行中）
- `DONE`（已完成）

### 3) 分科成绩状态 `StudentSubjectScore.status`
- `UNMARKED`（待阅）
- `MARKED`（已阅）
- `REVIEWING`（复核中）
- `CONFIRMED`（已确认）

## 四、最小字段建议（仅核心）

### 1) 租户与账号
- `schools`: `id, name, code, status, created_at`
- `users`: `id, school_id, username, password_hash, real_name, role, status, created_at`

### 2) 基础档案
- `grades`: `id, school_id, name, stage, status`
- `classes`: `id, school_id, grade_id, name, status`
- `subjects`: `id, school_id, name, short_name, type, status`
- `students`: `id, school_id, student_no, name, grade_id, class_id, status`

### 3) 考试与阅卷
- `exam_plans`: `id, school_id, name, exam_type, start_date, end_date, status, created_by`
- `exam_subjects`: `id, exam_id, subject_id, full_score, status, publish_at`
- `mark_tasks`: `id, exam_subject_id, teacher_id, status, assigned_at, started_at, finished_at`

### 4) 成绩与审计
- `student_subject_scores`: `id, exam_subject_id, student_id, final_score, status, marked_by, marked_at`
- `student_exam_scores`: `id, exam_id, student_id, total_score, rank_in_class, rank_in_grade, is_published`
- `operation_logs`: `id, school_id, user_id, module, action, target_type, target_id, content, created_at`
