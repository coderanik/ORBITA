import { Activity, Database, Radar, LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 shrink-0 border-b border-white/10 flex items-center px-6 justify-between bg-white/5 backdrop-blur-md z-10">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-500 w-6 h-6" />
          <h1 className="text-xl font-bold tracking-widest text-white">ORBITA<span className="text-blue-500 font-light">ATSAD</span></h1>
        </div>
        
        <nav className="flex items-center gap-6 text-sm font-medium">
          <NavLink 
            to="/" 
            className={({isActive}) => `flex items-center gap-2 px-3 py-1 border-b-2 transition-colors ${isActive ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            <Radar className="w-4 h-4" /> Telemetry Dashboard
          </NavLink>
          <NavLink 
            to="/explorer" 
            className={({isActive}) => `flex items-center gap-2 px-3 py-1 border-b-2 transition-colors ${isActive ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            <Database className="w-4 h-4" /> Registry Explorer
          </NavLink>
        </nav>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          System Nominal
        </div>
        
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.username}
            </span>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
