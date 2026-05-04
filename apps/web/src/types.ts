export type UserRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER'

export type CurrentUser = {
  id: number
  username: string
  realName: string
  role: UserRole
  schoolId: number | null
  /** GET /auth/me 联表学校名称 */
  schoolName?: string | null
}

export type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

export type EntityStatus = 'ENABLED' | 'DISABLED'

/** 后台用户列表（职务 / 角色管理） */
export type OrgUser = {
  id: number
  schoolId: number | null
  username: string
  realName: string
  role: UserRole
  status: EntityStatus
  createdAt: string
}

export type Grade = {
  id: number
  name: string
  stage: string | null
  status: EntityStatus
  createdAt: string
}

export type ClassItem = {
  id: number
  gradeId: number
  name: string
  status: EntityStatus
  createdAt: string
}

export type Subject = {
  id: number
  name: string
  shortName: string | null
  type: string | null
  status: EntityStatus
  createdAt: string
}

export type Teacher = {
  id: number
  schoolId: number
  name: string
  gender: string | null
  phone: string | null
  email: string | null
  status: EntityStatus
  createdAt: string
}

export type Student = {
  id: number
  schoolId: number
  studentNo: string
  name: string
  gender: string | null
  gradeId: number
  classId: number
  status: EntityStatus
  createdAt: string
  grade: { id: number; name: string }
  class: { id: number; name: string }
}

export type ExamStatus = 'CREATED' | 'MARKING' | 'PENDING_PUBLISH' | 'PUBLISHED'

/** 列表接口附带科目与班级摘要（GET /exams） */
export type ExamListExamSubject = {
  id: number
  subjectId: number
  fullScore: number
  markingCompletedAt: string | null
  subject: { id: number; name: string; shortName: string | null }
}

export type ExamListExamClass = {
  classId: number
  class: { id: number; name: string; gradeId: number }
}

export type Exam = {
  id: number
  name: string
  examType: string
  startDate: string
  endDate: string
  status: ExamStatus
  createdBy: number
  createdAt: string
  examSubjects?: ExamListExamSubject[]
  examClasses?: ExamListExamClass[]
}

/** GET /exams/:id 详情（含班级、科目与阅卷完成时间） */
export type ExamDetail = {
  id: number
  name: string
  examType: string
  startDate: string
  endDate: string
  status: ExamStatus
  examClasses: Array<{
    classId: number
    class: { id: number; name: string; gradeId: number }
  }>
  examSubjects: Array<{
    id: number
    subjectId: number
    fullScore: number
    markingCompletedAt: string | null
    subject: { id: number; name: string; shortName: string | null }
  }>
}

export type MarkingTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'LOCKED'

/** GET /marking/tasks/:id/detail */
export type MarkingTaskDetail = {
  id: number
  status: MarkingTaskStatus
  examSubjectId: number
  examSubject: {
    fullScore: number
    subject: { id: number; name: string; shortName: string | null }
    exam: { id: number; name: string }
  }
  entries: Array<{
    id: number
    studentId: number
    finalSubmitted: boolean
    totalScore?: string | number | null
  }>
  progress: { totalStudents: number; submittedStudents: number }
}

export type MarkingTask = {
  id: number
  examId: number
  examSubjectId: number
  teacherId: number
  status: MarkingTaskStatus
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  entries: Array<{ id: number; studentId: number; finalSubmitted: boolean }>
}

export type ScoreRow = {
  id: number
  studentId: number
  totalScore: number
  rankInClass: number | null
  rankInGrade: number | null
  student: {
    id: number
    name: string
    studentNo: string
    gradeId: number
    classId: number
  }
}

export type ScoreStudentDetail = {
  total: {
    studentId: number
    totalScore: number
    rankInClass: number | null
    rankInGrade: number | null
    student: {
      id: number
      name: string
      studentNo: string
    }
  }
  subjects: Array<{
    id: number
    score: number
    examSubject: {
      id: number
      subject: {
        id: number
        name: string
      }
    }
  }>
}

export type ExamSummary = {
  examId: number
  studentCount: number
  avgScore: number
  maxScore: number
  minScore: number
  passRate: number
}

export type FileCategory =
  | 'ANSWER_SHEET_TEMPLATE'
  | 'IMPORT_FILE'
  | 'EXPORT_FILE'
  | 'SCAN_IMAGE'
  | 'OTHER'

export type FileAsset = {
  id: number
  schoolId: number
  uploaderId: number
  category: FileCategory
  objectKey: string
  fileName: string
  contentType: string
  size: number
  bizType: string | null
  bizId: number | null
  /** 列表接口可能不返回 */
  deletedAt?: string | null
  createdAt: string
  updatedAt?: string
  /** 答题卡设计器持久化的版式 JSON（列表接口通常不返回大字段） */
  sheetLayout?: unknown | null
  uploader?: { realName: string; username: string }
  school?: { name: string }
}

export type AuditLog = {
  id: number
  schoolId: number
  operatorId: number
  module: string
  action: string
  targetType: string
  targetId: number
  content: string
  metadata: unknown
  createdAt: string
  operator: {
    id: number
    username: string
    realName: string
    role: UserRole
  }
}
