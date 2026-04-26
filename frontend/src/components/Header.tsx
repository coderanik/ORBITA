import { Database, Radar, LogOut, Trophy, Clock, Bomb, BrainCircuit, Shield, Settings, ChevronDown } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useState, useEffect, useRef } from 'react'

type TimeFormat = 'utc' | 'local'
const PREFERENCES_STORAGE_KEY = 'orbita-user-preferences'

function readTimeFormat(): TimeFormat {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return 'utc'
    const parsed = JSON.parse(raw) as { timeFormat?: TimeFormat }
    return parsed.timeFormat === 'local' ? 'local' : 'utc'
  } catch {
    return 'utc'
  }
}

export default function Header() {
  const { user, logout } = useAuth()
  const role = user?.role ?? 'viewer'
  const isAdmin = role === 'admin'
  const canAccessOps = role === 'operator' || role === 'admin' || role === 'superadmin'
  const canAccessRegistry = role === 'admin' || role === 'superadmin'
  const canAccessAdmin = role === 'admin' || role === 'superadmin'
  const isSuperAdmin = role === 'superadmin'
  const navigate = useNavigate()
  const [clockText, setClockText] = useState('')
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => readTimeFormat())
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePreferencesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ timeFormat?: TimeFormat }>
      if (customEvent.detail?.timeFormat === 'local') {
        setTimeFormat('local')
      } else if (customEvent.detail?.timeFormat === 'utc') {
        setTimeFormat('utc')
      } else {
        setTimeFormat(readTimeFormat())
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PREFERENCES_STORAGE_KEY) {
        setTimeFormat(readTimeFormat())
      }
    }

    window.addEventListener('orbita:preferences-updated', handlePreferencesUpdated as EventListener)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('orbita:preferences-updated', handlePreferencesUpdated as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      if (timeFormat === 'local') {
        setClockText(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' LOCAL')
      } else {
        setClockText(now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC')
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timeFormat])

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
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-black/40 border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.3)] overflow-hidden">
            <img src="/logo.png" alt="ORBITA Logo" className="w-full h-full object-cover scale-110" />
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
          {isSuperAdmin ? (
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
          ) : isAdmin ? (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Radar className="w-4 h-4" /> Dashboard
              </NavLink>
              <NavLink to="/admin" className={navLinkClass}>
                <Shield className="w-4 h-4" /> Admin
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Radar className="w-4 h-4" /> Dashboard
              </NavLink>
              {canAccessRegistry && (
                <NavLink to="/explorer" className={navLinkClass}>
                  <Database className="w-4 h-4" /> Registry
                </NavLink>
              )}
              {canAccessOps && (
                <NavLink to="/benchmark" className={navLinkClass}>
                  <Trophy className="w-4 h-4" /> ATSAD Bench
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
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-2">
        {/* User clock (UTC/Local by preference) */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
          <Clock className="w-3 h-3 text-slate-500" />
          {clockText}
        </div>

        {/* System status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Nominal
        </div>

        {/* User */}
        {user && (
          <div className="relative flex items-center pl-2 border-l border-white/10" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${roleBadgeClass} hover:opacity-80`}
            >
              <span className="text-xs uppercase tracking-widest font-bold">{role}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-48 rounded-xl bg-slate-900 border border-white/[0.08] shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-white/[0.05] mb-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{role}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/settings') // Assuming a settings route exists, or just a placeholder
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
