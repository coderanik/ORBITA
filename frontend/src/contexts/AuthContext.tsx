import React, { useState, useEffect } from 'react'
import { AuthContext, type User } from './useAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"

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
