import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'
import type { User } from './types'

interface RegisterBody {
  email: string
  password: string
  profession: string
  firm_name?: string | null
}

interface AuthState {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (body: RegisterBody) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthState>({
  user: null,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (getToken()) {
      api.me()
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const r = await api.login({ email, password })
    setToken(r.token)
    setUser(r.user)
  }
  const register = async (body: RegisterBody) => {
    const r = await api.register(body)
    setToken(r.token)
    setUser(r.user)
  }
  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
