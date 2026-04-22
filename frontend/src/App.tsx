import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Explorer from './pages/Explorer'
import Login from './pages/Login'
import Benchmark from './pages/Benchmark'
import KesslerSimulator from './pages/KesslerSimulator'
import AIInvestigation from './pages/AIInvestigation'
import Admin from './pages/Admin'
import SystemOps from './pages/SystemOps'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'

type Role = 'viewer' | 'operator' | 'admin' | 'superadmin'

function roleLandingPath(role?: string): string {
  if (role === 'admin') return '/admin'
  if (role === 'superadmin') return '/superadmin'
  return '/'
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: Role[]
}) {
  const { token, user, isLoading } = useAuth()

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

  if (allowedRoles && !allowedRoles.includes((user?.role as Role) ?? 'viewer')) {
    return <Navigate to={roleLandingPath(user?.role)} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute allowedRoles={['viewer', 'operator', 'admin', 'superadmin']}><Dashboard /></ProtectedRoute>} />
          <Route path="/explorer" element={<ProtectedRoute allowedRoles={['operator', 'admin', 'superadmin']}><Explorer /></ProtectedRoute>} />
          <Route path="/benchmark" element={<ProtectedRoute allowedRoles={['operator', 'admin', 'superadmin']}><Benchmark /></ProtectedRoute>} />
          <Route path="/kessler" element={<ProtectedRoute allowedRoles={['viewer', 'operator', 'admin', 'superadmin']}><KesslerSimulator /></ProtectedRoute>} />
          <Route path="/investigate" element={<ProtectedRoute allowedRoles={['operator', 'admin', 'superadmin']}><AIInvestigation /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/catalog/space-objects" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/catalog/operators" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/catalog/missions" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/catalog/ground-stations" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/catalog/launch-vehicles" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/events/conjunctions" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/tle" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/admin/atsad" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Admin /></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SystemOps /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
