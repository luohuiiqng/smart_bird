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
