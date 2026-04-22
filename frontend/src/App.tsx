import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Explorer from './pages/Explorer'
import Login from './pages/Login'
import Benchmark from './pages/Benchmark'
import KesslerSimulator from './pages/KesslerSimulator'
import AIInvestigation from './pages/AIInvestigation'
import Admin from './pages/Admin'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#04060b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">ORBITA-ATSAD</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/explorer" element={<ProtectedRoute><Explorer /></ProtectedRoute>} />
          <Route path="/benchmark" element={<ProtectedRoute><Benchmark /></ProtectedRoute>} />
          <Route path="/kessler" element={<ProtectedRoute><KesslerSimulator /></ProtectedRoute>} />
          <Route path="/investigate" element={<ProtectedRoute><AIInvestigation /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
