export type UserRole = 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER'

export type CurrentUser = {
  id: number
  username: string
  realName: string
  role: UserRole
  schoolId: number | null
}

export type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

export type EntityStatus = 'ENABLED' | 'DISABLED'

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

export type ExamStatus = 'CREATED' | 'MARKING' | 'PENDING_PUBLISH' | 'PUBLISHED'

export type Exam = {
  id: number
  name: string
  examType: string
  startDate: string
  endDate: string
  status: ExamStatus
  createdBy: number
  createdAt: string
}

export type MarkingTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'LOCKED'

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
