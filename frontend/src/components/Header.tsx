import { Activity } from 'lucide-react'

export default function Header() {
  return (
    <header className="h-16 shrink-0 border-b border-white/10 flex items-center px-6 justify-between bg-white/5 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <Activity className="text-blue-500 w-6 h-6" />
        <h1 className="text-xl font-bold tracking-widest text-white">ORBITA<span className="text-blue-500 font-light">ATSAD</span></h1>
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          System Nominal
        </div>
      </div>
    </header>
  )
}
