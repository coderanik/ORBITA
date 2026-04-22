import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import GlobeView from '../components/GlobeView'
import { useTimeController } from '../hooks/useTimeController'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchUnacknowledgedAlerts, fetchPlatformStats, fetchConjunctionAlerts, fetchRealPositions, acknowledgeAlert } from '../api/orbita'
import type { AnomalyAlert, PlatformStats, ConjunctionAlert } from '../types'
import { WifiOff, RefreshCw } from 'lucide-react'



export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [conjunctions, setConjunctions] = useState<ConjunctionAlert[]>([])
  const [realPositions, setRealPositions] = useState<Record<string, {name: string, lat: number, lon: number, alt: number}>>({})
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null)
  const [backendError, setBackendError] = useState(false)
  const [tleError, setTleError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [ackingId, setAckingId] = useState<number | null>(null)

  // Phase 4: Time controller for timeline scrubbing
  const timeController = useTimeController()

  // Phase 2: WebSocket connection for real-time streaming
  const { lastMessage } = useWebSocket()

  const loadData = useCallback(async () => {
    try {
      const [alertsData, statsData, conjData] = await Promise.all([
        fetchUnacknowledgedAlerts(),
        fetchPlatformStats(),
        fetchConjunctionAlerts(),
      ])
      setAnomalies(alertsData)
      setStats(statsData)
      setConjunctions(conjData)
      setBackendError(statsData === null && alertsData.length === 0)
      setLastUpdated(new Date())
    } catch {
      setBackendError(true)
    }
  }, [])

  const fetchPositions = useCallback(async () => {
    const data = await fetchRealPositions()
    if (Object.keys(data).length > 0) {
      setRealPositions(data)
      setTleError(false)
    } else {
      setTleError(true)
    }
  }, [])

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return
    
    if (lastMessage.type === 'CONJUNCTION_ALERT') {
      // Refresh conjunctions when a new alert arrives
      fetchConjunctionAlerts().then(setConjunctions)
    } else if (lastMessage.type === 'ANOMALY_DETECTED') {
      // Refresh anomalies
      fetchUnacknowledgedAlerts().then(setAnomalies)
    } else if (lastMessage.type === 'TLE_UPDATED') {
      void (async () => { await fetchPositions() })()
    }
  }, [lastMessage, fetchPositions])

  useEffect(() => {
    const init = async () => {
      await loadData()
      await fetchPositions()
    }
    init()
    const interval = setInterval(loadData, 5000)
    const posInterval = setInterval(fetchPositions, 3000)
    return () => {
      clearInterval(interval)
      clearInterval(posInterval)
    }
  }, [loadData, fetchPositions])

  const handleAnomalyAcknowledged = (alertId: number) => {
    setAnomalies(prev => prev.filter(a => a.alert_id !== alertId))
  }

  const handleAck = async (alertId: number) => {
    setAckingId(alertId)
    const ok = await acknowledgeAlert(alertId)
    if (ok) {
      handleAnomalyAcknowledged(alertId)
      if (selectedAnomaly?.alert_id === alertId) {
        setSelectedAnomaly(null)
      }
    }
    setAckingId(null)
  }

  const totalObjects = stats?.total_tracked_objects ?? 0
  const activeModels = stats?.active_models ?? 4
  const critCount = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length
  const warningCount = Math.max(anomalies.length - critCount, 0)
  const selected = selectedAnomaly ?? anomalies[0] ?? null
  const selectedName = selected ? (realPositions[selected.object_id.toString()]?.name ?? `SAT-${selected.object_id}`) : 'No Selection'
  const orbitEntries = Object.entries(stats?.objects_by_orbit_class ?? {})
  const orbitTotal = orbitEntries.reduce((acc, [, count]) => acc + count, 0)
  const conjunctionRisk = conjunctions.length

  const utcClock = new Date().toUTCString().split(' ').slice(4, 5)[0] + ' UTC'

  return (
    <div className="h-screen w-full flex flex-col bg-[#060d1a] text-slate-200 overflow-hidden pt-[4.5rem]">
      <Header />

      {/* Backend error banner */}
      {backendError && (
        <div className="shrink-0 bg-red-500/15 border-b border-red-500/25 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <WifiOff className="w-4 h-4" />
            <span className="font-medium">Backend connection failed.</span>
            <span className="text-red-400/70">Check that the FastAPI server is running on port 8000.</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* TLE position service warning */}
      {tleError && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 text-amber-400/80 text-xs">
          <WifiOff className="w-3 h-3" />
          TLE position service unavailable — globe showing static positions only.
        </div>
      )}



      <div className="flex-1 flex relative overflow-hidden">
        <div className="w-[220px] border-r border-white/[0.06] overflow-y-auto">
          <div className="p-3 border-b border-white/[0.05]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Platform</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2.5 py-2 rounded-md border border-white/[0.05] bg-white/[0.03]">
                <span className="text-[11px] text-slate-400">Tracked objects</span>
                <span className="text-[13px] font-mono text-emerald-400">{totalObjects}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-2 rounded-md border border-white/[0.05] bg-white/[0.03]">
                <span className="text-[11px] text-slate-400">Active models</span>
                <span className="text-[13px] font-mono text-slate-100">{activeModels}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-2 rounded-md border border-white/[0.05] bg-white/[0.03]">
                <span className="text-[11px] text-slate-400">Anomaly alerts</span>
                <span className="text-[13px] font-mono text-amber-400">{anomalies.length}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-2 rounded-md border border-white/[0.05] bg-white/[0.03]">
                <span className="text-[11px] text-slate-400">Conjunction risk</span>
                <span className="text-[13px] font-mono text-red-400">{conjunctionRisk}</span>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-white/[0.05]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Orbit distribution</div>
            <div className="space-y-1.5">
              {orbitEntries.slice(0, 4).map(([orbit, count], idx) => {
                const pct = orbitTotal > 0 ? Math.max(6, Math.round((count / orbitTotal) * 100)) : 0
                const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-violet-500', 'bg-emerald-500']
                return (
                  <div key={orbit} className="flex items-center gap-2">
                    <span className="w-7 text-[10px] text-slate-400">{orbit.slice(0, 3)}</span>
                    <div className="flex-1 h-1 bg-white/[0.08] rounded overflow-hidden">
                      <div className={`h-full ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-5 text-right text-[10px] font-mono text-slate-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-3">
            <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
              Recent detections <span className="float-right text-red-400">{critCount} critical</span>
            </div>
            <div className="space-y-1.5">
              {anomalies.slice(0, 8).map((a) => {
                const isCrit = a.severity === 'CRITICAL' || a.severity === 'RED'
                const satName = realPositions[a.object_id.toString()]?.name ?? `SAT-${a.object_id}`
                const isSelected = selectedAnomaly?.alert_id === a.alert_id
                return (
                  <div
                    key={a.alert_id}
                    onClick={() => setSelectedAnomaly(a)}
                    className={`p-2 rounded-md border-l-2 cursor-pointer ${
                      isCrit ? 'border-red-500 bg-red-500/10' : 'border-amber-500 bg-amber-500/10'
                    } ${isSelected ? 'ring-1 ring-cyan-400' : ''}`}
                  >
                    <span className={`inline-block mb-1 px-1.5 py-0.5 text-[9px] rounded ${isCrit ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {a.severity}
                    </span>
                    <div className="text-[11px] font-medium text-slate-100 truncate">{satName}</div>
                    <div className="text-[10px] text-slate-400">{a.anomaly_type} · {new Date(a.detected_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <GlobeView
            anomalies={anomalies}
            realPositions={realPositions}
            selectedAnomaly={selectedAnomaly}
            setSelectedAnomaly={setSelectedAnomaly}
            tleError={tleError}
            lastUpdated={lastUpdated}
            currentTime={timeController.currentTime}
            hideOverlays
          />

          <div className="absolute top-2.5 right-2.5 flex gap-1 bg-[#040810]/80 border border-white/[0.08] rounded-md p-0.5">
            <button className="px-2 py-1 text-[10px] rounded bg-blue-500/20 text-blue-300">3D Globe</button>
            <button className="px-2 py-1 text-[10px] rounded text-slate-500">2D Map</button>
            <button className="px-2 py-1 text-[10px] rounded text-slate-500">Orbits</button>
          </div>

          <div className="absolute top-3 left-3 bg-[#060d1a]/85 border border-white/[0.1] rounded-lg p-2.5 backdrop-blur">
            <div className="text-[10px] font-medium text-slate-300 mb-1">Live constellation</div>
            <div className="text-[10px] text-slate-400">Nominal ({Math.max(totalObjects - anomalies.length, 0)})</div>
            <div className="text-[10px] text-amber-300">Warning ({warningCount})</div>
            <div className="text-[10px] text-red-300">Critical ({critCount})</div>
            <div className="text-[10px] text-cyan-300">Selected</div>
          </div>

          <div className="absolute bottom-3 right-3 bg-[#060d1a]/85 border border-white/[0.1] rounded-lg p-2.5 backdrop-blur">
            <div className="text-[10px] font-medium text-slate-300 mb-1">ORBITA API · live</div>
            <div className="text-[10px] text-emerald-300">WebSocket OK</div>
          </div>
        </div>

        <div className="w-[230px] border-l border-white/[0.06] overflow-y-auto">
          <div className="p-3">
            <div className="text-[11px] font-medium text-slate-400 mb-2">Selected object</div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
              <div className="text-[12px] font-medium text-slate-100 mb-2">{selectedName}</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">Object ID</span><span className="text-slate-300 font-mono">{selected?.object_id ?? 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subsystem</span><span className="text-slate-300">{selected?.subsystem ?? 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`${selected && (selected.severity === 'CRITICAL' || selected.severity === 'RED') ? 'text-red-300' : 'text-amber-300'}`}>{selected?.severity ?? 'NOMINAL'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Alert</span><span className="text-slate-300">{selected?.anomaly_type ?? 'None'}</span></div>
              </div>
              <div className="mt-3 space-y-1.5">
                <button className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-blue-500/25 bg-blue-500/15 text-blue-300">View telemetry</button>
                <button className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-blue-500/25 bg-blue-500/15 text-blue-300">Investigate</button>
                <button
                  className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05]"
                  disabled={!selected || ackingId === selected.alert_id}
                  onClick={() => selected && handleAck(selected.alert_id)}
                >
                  {selected && ackingId === selected.alert_id ? 'Acknowledging...' : 'Acknowledge'}
                </button>
              </div>
            </div>

            <div className="text-[11px] font-medium text-slate-400 mt-4 mb-2">Space weather</div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3 space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Kp index</span><span className="text-amber-300">3.0 (G0)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">F10.7 flux</span><span className="text-slate-300">148.2</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Solar flares</span><span className="text-emerald-300">None</span></div>
            </div>

            <div className="text-[11px] font-medium text-slate-400 mt-4 mb-2">Quick actions</div>
            <div className="space-y-1.5">
              <button className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05]">Export CDM report</button>
              <button className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05]">Schedule maneuver</button>
              <button className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-red-500/25 bg-red-500/10 text-red-300">Flag for review</button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-11 border-t border-white/[0.06] bg-[#040810] flex items-center gap-3 px-3.5 shrink-0">
        <div className="text-[11px] font-mono text-slate-500">{utcClock.replace(' UTC', '')}</div>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 rounded bg-white/[0.06] text-slate-400 text-xs">⏮</button>
          <button className="w-6 h-6 rounded bg-blue-500/20 text-blue-300 text-xs" onClick={timeController.togglePlay}>
            {timeController.isPlaying ? '⏸' : '▶'}
          </button>
          <button className="w-6 h-6 rounded bg-white/[0.06] text-slate-400 text-xs">⏭</button>
        </div>
        <div className="flex-1 h-[3px] rounded bg-white/[0.08] relative">
          <div className="h-full w-[38%] bg-blue-500 rounded" />
          <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 border border-blue-800" />
          <div className="absolute left-[42%] -top-[3px] w-[3px] h-[9px] rounded bg-amber-500" />
          <div className="absolute left-[61%] -top-[3px] w-[3px] h-[9px] rounded bg-red-500" />
        </div>
        <div className="text-[10px] text-amber-300 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded">1×</div>
        <div className="text-[11px] font-mono text-slate-500 text-right min-w-[92px]">22 Apr — 23 Apr</div>
      </div>
    </div>
  )
}
