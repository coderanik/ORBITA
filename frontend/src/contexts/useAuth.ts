import { createContext, useContext } from 'react'

export interface User {
  username: string
  full_name?: string
  email?: string
}

export interface AuthContextType {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
