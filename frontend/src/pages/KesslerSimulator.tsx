import { useState } from 'react'
import Header from '../components/Header'
import { API_BASE_URL } from '../api/orbita'
import { useAuth } from '../contexts/useAuth'
import { Bomb, Play, Loader2, AlertTriangle, BarChart3, Satellite, Crosshair, Clock } from 'lucide-react'

interface SimResult {
  sim_id: string
  total_fragments: number
  propagated_fragments: number
  cascading_conjunctions: number
  top_conjunctions: { obj1: string; obj2: string; dist_km: number }[]
}

export default function KesslerSimulator() {
  const { token } = useAuth()
  const [targetId, setTargetId] = useState(25544)
  const [impactorId, setImpactorId] = useState(99999)
  const [targetMass, setTargetMass] = useState(420000)
  const [impactorMass, setImpactorMass] = useState(800)
  const [relVelocity, setRelVelocity] = useState(10.0)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{stage:string;progress:number}|null>(null)

  const startSim = async () => {
    setIsRunning(true); setResult(null); setError(null); setProgress(null)
    try {
      const res = await fetch(`${API_BASE_URL}/kessler/simulate`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ target_norad_id:targetId, impactor_norad_id:impactorId, target_mass_kg:targetMass, impactor_mass_kg:impactorMass, relative_velocity_km_s:relVelocity }),
      })
      const d = await res.json(); poll(d.task_id)
    } catch { setError('Failed to start'); setIsRunning(false) }
  }

  const poll = (id:string) => {
    const fn = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/kessler/simulations/${id}`, {headers:{'Authorization':`Bearer ${token}`}})
        const d = await r.json()
        if(d.status==='SUCCESS'){setResult(d.result);setIsRunning(false)}
        else if(d.status==='FAILURE'){setError(d.error);setIsRunning(false)}
        else{if(d.meta)setProgress(d.meta);setTimeout(fn,2000)}
      } catch{setError('Lost connection');setIsRunning(false)}
    }; fn()
  }

  const inputCls = "w-full bg-slate-900/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden font-['Inter'] pt-[4.5rem]">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="relative px-8 py-12 border-b border-white/[0.06] overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"/>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-wider uppercase mb-6">
              <Bomb className="w-3.5 h-3.5"/> Kessler Syndrome Simulator
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Collision Cascade Analysis</h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">Simulate catastrophic collisions using the NASA Standard Breakup Model.</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#0a1428]/70 rounded-2xl border border-white/8 p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Crosshair className="w-5 h-5 text-red-400"/> Collision Parameters</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-400 mb-1 block">Target NORAD ID</label><input type="number" value={targetId} onChange={e=>setTargetId(+e.target.value)} className={inputCls}/></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Impactor NORAD ID</label><input type="number" value={impactorId} onChange={e=>setImpactorId(+e.target.value)} className={inputCls}/></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Target Mass (kg)</label><input type="number" value={targetMass} onChange={e=>setTargetMass(+e.target.value)} className={inputCls}/></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Impactor Mass (kg)</label><input type="number" value={impactorMass} onChange={e=>setImpactorMass(+e.target.value)} className={inputCls}/></div>
              <div className="col-span-2"><label className="text-xs text-slate-400 mb-1 block">Relative Velocity (km/s)</label><input type="number" step="0.1" value={relVelocity} onChange={e=>setRelVelocity(+e.target.value)} className={inputCls}/></div>
            </div>
            <button onClick={startSim} disabled={isRunning} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 shadow-[0_4px_20px_rgba(239,68,68,0.3)] disabled:opacity-50">
              {isRunning ? <><Loader2 className="w-4 h-4 animate-spin"/> Running...</> : <><Play className="w-4 h-4"/> Launch Simulation</>}
            </button>
            {progress && <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4"><div className="flex justify-between text-xs mb-2"><span className="text-slate-400">{progress.stage.replace(/_/g,' ')}</span><span className="text-blue-400 font-mono">{progress.progress}%</span></div><div className="w-full h-1.5 bg-slate-800 rounded-full"><div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all" style={{width:`${progress.progress}%`}}/></div></div>}
            {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"><AlertTriangle className="w-4 h-4"/>{error}</div>}
          </div>

          <div className="bg-[#0a1428]/70 rounded-2xl border border-white/8 p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-400"/> Results</h2>
            {!result && !isRunning && <div className="flex flex-col items-center py-16 text-slate-500"><Satellite className="w-12 h-12 mb-4 opacity-30"/><p className="text-sm">No simulation run yet.</p></div>}
            {result && <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 text-center"><div className="text-2xl font-bold text-red-400">{result.total_fragments.toLocaleString()}</div><div className="text-[10px] text-slate-500 uppercase mt-1">Fragments</div></div>
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 text-center"><div className="text-2xl font-bold text-orange-400">{result.propagated_fragments.toLocaleString()}</div><div className="text-[10px] text-slate-500 uppercase mt-1">Propagated</div></div>
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 text-center"><div className="text-2xl font-bold text-amber-400">{result.cascading_conjunctions}</div><div className="text-[10px] text-slate-500 uppercase mt-1">Cascading</div></div>
              </div>
              {result.top_conjunctions.length>0 && <div className="bg-slate-950/50 rounded-xl border border-white/5 overflow-hidden"><table className="w-full text-xs"><thead><tr className="border-b border-white/5 text-slate-500 uppercase"><th className="px-4 py-2 text-left">Obj 1</th><th className="px-4 py-2 text-left">Obj 2</th><th className="px-4 py-2 text-right">Miss Dist</th></tr></thead><tbody>{result.top_conjunctions.map((c,i)=><tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="px-4 py-2 text-slate-300 font-mono">{c.obj1}</td><td className="px-4 py-2 text-slate-300 font-mono">{c.obj2}</td><td className="px-4 py-2 text-right text-amber-400 font-mono">{c.dist_km} km</td></tr>)}</tbody></table></div>}
              <div className="text-[10px] text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3"/>ID: {result.sim_id}</div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}
