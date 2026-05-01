import { createContext } from 'react'
import type { CurrentUser } from '../types'

export type AuthContextValue = {
  user: CurrentUser | null
  initializing: boolean
  loginWithPassword: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
