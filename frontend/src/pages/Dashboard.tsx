import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import GlobeView from '../components/GlobeView'
import TimelineSlider from '../components/TimelineSlider'
import { useTimeController } from '../hooks/useTimeController'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchUnacknowledgedAlerts, fetchPlatformStats, fetchConjunctionAlerts, fetchRealPositions } from '../api/orbita'
import type { AnomalyAlert, PlatformStats, ConjunctionAlert } from '../types'
import { WifiOff, RefreshCw, Globe, AlertTriangle, Zap, Layers, Radio } from 'lucide-react'

function KpiCard({
  label, value, sub, icon: Icon, color, pulse
}: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; pulse?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 p-4 rounded-2xl border ${color} bg-gradient-to-br from-slate-900/60 to-slate-800/30 backdrop-blur-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${color.replace('border-', 'from-').replace('/20', '/20')} from-slate-800 to-slate-700 border border-white/5`}>
          <Icon className="w-4 h-4 opacity-80" />
        </div>
        {pulse && <span className="w-2 h-2 rounded-full bg-current animate-pulse opacity-60" />}
      </div>
      <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-2xl" />
    </div>
  )
}

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [conjunctions, setConjunctions] = useState<ConjunctionAlert[]>([])
  const [realPositions, setRealPositions] = useState<Record<string, {name: string, lat: number, lon: number, alt: number}>>({})
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null)
  const [backendError, setBackendError] = useState(false)
  const [tleError, setTleError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Phase 4: Time controller for timeline scrubbing
  const timeController = useTimeController()

  // Phase 2: WebSocket connection for real-time streaming
  const { isConnected, lastMessage } = useWebSocket()

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

  const critCount = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length
  const orbitClasses = stats ? Object.keys(stats.objects_by_orbit_class).length : 0

  // Timeline epoch range: 12 hours around now
  const now = new Date()
  const epochStart = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  const epochEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000)

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden">
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

      {/* KPI Strip */}
      <div className="shrink-0 flex gap-3 px-6 py-3 border-b border-white/[0.06] bg-[#04060b]">
        <KpiCard
          label="Tracked Objects"
          value={stats ? stats.total_tracked_objects.toLocaleString() : '—'}
          sub="Live from ORBITA API"
          icon={Globe}
          color="border-blue-500/20 text-blue-400"
          pulse
        />
        <KpiCard
          label="Unresolved Alerts"
          value={anomalies.length.toString()}
          sub={critCount > 0 ? `${critCount} critical` : 'All nominal'}
          icon={AlertTriangle}
          color={critCount > 0 ? "border-red-500/30 text-red-400" : "border-slate-700 text-slate-400"}
          pulse={critCount > 0}
        />
        <KpiCard
          label="Conjunction Events"
          value={conjunctions.length.toString()}
          sub="High+ risk only"
          icon={Zap}
          color={conjunctions.length > 0 ? "border-orange-500/25 text-orange-400" : "border-slate-700 text-slate-400"}
        />
        <KpiCard
          label="Orbit Classes"
          value={orbitClasses.toString()}
          sub="Unique orbital regimes"
          icon={Layers}
          color="border-purple-500/20 text-purple-400"
        />
        {/* WebSocket status indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${isConnected ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'} bg-gradient-to-br from-slate-900/60 to-slate-800/30 min-w-[120px]`}>
          <Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
          <div>
            <div className="text-xs font-bold">{isConnected ? 'LIVE' : 'OFFLINE'}</div>
            <div className="text-[10px] opacity-60">WebSocket</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar
          anomalies={anomalies}
          stats={stats}
          conjunctions={conjunctions}
          realPositions={realPositions}
          selectedAnomaly={selectedAnomaly}
          setSelectedAnomaly={setSelectedAnomaly}
          onAnomalyAcknowledged={handleAnomalyAcknowledged}
        />
        <GlobeView
          anomalies={anomalies}
          realPositions={realPositions}
          selectedAnomaly={selectedAnomaly}
          setSelectedAnomaly={setSelectedAnomaly}
          tleError={tleError}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Phase 4: Timeline Slider */}
      <TimelineSlider
        startEpoch={epochStart}
        endEpoch={epochEnd}
        currentTime={timeController.currentTime}
        isPlaying={timeController.isPlaying}
        playbackSpeed={timeController.playbackSpeed}
        onTimeChange={timeController.setTime}
        onTogglePlay={timeController.togglePlay}
        onCycleSpeed={timeController.cycleSpeed}
        onResetToNow={timeController.resetToNow}
        onJumpForward={timeController.jumpForward}
        onJumpBackward={timeController.jumpBackward}
        events={conjunctions}
      />
    </div>
  )
}
