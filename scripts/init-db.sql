-- ============================================
-- 智能阅卷系统 - 数据库初始化脚本
-- 用于 Docker 容器首次启动
-- ============================================

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建自定义类型
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE class_status AS ENUM ('ACTIVE', 'GRADUATED', 'DISBANDED');
CREATE TYPE class_member_role AS ENUM ('STUDENT', 'CLASS_MONITOR', 'TEACHER');
CREATE TYPE question_type AS ENUM (
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
  'SHORT_ANSWER',
  'ESSAY',
  'COMPREHENSION',
  'LISTENING',
  'UPLOAD'
);
CREATE TYPE difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE question_bank_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE question_status AS ENUM ('ACTIVE', 'REVIEWING', 'REJECTED', 'ARCHIVED');
CREATE TYPE paper_status AS ENUM ('DRAFT', 'PUBLISHED', 'FINISHED', 'ARCHIVED');
CREATE TYPE exam_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'GRADING', 'FINISHED', 'ARCHIVED');
CREATE TYPE notification_type AS ENUM (
  'EXAM_PUBLISHED',
  'EXAM_STARTING',
  'EXAM_REMINDER',
  'EXAM_FINISHED',
  'GRADE_PUBLISHED',
  'HOMEWORK_ASSIGNED',
  'ANNOUNCEMENT',
  'SYSTEM'
);

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

-- 用户表（已由 Prisma 自动创建，这里添加额外约束）
-- 注意：实际表由 Prisma 管理，这里的 SQL 仅示例

-- 创建索引（Prisma 也会自动创建部分索引）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- 2. CLASSES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
CREATE INDEX IF NOT EXISTS idx_classes_year ON classes(year);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- ============================================
-- 3. QUESTIONS & QUESTION BANKS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- ============================================
-- 4. EXAMS & SUBMISSIONS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_time ON exams(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_user ON exam_sessions(exam_id, user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_token ON exam_sessions(token);

CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON submissions(session_id);

-- ============================================
-- 5. GRADING
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gradings_submission ON gradings(submission_id);
CREATE INDEX IF NOT EXISTS idx_gradings_grader ON gradings(grader_id, graded_at);
CREATE INDEX IF NOT EXISTS idx_gradings_answer ON gradings(answer_id);

CREATE INDEX IF NOT EXISTS idx_ai_scores_answer ON ai_scores(answer_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_model ON ai_scores(model);

-- ============================================
-- 6. ANALYTICS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exam_statistics_exam ON exam_statistics(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_user ON student_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_student_analytics_date ON student_analytics(date);

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ============================================
-- 8. AUDIT LOGS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);

-- ============================================
-- 9. 种子数据（Seed Data）
-- ============================================

-- 插入默认系统配置
INSERT INTO system_configs (key, value, type, description)
VALUES
  ('app.name', '智能阅卷系统', 'string', '应用名称'),
  ('app.version', '1.0.0', 'string', '应用版本'),
  ('exam.max_attempts', '1', 'number', '单场考试最大尝试次数'),
  ('exam.allow_review', 'true', 'boolean', '是否允许考后查看答案'),
  ('ai.grading.enabled', 'true', 'boolean', '启用AI评分'),
  ('ai.grading.confidence_threshold', '0.8', 'number', 'AI评分置信度阈值'),
  ('notification.exam_published', 'true', 'boolean', '考试发布通知'),
  ('notification.grade_published', 'true', 'boolean', '成绩发布通知')
ON CONFLICT (key) DO NOTHING;

-- 插入角色权限配置
INSERT INTO system_configs (key, value, type, description)
VALUES
  ('permissions.teacher', '["questions:create","questions:view","papers:create","exams:create","grading:manual"]', 'json', '教师权限'),
  ('permissions.student', '["exams:view","submissions:view"]', 'json', '学生权限'),
  ('permissions.admin', '["users:create","users:view","system:config"]', 'json', '管理员权限')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 10. 视图（Views）- 常用查询优化
-- ============================================

-- 学生成绩视图
CREATE OR REPLACE VIEW student_score_summary AS
SELECT
  u.id as user_id,
  u.name as student_name,
  c.name as class_name,
  COUNT(DISTINCT e.id) as exam_count,
  AVG(s.total_score) as average_score,
  MAX(s.total_score) as max_score,
  MIN(s.total_score) as min_score
FROM users u
LEFT JOIN class_members cm ON u.id = cm.user_id
LEFT JOIN classes c ON cm.class_id = c.id
LEFT JOIN exam_sessions es ON u.id = es.user_id
LEFT JOIN submissions s ON es.id = s.session_id
WHERE cm.role = 'STUDENT'
GROUP BY u.id, u.name, c.name;

-- 考试统计视图
CREATE OR REPLACE VIEW exam_summary AS
SELECT
  e.id as exam_id,
  e.title,
  e.status,
  COUNT(DISTINCT es.id) as total_students,
  COUNT(DISTINCT s.id) as submitted_count,
  AVG(s.total_score) as avg_score,
  MAX(s.total_score) as max_score,
  MIN(s.total_score) as min_score
FROM exams e
LEFT JOIN exam_sessions es ON e.id = es.exam_id
LEFT JOIN submissions s ON es.id = s.session_id
GROUP BY e.id, e.title, e.status;

-- ============================================
-- 11. 触发器（Triggers）- 自动更新
-- ============================================

-- 更新试卷总分的触发器
CREATE OR REPLACE FUNCTION update_paper_total_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE papers
  SET total_score = (
    SELECT COALESCE(SUM(score), 0)
    FROM paper_items
    WHERE paper_id = NEW.paper_id
  )
  WHERE id = NEW.paper_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paper_score
AFTER INSERT OR UPDATE OR DELETE ON paper_items
FOR EACH ROW
EXECUTE FUNCTION update_paper_total_score();

-- 自动创建考试统计记录的触发器
CREATE OR REPLACE FUNCTION create_exam_statistic()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO exam_statistics (exam_id, total_students, attended, average_score, max_score, min_score, median_score, std_dev, passing_rate, excellent_rate)
  VALUES (NEW.id, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_exam_statistic
AFTER INSERT ON exams
FOR EACH ROW
EXECUTE FUNCTION create_exam_statistic();

-- ============================================
-- 12. 全文搜索配置（可选）
-- ============================================

-- 创建题目搜索的GIN索引
-- CREATE INDEX IF NOT EXISTS idx_questions_search ON questions
-- USING gin(to_tsvector('chinese', content || ' ' || COALESCE(options::text, '')));

-- 创建全文本搜索函数
-- CREATE OR REPLACE FUNCTION search_questions(query_text TEXT)
-- RETURNS TABLE (
--   id TEXT,
--   content TEXT,
--   bank_title TEXT,
--   similarity REAL
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     q.id,
--     q.content,
--     qb.title as bank_title,
--     ts_rank(to_tsvector('chinese', q.content), plainto_tsquery('chinese', query_text)) as similarity
--   FROM questions q
--   JOIN question_banks qb ON q.bank_id = qb.id
--   WHERE to_tsvector('chinese', q.content) @@ plainto_tsquery('chinese', query_text)
--   ORDER BY similarity DESC
--   LIMIT 50;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================
-- 完成
-- ============================================

-- 显示完成信息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库初始化脚本执行完成！';
  RAISE NOTICE '📊 已创建索引、视图、触发器和种子数据';
  RAISE NOTICE '🚀 系统已准备就绪，可以通过 Prisma 开始开发';
END $$;
