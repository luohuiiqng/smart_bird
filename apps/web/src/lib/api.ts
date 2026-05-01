import type { ApiResponse, CurrentUser, EntityStatus, Grade } from '../types'

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
