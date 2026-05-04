import { computed, reactive } from 'vue'
import type { CurrentUser } from '../types'
import { clearAccessToken, getMe, login as apiLogin, setAccessToken } from '../lib/api'

const state = reactive({
  user: null as CurrentUser | null,
  initializing: true,
})

let resolveReady: (() => void) | null = null
export const authReady: Promise<void> = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export function useAuth() {
  return {
    user: computed(() => state.user),
    initializing: computed(() => state.initializing),
    loginWithPassword,
    logout,
    refreshMe,
  }
}

export function getAuthState() {
  return state
}

export async function initAuth() {
  try {
    state.user = await getMe()
  } catch {
    clearAccessToken()
    state.user = null
  } finally {
    state.initializing = false
    resolveReady?.()
  }
}

async function refreshMe() {
  try {
    state.user = await getMe()
  } catch {
    clearAccessToken()
    state.user = null
  }
}

async function loginWithPassword(username: string, password: string) {
  const authData = await apiLogin(username, password)
  setAccessToken(authData.accessToken)
  await refreshMe()
}

function logout() {
  clearAccessToken()
  state.user = null
}
