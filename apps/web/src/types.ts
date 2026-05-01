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
