import type {
  ApiResponse,
  ClassItem,
  CurrentUser,
  EntityStatus,
  Exam,
  ExamStatus,
  Grade,
  MarkingTask,
  MarkingTaskStatus,
  ScoreRow,
  ScoreStudentDetail,
  ExamSummary,
  Subject,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'
const ACCESS_TOKEN_KEY = 'smart_bird_access_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (payload.code !== 0) {
    throw new Error(payload.message || 'API_ERROR')
  }
  return payload.data
}

export async function login(username: string, password: string) {
  return request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getMe() {
  return request<CurrentUser>('/auth/me')
}

export async function listGrades(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: EntityStatus
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  return request<{ list: Grade[]; total: number; page: number; pageSize: number }>(
    `/org/grades${query ? `?${query}` : ''}`,
  )
}

export async function createGrade(payload: {
  name: string
  stage?: string
  status?: EntityStatus
}) {
  return request<Grade>('/org/grades', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listClasses(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: EntityStatus
  gradeId?: number
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.status) search.set('status', params.status)
  if (params?.gradeId) search.set('gradeId', String(params.gradeId))
  const query = search.toString()
  return request<{ list: ClassItem[]; total: number; page: number; pageSize: number }>(
    `/org/classes${query ? `?${query}` : ''}`,
  )
}

export async function createClass(payload: {
  gradeId: number
  name: string
  status?: EntityStatus
}) {
  return request<ClassItem>('/org/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listSubjects(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  type?: string
  status?: EntityStatus
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.type) search.set('type', params.type)
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  return request<{ list: Subject[]; total: number; page: number; pageSize: number }>(
    `/org/subjects${query ? `?${query}` : ''}`,
  )
}

export async function createSubject(payload: {
  name: string
  shortName?: string
  type?: string
  status?: EntityStatus
}) {
  return request<Subject>('/org/subjects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listExams(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  examType?: string
  status?: ExamStatus
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.examType) search.set('examType', params.examType)
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  return request<{ list: Exam[]; total: number; page: number; pageSize: number }>(
    `/exams${query ? `?${query}` : ''}`,
  )
}

export async function createExam(payload: {
  name: string
  examType: string
  startDate: string
  endDate: string
  classIds: number[]
}) {
  return request<Exam>('/exams', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function setExamClasses(examId: number, classIds: number[]) {
  return request<boolean>(`/exams/${examId}/classes`, {
    method: 'POST',
    body: JSON.stringify({ classIds }),
  })
}

export async function setExamSubjects(
  examId: number,
  subjects: Array<{ subjectId: number; fullScore: number }>,
) {
  return request<boolean>(`/exams/${examId}/subjects`, {
    method: 'POST',
    body: JSON.stringify({ subjects }),
  })
}

export async function getExamDetail(examId: number) {
  return request<{
    id: number
    name: string
    examSubjects: Array<{
      id: number
      subjectId: number
      fullScore: number
      subject: { id: number; name: string; shortName: string | null }
    }>
  }>(`/exams/${examId}`)
}

export async function listMarkingTasks(params?: {
  examId?: number
  examSubjectId?: number
  teacherId?: number
  status?: MarkingTaskStatus
  page?: number
  pageSize?: number
}) {
  const search = new URLSearchParams()
  if (params?.examId) search.set('examId', String(params.examId))
  if (params?.examSubjectId) search.set('examSubjectId', String(params.examSubjectId))
  if (params?.teacherId) search.set('teacherId', String(params.teacherId))
  if (params?.status) search.set('status', params.status)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  return request<{ list: MarkingTask[]; total: number; page: number; pageSize: number }>(
    `/marking/tasks${query ? `?${query}` : ''}`,
  )
}

export async function assignMarkingTasks(payload: {
  examSubjectId: number
  assignments: Array<{ teacherId: number; studentIds: number[] }>
}) {
  return request<boolean>('/marking/tasks/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function startMarkingTask(taskId: number) {
  return request<MarkingTask>(`/marking/tasks/${taskId}/start`, { method: 'POST' })
}

export async function finishMarkingTask(taskId: number) {
  return request<MarkingTask>(`/marking/tasks/${taskId}/finish`, { method: 'POST' })
}

export async function reopenMarkingTask(taskId: number, reason: string) {
  return request<MarkingTask>(`/marking/tasks/${taskId}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function getMarkingTaskDetail(taskId: number) {
  return request<{
    id: number
    status: MarkingTaskStatus
    examSubjectId: number
    entries: Array<{ id: number; studentId: number; finalSubmitted: boolean }>
    progress: { totalStudents: number; submittedStudents: number }
  }>(`/marking/tasks/${taskId}/detail`)
}

export async function getMarkingExamSubjectProgress(examSubjectId: number) {
  return request<{
    examSubjectId: number
    totalStudents: number
    submittedStudents: number
    progressRate: number
    taskStats: { todo: number; inProgress: number; done: number }
  }>(`/marking/exam-subjects/${examSubjectId}/progress`)
}

export async function recalculateExamScores(examId: number) {
  return request<{ examId: number; recalculatedStudents: number }>(
    `/scores/exams/${examId}/recalculate`,
    { method: 'POST' },
  )
}

export async function listExamScores(examId: number, params?: {
  page?: number
  pageSize?: number
  gradeId?: number
  classId?: number
  keyword?: string
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.gradeId) search.set('gradeId', String(params.gradeId))
  if (params?.classId) search.set('classId', String(params.classId))
  if (params?.keyword) search.set('keyword', params.keyword)
  const query = search.toString()
  return request<{ list: ScoreRow[]; total: number; page: number; pageSize: number }>(
    `/scores/exams/${examId}${query ? `?${query}` : ''}`,
  )
}

export async function getStudentExamScore(examId: number, studentId: number) {
  return request<ScoreStudentDetail>(`/scores/exams/${examId}/students/${studentId}`)
}

export async function publishExamScores(examId: number, publishNote?: string) {
  return request<{ id: number; status: ExamStatus; publishStatus: string }>(
    `/scores/exams/${examId}/publish`,
    {
      method: 'POST',
      body: JSON.stringify({ publishNote }),
    },
  )
}

export async function unpublishExamScores(examId: number, reason: string) {
  return request<{ id: number; status: ExamStatus; publishStatus: string }>(
    `/scores/exams/${examId}/unpublish`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  )
}

export async function getAnalysisSummary(examId: number) {
  return request<ExamSummary>(`/analysis/exams/${examId}/summary`)
}

export async function getAnalysisClassCompare(examId: number) {
  return request<Array<{ classId: number; className: string; avgScore: number; passRate: number }>>(
    `/analysis/exams/${examId}/class-compare`,
  )
}

export async function getAnalysisSubjectBreakdown(examId: number) {
  return request<
    Array<{
      examSubjectId: number
      subjectName: string
      avgScore: number
      maxScore: number
      minScore: number
      passRate: number
    }>
  >(`/analysis/exams/${examId}/subject-breakdown`)
}
