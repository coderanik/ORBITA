import { Radio, AlertTriangle, ShieldCheck, Activity, ChevronRight, PieChart, TrendingDown } from 'lucide-react'
import type { AnomalyAlert, PlatformStats } from '../types'
import { getGraphUrl } from '../api/orbita'

interface SidebarProps {
  anomalies: AnomalyAlert[];
  stats: PlatformStats | null;
  realPositions: Record<string, {name: string, lat: number, lon: number, alt: number}>;
  selectedAnomaly: AnomalyAlert | null;
  setSelectedAnomaly: (anomaly: AnomalyAlert | null) => void;
}

export default function Sidebar({ anomalies, stats, realPositions, selectedAnomaly, setSelectedAnomaly }: SidebarProps) {
  return (
    <div className="w-[450px] shrink-0 border-r border-white/10 bg-slate-950/80 backdrop-blur flex flex-col z-10 p-5 gap-6 overflow-y-auto custom-scrollbar">
      
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Platform Status</h2>
        
        <div className="flex gap-4">
           <div className="flex-1 p-4 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800">
             <div className="flex items-center justify-between mb-2">
               <span className="text-slate-400 text-sm">Active Models</span>
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
             </div>
             <div className="text-2xl font-light text-white">4 Online</div>
           </div>

           <div className="flex-1 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
             <div className="flex items-center justify-between mb-2">
               <span className="text-blue-400 text-sm">Objects Tracked</span>
               <Radio className="w-4 h-4 text-blue-400" />
             </div>
             <div className="text-2xl font-light text-white">{stats ? stats.total_tracked_objects.toLocaleString() : '---'}</div>
             <div className="text-xs text-blue-500 mt-1">Live from ORBITA API</div>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold flex justify-between items-center">
          <span>Recent Detections</span>
          <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[10px]">{anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length} Critical</span>
        </h2>
        
        <div className="flex flex-col gap-3">
          {anomalies.map((a) => {
            const satName = realPositions[a.object_id.toString()]?.name || `SAT-${a.object_id}`;
            const isSelected = selectedAnomaly?.alert_id === a.alert_id;
            
            return (
              <div 
                key={a.alert_id} 
                onClick={() => setSelectedAnomaly(isSelected ? null : a)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]' : 'hover:bg-white/5'
                } ${a.severity === 'CRITICAL' || a.severity === 'RED' ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.severity === 'CRITICAL' || a.severity === 'RED' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${a.severity === 'CRITICAL' || a.severity === 'RED' ? 'text-red-400' : 'text-amber-400'}`}>{a.severity}</span>
                      <span className="text-[10px] text-slate-500 opacity-80">{new Date(a.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-xs text-slate-300">
                      {satName} | Subsystem: {a.subsystem}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isSelected ? 'rotate-90 text-blue-400' : ''}`} />
                </div>
              </div>
            );
          })}
          {anomalies.length === 0 && (
             <div className="p-3 text-center text-xs text-slate-500 border border-slate-800 rounded-lg">No unacknowledged anomalies actively detected.</div>
          )}
        </div>
      </div>

      {selectedAnomaly ? (
        <div className="space-y-6 mt-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2 flex items-center gap-2">
             <Activity className="w-3 h-3" /> Anomaly Insights
          </h2>
          
          <div className="p-4 rounded-xl border border-blue-500/30 bg-slate-900/80 shadow-lg space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {realPositions[selectedAnomaly.object_id.toString()]?.name || `SAT-${selectedAnomaly.object_id}`} Analysis
                </h3>
                <p className="text-xs text-slate-400">Model: ATSAD-Transformer-v2</p>
              </div>
              <div className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded">
                PROBABILITY: 94.2%
              </div>
            </div>

            <div className="h-[120px] rounded-lg overflow-hidden border border-white/5 relative">
              <div className="absolute top-2 left-2 z-10 text-[10px] uppercase font-bold text-white/70 bg-black/60 px-2 py-0.5 rounded">Telemetry Drift</div>
              <img src={getGraphUrl('atsad-metrics')} alt="Anomaly Graph" className="w-full h-full object-cover mix-blend-screen opacity-80" />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <h4 className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                <TrendingDown className="w-3 h-3 text-red-400" /> Fragmentation Prediction
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Critical failure in the <span className="text-white">{selectedAnomaly.subsystem}</span> subsystem is likely to induce a catastrophic thermal runaway event within ~3.4 hours.
              </p>
              
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400 flex items-center gap-2"><PieChart className="w-3 h-3 text-yellow-500"/> Est. Debris Mass</span>
                  <span className="text-sm font-mono text-yellow-400 font-bold">~1,240 kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Trackable Fragments (&gt;10cm)</span>
                  <span className="text-xs font-mono text-white">~4,500</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-red-500 w-[85%] h-full rounded-full"></div>
                </div>
                <div className="text-[9px] text-right text-slate-500 mt-1 uppercase">85% Severity Rating</div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-6 mt-4 pb-6">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2 flex items-center gap-2">
             <Activity className="w-3 h-3 text-cyan-400"/> Network Performance Metrics
          </h2>
          
          <div className="space-y-4">
            <div className="p-2 rounded-xl border border-white/10 bg-slate-900 shadow-lg relative aspect-[14/6] overflow-hidden group">
              <div className="absolute top-2 left-2 z-10 text-[10px] uppercase font-bold text-white/50 bg-black/50 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Fig 3. Training & Validation Performance</div>
               <img src={getGraphUrl('accuracy-loss')} alt="LSTM Model Accuracy and Loss" className="w-full h-full object-cover mix-blend-screen" />
            </div>
            
            <div className="p-2 rounded-xl border border-white/10 bg-slate-900 shadow-lg relative aspect-[4/3] overflow-hidden group">
               <div className="absolute top-2 left-2 z-10 text-[10px] uppercase font-bold text-white/50 bg-black/50 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Fig 2. Detection Matrix</div>
               <img src={getGraphUrl('confusion-matrix')} alt="Confusion Matrix" className="w-full h-full object-contain mix-blend-screen" />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
