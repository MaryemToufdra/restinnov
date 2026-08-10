import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, setStoredToken, type Role } from '../api'

export interface AuthUser {
  id: number
  nom: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  login: (telephone: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const USER_STORAGE_KEY = 'auth_user'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(USER_STORAGE_KEY)
      setUser(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = async (telephone: string, password: string) => {
    const result = await apiLogin({ telephone, password })
    setStoredToken(result.token)
    const authUser: AuthUser = { id: result.id, nom: result.nom, role: result.role }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  const logout = async () => {
    await apiLogout()
    localStorage.removeItem(USER_STORAGE_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
