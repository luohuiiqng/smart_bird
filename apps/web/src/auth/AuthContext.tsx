import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearAccessToken, getMe, login, setAccessToken } from '../lib/api'
import { AuthContext, type AuthContextValue } from './auth-context'
import type { CurrentUser } from '../types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [initializing, setInitializing] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      clearAccessToken()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    void getMe()
      .then((me) => {
        if (active) {
          setUser(me)
        }
      })
      .catch(() => {
        if (active) {
          clearAccessToken()
          setUser(null)
        }
      })
      .finally(() => {
        if (active) {
          setInitializing(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const loginWithPassword = useCallback(async (username: string, password: string) => {
    const authData = await login(username, password)
    setAccessToken(authData.accessToken)
    await refreshMe()
  }, [refreshMe])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      loginWithPassword,
      logout,
      refreshMe,
    }),
    [initializing, loginWithPassword, logout, refreshMe, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
