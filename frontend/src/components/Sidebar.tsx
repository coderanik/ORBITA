import { Radio, AlertTriangle, ShieldCheck, Activity, ChevronRight, PieChart, TrendingDown, Check, X, Zap, Globe, Shield, Layers } from 'lucide-react'
import type { AnomalyAlert, PlatformStats, ConjunctionAlert } from '../types'
import { getGraphUrl, acknowledgeAlert } from '../api/orbita'
import { useState } from 'react'

interface SidebarProps {
  anomalies: AnomalyAlert[];
  stats: PlatformStats | null;
  conjunctions: ConjunctionAlert[];
  realPositions: Record<string, {name: string, lat: number, lon: number, alt: number}>;
  selectedAnomaly: AnomalyAlert | null;
  setSelectedAnomaly: (anomaly: AnomalyAlert | null) => void;
  onAnomalyAcknowledged: (alertId: number) => void;
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string, value: string | number, icon: React.ElementType, color: string, sub?: string }) {
  return (
    <div className={`flex-1 p-3.5 rounded-xl border ${color} bg-gradient-to-br from-slate-900/80 to-slate-800/40`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-medium">{label}</span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <div className="text-xl font-semibold text-white tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function OrbitBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-10 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{count.toLocaleString()}</span>
    </div>
  )
}

export default function Sidebar({
  anomalies, stats, conjunctions, realPositions,
  selectedAnomaly, setSelectedAnomaly, onAnomalyAcknowledged
}: SidebarProps) {
  const [ackingId, setAckingId] = useState<number | null>(null)

  const handleAck = async (e: React.MouseEvent, alertId: number) => {
    e.stopPropagation()
    setAckingId(alertId)
    const ok = await acknowledgeAlert(alertId)
    if (ok) {
      onAnomalyAcknowledged(alertId)
      if (selectedAnomaly?.alert_id === alertId) setSelectedAnomaly(null)
    }
    setAckingId(null)
  }

  const totalObjects = stats?.total_tracked_objects ?? 0
  const critCount = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length
  const orbitData = stats?.objects_by_orbit_class ?? {}

  return (
    <div className="w-[420px] shrink-0 border-r border-white/[0.07] bg-[#070d1a]/80 backdrop-blur flex flex-col z-10 overflow-y-auto custom-scrollbar">

      {/* ─── Platform Overview ─── */}
      <div className="p-5 border-b border-white/5">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center gap-2">
          <Activity className="w-3 h-3 text-cyan-400" /> Platform Overview
        </h2>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <StatCard
            label="Tracked Objects"
            value={totalObjects > 0 ? totalObjects.toLocaleString() : '—'}
            icon={Globe}
            color="border-blue-500/20"
            sub="Live from ORBITA API"
          />
          <StatCard
            label="Active Models"
            value={stats?.active_models ?? 4}
            icon={ShieldCheck}
            color="border-emerald-500/20"
            sub="ATSAD v2 Online"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            label="Anomaly Alerts"
            value={anomalies.length}
            icon={AlertTriangle}
            color={critCount > 0 ? "border-red-500/30" : "border-amber-500/20"}
            sub={`${critCount} critical`}
          />
          <StatCard
            label="Conjunction Risk"
            value={conjunctions.length}
            icon={Zap}
            color={conjunctions.length > 0 ? "border-orange-500/30" : "border-slate-700"}
            sub="High/critical events"
          />
        </div>
      </div>

      {/* ─── Orbit Distribution ─── */}
      {Object.keys(orbitData).length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center gap-2">
            <Layers className="w-3 h-3 text-purple-400" /> Orbit Distribution
          </h2>
          <div className="space-y-2">
            {Object.entries(orbitData)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([orbit, count], i) => {
                const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500']
                return (
                  <OrbitBar
                    key={orbit}
                    label={orbit?.slice(0, 4) ?? '?'}
                    count={count}
                    total={totalObjects}
                    color={colors[i % colors.length]}
                  />
                )
              })}
          </div>
        </div>
      )}

      {/* ─── Object Type Breakdown ─── */}
      {stats && Object.keys(stats.objects_by_type).length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center gap-2">
            <Radio className="w-3 h-3 text-blue-400" /> Object Types
          </h2>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(stats.objects_by_type)
              .sort(([,a],[,b]) => b-a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/50 border border-white/5">
                  <span className="text-[11px] text-slate-400 capitalize">{type?.toLowerCase().replace(/_/g,' ')}</span>
                  <span className="text-[11px] font-mono text-white font-medium">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Active Conjunctions ─── */}
      {conjunctions.length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-orange-400" /> Conjunction Events
          </h2>
          <div className="space-y-2">
            {conjunctions.slice(0, 3).map(c => (
              <div key={c.conjunction_id} className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-orange-400">{c.risk_level}</span>
                  <span className="text-[10px] font-mono text-slate-500">{(c.collision_probability * 100).toFixed(2)}%</span>
                </div>
                <p className="text-xs text-slate-300">{c.primary_name} ↔ {c.secondary_name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Miss: {c.miss_distance_km?.toFixed(1)} km</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Anomaly Alerts ─── */}
      <div className="px-5 py-4 flex-1">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-red-400" /> Recent Detections
          </span>
          {critCount > 0 && (
            <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[9px] border border-red-500/20">
              {critCount} CRITICAL
            </span>
          )}
        </h2>

        <div className="flex flex-col gap-2">
          {anomalies.map((a) => {
            const satName = realPositions[a.object_id.toString()]?.name || `SAT-${a.object_id}`
            const isSelected = selectedAnomaly?.alert_id === a.alert_id
            const isCrit = a.severity === 'CRITICAL' || a.severity === 'RED'
            const isAcking = ackingId === a.alert_id

            return (
              <div
                key={a.alert_id}
                onClick={() => setSelectedAnomaly(isSelected ? null : a)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${
                  isSelected
                    ? 'ring-2 ring-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.01]'
                    : 'hover:bg-white/[0.03]'
                } ${isCrit ? 'border-red-500/25 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isCrit ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-[10px] font-bold tracking-wider ${isCrit ? 'text-red-400' : 'text-amber-400'}`}>
                        {a.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(a.detected_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 font-medium truncate">{satName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{a.subsystem} · {a.anomaly_type}</div>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={(e) => handleAck(e, a.alert_id)}
                      disabled={isAcking}
                      title="Acknowledge alert"
                      className={`shrink-0 p-1 rounded-md transition-all ${
                        isAcking
                          ? 'opacity-50 cursor-wait'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isAcking
                        ? <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-3 h-3" />
                      }
                    </button>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform shrink-0 ${isSelected ? 'rotate-90 text-blue-400' : ''}`} />
                  </div>
                </div>
              </div>
            )
          })}
          {anomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 font-medium">All Clear</p>
              <p className="text-[11px] text-slate-600 mt-0.5">No unacknowledged anomalies</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Anomaly Detail Panel ─── */}
      {selectedAnomaly && (
        <div className="border-t border-white/5 p-5 space-y-4 bg-[#060c18]/60">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold flex items-center gap-2">
              <Activity className="w-3 h-3" /> Anomaly Analysis
            </h2>
            <button onClick={() => setSelectedAnomaly(null)} className="text-slate-500 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-blue-500/20 bg-slate-900/60 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {realPositions[selectedAnomaly.object_id.toString()]?.name || `SAT-${selectedAnomaly.object_id}`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Model: ATSAD-Transformer-v2 · {selectedAnomaly.anomaly_type}</p>
              </div>
              <div className={`text-[10px] font-bold px-2 py-1 rounded border ${
                selectedAnomaly.severity === 'CRITICAL' || selectedAnomaly.severity === 'RED'
                  ? 'bg-red-500/15 text-red-400 border-red-500/25'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
              }`}>
                {selectedAnomaly.severity}
              </div>
            </div>

            {/* Subsystem & Detection Time */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <div className="px-2.5 py-2 bg-black/30 rounded-lg border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Subsystem</p>
                <p className="text-xs text-white font-medium mt-0.5">{selectedAnomaly.subsystem}</p>
              </div>
              <div className="px-2.5 py-2 bg-black/30 rounded-lg border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Detected</p>
                <p className="text-xs text-white font-medium mt-0.5">
                  {new Date(selectedAnomaly.detected_at).toLocaleString([], {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="px-2.5 py-2 bg-black/30 rounded-lg border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Object ID</p>
                <p className="text-xs font-mono text-cyan-300 font-medium mt-0.5">#{selectedAnomaly.object_id}</p>
              </div>
              <div className="px-2.5 py-2 bg-black/30 rounded-lg border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Alert ID</p>
                <p className="text-xs font-mono text-cyan-300 font-medium mt-0.5">#{selectedAnomaly.alert_id}</p>
              </div>
            </div>

            {/* Telemetry Drift Graph */}
            <div className="h-[110px] rounded-lg overflow-hidden border border-white/5 relative">
              <div className="absolute top-2 left-2 z-10 text-[9px] uppercase font-bold text-white/60 bg-black/60 px-2 py-0.5 rounded tracking-wider">
                ATSAD Metrics
              </div>
              <img src={getGraphUrl('atsad-metrics')} alt="ATSAD Metrics" className="w-full h-full object-cover mix-blend-screen opacity-85" />
            </div>

            {/* Acknowledge */}
            <button
              onClick={(e) => handleAck(e, selectedAnomaly.alert_id)}
              disabled={ackingId === selectedAnomaly.alert_id}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium border border-emerald-500/25 transition-all disabled:opacity-50"
            >
              {ackingId === selectedAnomaly.alert_id ? (
                <div className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Acknowledge Alert
            </button>
          </div>

          {/* Sidebar ML metric charts */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-2">
              <TrendingDown className="w-3 h-3 text-slate-400" /> Network Performance
            </h4>
            <div className="p-2 rounded-xl border border-white/5 bg-slate-900/50 relative aspect-[16/7] overflow-hidden group">
              <div className="absolute top-2 left-2 z-10 text-[9px] uppercase font-bold text-white/40 bg-black/40 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
                Training & Validation
              </div>
              <img src={getGraphUrl('accuracy-loss')} alt="Accuracy vs Loss" className="w-full h-full object-cover mix-blend-screen" />
            </div>
          </div>
        </div>
      )}

      {/* Default metric panels when nothing selected */}
      {!selectedAnomaly && (
        <div className="border-t border-white/5 p-5 space-y-3">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold flex items-center gap-2">
            <PieChart className="w-3 h-3 text-cyan-400" /> Network Performance History
          </h2>
          <div className="p-2 rounded-xl border border-white/5 bg-slate-900/50 relative aspect-[16/7] overflow-hidden group">
            <div className="absolute top-2 left-2 z-10 text-[9px] uppercase font-bold text-white/40 bg-black/40 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
              Training & Validation Curves
            </div>
            <img src={getGraphUrl('accuracy-loss')} alt="LSTM Model Accuracy and Loss" className="w-full h-full object-cover mix-blend-screen" />
          </div>
          <div className="p-2 rounded-xl border border-white/5 bg-slate-900/50 relative aspect-[4/3] overflow-hidden group">
            <div className="absolute top-2 left-2 z-10 text-[9px] uppercase font-bold text-white/40 bg-black/40 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
              Detection Confusion Matrix
            </div>
            <img src={getGraphUrl('confusion-matrix')} alt="Confusion Matrix" className="w-full h-full object-contain mix-blend-screen" />
          </div>
        </div>
      )}
    </div>
  )
}
