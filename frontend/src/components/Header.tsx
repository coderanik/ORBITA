import { Activity, Database, Radar, LogOut, Trophy, Clock, Bomb, BrainCircuit } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function Header() {
  const { user, logout } = useAuth()
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
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`

  return (
    <header className="h-14 shrink-0 border-b border-white/10 flex items-center px-6 justify-between bg-slate-950/90 backdrop-blur-xl z-50 relative">
      {/* Left gradient accent */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-blue-500/50 via-cyan-400/30 to-transparent" />

      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
            <Activity className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-white leading-none">
              ORBITA<span className="text-blue-400 font-light">ATSAD</span>
            </h1>
            <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase leading-none mt-0.5">Space Situational Awareness</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={navLinkClass}>
            <Radar className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/explorer" className={navLinkClass}>
            <Database className="w-4 h-4" /> Registry
          </NavLink>
          <NavLink to="/benchmark" className={navLinkClass}>
            <Trophy className="w-4 h-4" /> Benchmark
          </NavLink>
          <NavLink to="/kessler" className={navLinkClass}>
            <Bomb className="w-4 h-4" /> Kessler Sim
          </NavLink>
          <NavLink to="/investigate" className={navLinkClass}>
            <BrainCircuit className="w-4 h-4" /> AI Agent
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* UTC Clock */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
          <Clock className="w-3 h-3 text-slate-500" />
          {utcTime}
        </div>

        {/* System status */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Nominal
        </div>

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-300">
              {user.username?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <span className="text-slate-300 text-sm font-medium hidden sm:block">{user.username}</span>
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
