import React, { createContext, useState, useEffect, useContext } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"

interface User {
  username: string
  full_name?: string
  email?: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('orbita_token'))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          // Verify token
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (res.ok) {
            const userData = await res.json()
            setUser(userData)
          } else {
            console.warn("Session expired or invalid token.")
            localStorage.removeItem('orbita_token')
            setToken(null)
            setUser(null)
          }
        } catch (e) {
          console.error("Auth check failed", e)
        }
      }
      setIsLoading(false)
    }
    
    initAuth()
  }, [token])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('orbita_token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('orbita_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
