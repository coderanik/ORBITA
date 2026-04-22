import { Activity, Database, Radar, LogOut, Trophy, Clock, Bomb, BrainCircuit, Shield } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useState, useEffect } from 'react'

export default function Header() {
  const { user, logout } = useAuth()
  const role = user?.role ?? 'viewer'
  const canAccessOps = role === 'operator' || role === 'admin' || role === 'superadmin'
  const canAccessAdmin = role === 'admin' || role === 'superadmin'
  const isSuperAdmin = role === 'superadmin'
  const location = useLocation()
  const inSuperAdminView = isSuperAdmin && location.pathname.startsWith('/superadmin')
  const navigate = useNavigate()
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setUtcTime(now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
      isActive
        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`

  const roleBadgeClass =
    role === 'superadmin'
      ? 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10'
      : role === 'admin'
        ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
        : role === 'operator'
          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
          : 'text-slate-300 border-slate-500/30 bg-slate-500/10'

  return (
    <header className="fixed top-3 left-4 right-4 h-14 flex items-center px-4 justify-between bg-slate-950/70 backdrop-blur-2xl z-50 rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)] ring-1 ring-white/[0.05]">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-full" />

      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
            <Activity className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-bold tracking-widest text-white leading-none">
              ORBITA<span className="text-blue-400 font-light">ATSAD</span>
            </h1>
            <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase leading-none mt-0.5">Space Situational Awareness</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar pr-2">
          {inSuperAdminView ? (
            <>
              <NavLink to="/superadmin" className={navLinkClass}>
                <Shield className="w-4 h-4" /> Super Admin
              </NavLink>
              <NavLink to="/explorer" className={navLinkClass}>
                <Database className="w-4 h-4" /> Database
                <span className="ml-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  Read-only
                </span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Radar className="w-4 h-4" /> Dashboard
              </NavLink>
              {canAccessOps && (
                <NavLink to="/explorer" className={navLinkClass}>
                  <Database className="w-4 h-4" /> Registry
                </NavLink>
              )}
              {canAccessOps && (
                <NavLink to="/benchmark" className={navLinkClass}>
                  <Trophy className="w-4 h-4" /> Benchmark
                </NavLink>
              )}
              <NavLink to="/kessler" className={navLinkClass}>
                <Bomb className="w-4 h-4" /> Kessler Sim
              </NavLink>
              {canAccessOps && (
                <NavLink to="/investigate" className={navLinkClass}>
                  <BrainCircuit className="w-4 h-4" /> AI Agent
                </NavLink>
              )}
              {canAccessAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  <Shield className="w-4 h-4" /> Admin
                </NavLink>
              )}
              {isSuperAdmin && (
                <NavLink to="/superadmin" className={navLinkClass}>
                  <Shield className="w-4 h-4" /> Super Admin
                </NavLink>
              )}
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-2">
        {/* UTC Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
          <Clock className="w-3 h-3 text-slate-500" />
          {utcTime}
        </div>

        {/* System status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Nominal
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-300">
              {user.username?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-300 text-sm font-medium">{user.username}</span>
              <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${roleBadgeClass}`}>
                {role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
