import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '../components/Header'
import GlobeView from '../components/GlobeView'
import { useTimeController } from '../hooks/useTimeController'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchUnacknowledgedAlerts, fetchPlatformStats, fetchConjunctionAlerts, fetchRealPositions, acknowledgeAlert, fetchTelemetryForObject, type TelemetryPoint, downloadMissionReport, scheduleManeuver, flagAlertForReview } from '../api/orbita'
import type { AnomalyAlert, PlatformStats, ConjunctionAlert } from '../types'
import { useAuth } from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { WifiOff, RefreshCw } from 'lucide-react'



export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [globeMode, setGlobeMode] = useState<'3d' | '2d'>('3d')
  const [showOrbits, setShowOrbits] = useState(false)
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [conjunctions, setConjunctions] = useState<ConjunctionAlert[]>([])
  const [realPositions, setRealPositions] = useState<Record<string, {name: string, lat: number, lon: number, alt: number}>>({})
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null)
  const [backendError, setBackendError] = useState(false)
  const [tleError, setTleError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [ackingId, setAckingId] = useState<number | null>(null)
  const [telemetryRows, setTelemetryRows] = useState<TelemetryPoint[]>([])
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [telemetryLoadedFor, setTelemetryLoadedFor] = useState<number | null>(null)
  const [quickActionBusy, setQuickActionBusy] = useState<'report' | 'maneuver' | 'review' | null>(null)
  const [quickActionMsg, setQuickActionMsg] = useState<string | null>(null)
  const [timelineFallbackNow] = useState(() => Date.now())

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
  const derivedTelemetryRows = selected ? [
    { parameter_name: 'alert_id', value: selected.alert_id, unit: '' },
    { parameter_name: 'subsystem', value: selected.subsystem, unit: '' },
    { parameter_name: 'anomaly_type', value: selected.anomaly_type, unit: '' },
    { parameter_name: 'severity', value: selected.severity, unit: '' },
    { parameter_name: 'confidence_score', value: selected.confidence_score ?? 'N/A', unit: '' },
    { parameter_name: 'detected_at', value: new Date(selected.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), unit: '' },
  ] : []
  const orbitEntries = Object.entries(stats?.objects_by_orbit_class ?? {})
  const orbitTotal = orbitEntries.reduce((acc, [, count]) => acc + count, 0)
  const conjunctionRisk = conjunctions.length
  const isViewer = (user?.role ?? 'viewer') === 'viewer'
  const canUseMapControls = isViewer || (user?.role === 'operator')
  const timelineEventsMs = useMemo(() => {
    const anomalyTimes = anomalies.map((a) => new Date(a.detected_at).getTime())
    const conjunctionTimes = conjunctions.map((c) => new Date(c.time_of_closest_approach).getTime())
    return [...anomalyTimes, ...conjunctionTimes].filter((t) => Number.isFinite(t))
  }, [anomalies, conjunctions])
  const timelineStartMs = useMemo(() => {
    if (timelineEventsMs.length === 0) return timelineFallbackNow - (12 * 60 * 60 * 1000)
    return Math.min(...timelineEventsMs) - (30 * 60 * 1000)
  }, [timelineEventsMs, timelineFallbackNow])
  const timelineEndMs = useMemo(() => {
    if (timelineEventsMs.length === 0) return timelineFallbackNow + (12 * 60 * 60 * 1000)
    return Math.max(...timelineEventsMs) + (30 * 60 * 1000)
  }, [timelineEventsMs, timelineFallbackNow])
  const timelineProgress = useMemo(() => {
    const span = Math.max(timelineEndMs - timelineStartMs, 1)
    return Math.min(100, Math.max(0, ((timeController.currentTime.getTime() - timelineStartMs) / span) * 100))
  }, [timeController.currentTime, timelineStartMs, timelineEndMs])
  const anomalyMarkerPositions = useMemo(
    () =>
      anomalies.map((a) => ({
        leftPct: Math.min(
          100,
          Math.max(
            0,
            ((new Date(a.detected_at).getTime() - timelineStartMs) / Math.max(timelineEndMs - timelineStartMs, 1)) * 100
          )
        ),
        isCritical: a.severity === 'CRITICAL' || a.severity === 'RED',
      })),
    [anomalies, timelineStartMs, timelineEndMs]
  )
  const timelineRangeLabel = `${new Date(timelineStartMs).toLocaleDateString([], { day: '2-digit', month: 'short' })} — ${new Date(timelineEndMs).toLocaleDateString([], { day: '2-digit', month: 'short' })}`

  const utcClock = timeController.currentTime.toUTCString().split(' ').slice(4, 5)[0] + ' UTC'

  const handleViewTelemetry = async () => {
    if (!selected) return
    setTelemetryLoading(true)
    const rows = await fetchTelemetryForObject(selected.object_id, 8)
    setTelemetryRows(rows)
    setTelemetryLoadedFor(selected.object_id)
    setTelemetryLoading(false)
  }

  const handleInvestigate = () => {
    if (!selected) return
    navigate(`/investigate?alertId=${selected.alert_id}`)
  }

  const handleExportReport = async () => {
    if (!selected) return
    setQuickActionBusy('report')
    setQuickActionMsg(null)
    const ok = await downloadMissionReport(selected.object_id)
    setQuickActionMsg(ok ? 'CDM report downloaded.' : 'Failed to export CDM report.')
    setQuickActionBusy(null)
  }

  const handleScheduleManeuver = async () => {
    if (!selected) return
    setQuickActionBusy('maneuver')
    setQuickActionMsg(null)
    const result = await scheduleManeuver(selected.object_id, {
      alertId: selected.alert_id,
      anomalyType: selected.anomaly_type,
      severity: selected.severity,
      subsystem: selected.subsystem,
      requestedBy: user?.username,
    })
    setQuickActionMsg(
      result.ok
        ? `Maneuver #${result.item?.maneuver_id ?? '—'} scheduled (PLANNED) at ${new Date(result.item?.planned_time ?? Date.now()).toLocaleString()}.`
        : 'Failed to schedule maneuver.'
    )
    setQuickActionBusy(null)
  }

  const handleFlagReview = async () => {
    if (!selected) return
    setQuickActionBusy('review')
    setQuickActionMsg(null)
    const ok = await flagAlertForReview(selected.alert_id)
    setQuickActionMsg(ok ? 'Alert flagged for review.' : 'Failed to flag alert for review.')
    setQuickActionBusy(null)
  }

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

          {!isViewer && (
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
          )}
        </div>

        <div className="flex-1 relative overflow-hidden">
          <GlobeView
            anomalies={anomalies}
            realPositions={realPositions}
            selectedAnomaly={selected}
            setSelectedAnomaly={setSelectedAnomaly}
            tleError={tleError}
            lastUpdated={lastUpdated}
            currentTime={timeController.currentTime}
            hideOverlays
            enableDayNight={isViewer}
            sceneMode={globeMode}
            showOrbits={showOrbits}
            autoRotateEarth={isViewer}
            showRotationStats={false}
          />

          <div className="absolute top-3 left-3 flex items-start gap-2">
            <div className="bg-[#060d1a]/85 border border-white/[0.1] rounded-lg p-2.5 backdrop-blur">
              <div className="text-[10px] font-medium text-slate-300 mb-1">Live constellation</div>
              <div className="text-[10px] text-slate-400">Nominal ({Math.max(totalObjects - anomalies.length, 0)})</div>
              <div className="text-[10px] text-amber-300">Warning ({warningCount})</div>
              <div className="text-[10px] text-red-300">Critical ({critCount})</div>
              <div className="text-[10px] text-cyan-300">Selected</div>
            </div>

            <div className="flex items-center gap-1 bg-[#040810]/80 border border-white/[0.08] rounded-md p-0.5">
              {isViewer && globeMode === '3d' && (
                <span className="px-2 py-1 text-[10px] text-slate-400 whitespace-nowrap">
                  Earth rotation: 1670 km/h (0.0042 deg/s)
                </span>
              )}
              <button
                onClick={() => canUseMapControls && setGlobeMode('3d')}
                disabled={!canUseMapControls}
                className={`px-2 py-1 text-[10px] rounded ${globeMode === '3d' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'} ${!canUseMapControls ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                3D Globe
              </button>
              <button
                onClick={() => canUseMapControls && setGlobeMode('2d')}
                disabled={!canUseMapControls}
                className={`px-2 py-1 text-[10px] rounded ${globeMode === '2d' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'} ${!canUseMapControls ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                2D Map
              </button>
              <button
                onClick={() => canUseMapControls && setShowOrbits((v) => !v)}
                disabled={!canUseMapControls}
                className={`px-2 py-1 text-[10px] rounded ${showOrbits ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'} ${!canUseMapControls ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Orbits
              </button>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 bg-[#060d1a]/85 border border-white/[0.1] rounded-lg p-2.5 backdrop-blur">
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
                <button
                  className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-blue-500/25 bg-blue-500/15 text-blue-300 disabled:opacity-50"
                  disabled={!selected || telemetryLoading}
                  onClick={handleViewTelemetry}
                >
                  {telemetryLoading ? 'Loading telemetry...' : 'View telemetry'}
                </button>
                <button
                  className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-blue-500/25 bg-blue-500/15 text-blue-300 disabled:opacity-50"
                  disabled={!selected}
                  onClick={handleInvestigate}
                >
                  Investigate
                </button>
                <button
                  className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05]"
                  disabled={!selected || ackingId === selected.alert_id}
                  onClick={() => selected && handleAck(selected.alert_id)}
                >
                  {selected && ackingId === selected.alert_id ? 'Acknowledging...' : 'Acknowledge'}
                </button>
              </div>
              {telemetryLoadedFor === selected?.object_id && (
                <div className="mt-3 border-t border-white/[0.08] pt-2 space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {telemetryRows.length === 0 ? (
                    <>
                      <div className="text-[10px] text-amber-300">No raw telemetry rows found. Showing derived alert snapshot.</div>
                      {derivedTelemetryRows.map((row, idx) => (
                        <div key={idx} className="text-[10px] text-slate-300 flex justify-between gap-2">
                          <span className="truncate">{row.parameter_name}</span>
                          <span className="font-mono text-cyan-300 shrink-0">
                            {String(row.value)}{row.unit ? ` ${row.unit}` : ''}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : telemetryRows.map((row) => (
                    <div key={row.telemetry_id} className="text-[10px] text-slate-300 flex justify-between gap-2">
                      <span className="truncate">{row.parameter_name}</span>
                      <span className="font-mono text-cyan-300 shrink-0">
                        {row.value}{row.unit ? ` ${row.unit}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[11px] font-medium text-slate-400 mt-4 mb-2">Space weather</div>
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3 space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-slate-500">Kp index</span><span className="text-amber-300">3.0 (G0)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">F10.7 flux</span><span className="text-slate-300">148.2</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Solar flares</span><span className="text-emerald-300">None</span></div>
            </div>

            {!isViewer && (
              <>
                <div className="text-[11px] font-medium text-slate-400 mt-4 mb-2">Quick actions</div>
                <div className="space-y-1.5">
                  <button
                    className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] disabled:opacity-50"
                    disabled={!selected || quickActionBusy !== null}
                    onClick={handleExportReport}
                  >
                    {quickActionBusy === 'report' ? 'Exporting...' : 'Export CDM report'}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] disabled:opacity-50"
                    disabled={!selected || quickActionBusy !== null}
                    onClick={handleScheduleManeuver}
                  >
                    {quickActionBusy === 'maneuver' ? 'Scheduling...' : 'Schedule maneuver'}
                  </button>
                  <button
                    className="w-full text-left px-2.5 py-1.5 text-[11px] rounded border border-red-500/25 bg-red-500/10 text-red-300 disabled:opacity-50"
                    disabled={!selected || quickActionBusy !== null}
                    onClick={handleFlagReview}
                  >
                    {quickActionBusy === 'review' ? 'Flagging...' : 'Flag for review'}
                  </button>
                </div>
                {quickActionMsg && <div className="mt-2 text-[10px] text-slate-400">{quickActionMsg}</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {isViewer && (
        <div className="h-11 border-t border-white/[0.06] bg-[#040810] flex items-center gap-3 px-3.5 shrink-0">
          <div className="text-[11px] font-mono text-slate-500">{utcClock.replace(' UTC', '')}</div>
          <div className="flex items-center gap-1">
            <button
              className="w-6 h-6 rounded bg-white/[0.06] text-slate-400 text-xs"
              onClick={() => timeController.jumpBackward(60)}
              title="Back 1 minute"
            >
              ⏮
            </button>
            <button className="w-6 h-6 rounded bg-blue-500/20 text-blue-300 text-xs" onClick={timeController.togglePlay}>
              {timeController.isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="w-6 h-6 rounded bg-white/[0.06] text-slate-400 text-xs"
              onClick={() => timeController.jumpForward(60)}
              title="Forward 1 minute"
            >
              ⏭
            </button>
          </div>
          <div className="flex-1 h-[3px] rounded bg-white/[0.08] relative">
            <div className="h-full bg-blue-500 rounded" style={{ width: `${timelineProgress}%` }} />
            <input
              type="range"
              min={timelineStartMs}
              max={timelineEndMs}
              value={timeController.currentTime.getTime()}
              onChange={(e) => timeController.setTime(new Date(Number(e.target.value)))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Timeline scrubber"
            />
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 border border-blue-800"
              style={{ left: `${timelineProgress}%` }}
            />
            {anomalyMarkerPositions.map((m, idx) => (
              <div
                key={idx}
                className={`absolute -top-[3px] w-[3px] h-[9px] rounded ${m.isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ left: `${m.leftPct}%` }}
              />
            ))}
          </div>
          <button
            className="text-[10px] text-amber-300 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded"
            onClick={timeController.cycleSpeed}
            title="Cycle playback speed"
          >
            {timeController.playbackSpeed}×
          </button>
          <div className="text-[11px] font-mono text-slate-500 text-right min-w-[92px]">{timelineRangeLabel}</div>
        </div>
      )}
    </div>
  )
}
