import type {
  ApiResponse,
  AuditLog,
  ClassItem,
  CurrentUser,
  OrgUser,
  EntityStatus,
  Exam,
  ExamDetail,
  ExamStatus,
  FileAsset,
  FileCategory,
  Grade,
  MarkingTask,
  MarkingTaskStatus,
  ScoreRow,
  ScoreStudentDetail,
  ExamSummary,
  MarkingTaskDetail,
  Student,
  Subject,
  Teacher,
  UserRole,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
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

function needsBearer(path: string, init?: RequestInit) {
  if (init?.method === 'POST' && (path === '/auth/login' || path === '/auth/refresh')) {
    return false
  }
  return true
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = needsBearer(path, init) ? getAccessToken() : null
  const isFormData = init?.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const raw = await response.text()

  if (!response.ok) {
    let message = `HTTP_${response.status}`
    try {
      const errBody = JSON.parse(raw) as { message?: string | string[] }
      const m = errBody.message
      const first = Array.isArray(m) ? m[0] : m
      if (typeof first === 'string') {
        if (response.status === 401) {
          if (first === 'AUTH_401') {
            if (path === '/auth/login') {
              message = '账号或密码错误'
            } else if (path === '/auth/change-password') {
              message = '当前密码不正确'
            } else {
              message = '登录已失效，请重新登录'
            }
          } else {
            message = first
          }
        } else {
          message = first
        }
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message)
  }

  const payload = JSON.parse(raw) as ApiResponse<T>
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

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<boolean>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
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

export async function updateGrade(
  id: number,
  payload: { name?: string; stage?: string; status?: EntityStatus },
) {
  return request<Grade>(`/org/grades/${id}`, {
    method: 'PATCH',
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

export async function updateClass(
  id: number,
  payload: { gradeId?: number; name?: string; status?: EntityStatus },
) {
  return request<ClassItem>(`/org/classes/${id}`, {
    method: 'PATCH',
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

export async function updateSubject(
  id: number,
  payload: {
    name?: string
    shortName?: string
    type?: string
    status?: EntityStatus
  },
) {
  return request<Subject>(`/org/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function listTeachers(params?: {
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
  return request<{ list: Teacher[]; total: number; page: number; pageSize: number }>(
    `/org/teachers${query ? `?${query}` : ''}`,
  )
}

export async function createTeacher(payload: {
  name: string
  gender?: string
  phone?: string
  email?: string
  status?: EntityStatus
}) {
  return request<Teacher>('/org/teachers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTeacher(
  id: number,
  payload: {
    name?: string
    gender?: string
    phone?: string
    email?: string
    status?: EntityStatus
  },
) {
  return request<Teacher>(`/org/teachers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteTeacher(id: number) {
  return request<boolean>(`/org/teachers/${id}`, { method: 'DELETE' })
}

export async function listStudents(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  gradeId?: number
  classId?: number
  status?: EntityStatus
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.gradeId) search.set('gradeId', String(params.gradeId))
  if (params?.classId) search.set('classId', String(params.classId))
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  return request<{ list: Student[]; total: number; page: number; pageSize: number }>(
    `/org/students${query ? `?${query}` : ''}`,
  )
}

export async function createStudent(payload: {
  studentNo: string
  name: string
  gender?: string
  gradeId: number
  classId: number
  status?: EntityStatus
}) {
  return request<Student>('/org/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateStudent(
  id: number,
  payload: {
    studentNo?: string
    name?: string
    gender?: string
    gradeId?: number
    classId?: number
    status?: EntityStatus
  },
) {
  return request<Student>(`/org/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteStudent(id: number) {
  return request<boolean>(`/org/students/${id}`, { method: 'DELETE' })
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
  return request<ExamDetail>(`/exams/${examId}`)
}

export async function submitMarkingScore(
  taskId: number,
  payload: {
    studentId: number
    scores: Array<{ questionNo: number; score: number }>
    finalSubmit: boolean
  },
) {
  return request<unknown>(`/marking/tasks/${taskId}/submit-score`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function changeExamStatus(examId: number, targetStatus: ExamStatus) {
  return request<Exam>(`/exams/${examId}/change-status`, {
    method: 'POST',
    body: JSON.stringify({ targetStatus }),
  })
}

export async function publishExamWorkflow(examId: number) {
  return request<Exam>(`/exams/${examId}/publish`, { method: 'POST' })
}

export async function unpublishExamWorkflow(examId: number, reason: string) {
  return request<Exam>(`/exams/${examId}/unpublish`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function removeExam(examId: number, reason?: string) {
  return request<Exam>(`/exams/${examId}`, {
    method: 'DELETE',
    body: JSON.stringify(reason ? { reason } : {}),
  })
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
  return request<MarkingTaskDetail>(`/marking/tasks/${taskId}/detail`)
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

export async function uploadFileMetadata(payload: {
  category: FileCategory
  fileName: string
  contentType: string
  size: number
  bizType?: string
  bizId?: number
}) {
  return request<{
    fileId: number
    objectKey: string
    fileName: string
    size: number
    contentType: string
  }>('/files/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 新建空答题卡模板（落库 + 占位文件），返回 `fileId` 供设计页使用 */
export async function createAnswerSheetTemplate(body?: { fileName?: string }) {
  return request<{
    fileId: number
    objectKey: string
    fileName: string
    size: number
    contentType: string
  }>('/files/answer-sheet-template', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function uploadFileBinary(payload: {
  file: File
  category: FileCategory
  bizType?: string
  bizId?: number
}) {
  const formData = new FormData()
  formData.set('file', payload.file)
  formData.set('category', payload.category)
  if (payload.bizType) formData.set('bizType', payload.bizType)
  if (payload.bizId) formData.set('bizId', String(payload.bizId))

  return request<{
    fileId: number
    objectKey: string
    fileName: string
    size: number
    contentType: string
  }>('/files/upload-binary', {
    method: 'POST',
    body: formData,
  })
}

export async function getFileDetail(fileId: number) {
  return request<FileAsset>(`/files/${fileId}`)
}

export async function getFilePresignedUrl(fileId: number, expiresIn = 300) {
  return request<{ url: string; expiresIn: number }>(
    `/files/${fileId}/presigned-url?expiresIn=${expiresIn}`,
  )
}

export async function deleteFile(fileId: number) {
  return request<FileAsset>(`/files/${fileId}`, { method: 'DELETE' })
}

export async function patchFile(
  fileId: number,
  body: { fileName?: string; sheetLayout?: unknown },
) {
  return request<FileAsset>(`/files/${fileId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function listFiles(params?: {
  page?: number
  pageSize?: number
  category?: FileCategory
  keyword?: string
  onlyMine?: boolean
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.category) search.set('category', params.category)
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.onlyMine === true) search.set('onlyMine', 'true')
  const query = search.toString()
  return request<{ list: FileAsset[]; total: number; page: number; pageSize: number }>(
    `/files${query ? `?${query}` : ''}`,
  )
}

export async function listUsers(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  role?: UserRole
  status?: EntityStatus
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.role) search.set('role', params.role)
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  return request<{ list: OrgUser[]; total: number; page: number; pageSize: number }>(
    `/users${query ? `?${query}` : ''}`,
  )
}

export async function updateUser(
  id: number,
  payload: { realName?: string; phone?: string; role?: UserRole; status?: EntityStatus },
) {
  return request<OrgUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function listAuditLogs(params?: {
  module?: string
  action?: string
  operatorId?: number
  targetType?: string
  targetId?: number
  page?: number
  pageSize?: number
}) {
  const search = new URLSearchParams()
  if (params?.module) search.set('module', params.module)
  if (params?.action) search.set('action', params.action)
  if (params?.operatorId) search.set('operatorId', String(params.operatorId))
  if (params?.targetType) search.set('targetType', params.targetType)
  if (params?.targetId) search.set('targetId', String(params.targetId))
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  return request<{ list: AuditLog[]; total: number; page: number; pageSize: number }>(
    `/audit/logs${query ? `?${query}` : ''}`,
  )
}

export async function getAuditLogDetail(id: number) {
  return request<AuditLog>(`/audit/logs/${id}`)
}
