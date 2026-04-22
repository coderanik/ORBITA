import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import GlobeView from '../components/GlobeView'
import { useTimeController } from '../hooks/useTimeController'
import { useWebSocket } from '../hooks/useWebSocket'
import { fetchUnacknowledgedAlerts, fetchPlatformStats, fetchConjunctionAlerts, fetchRealPositions } from '../api/orbita'
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



  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden pt-[4.5rem]">
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
          currentTime={timeController.currentTime}
        />
      </div>

      {/* Phase 4: Timeline Slider */}
      {/* <TimelineSlider
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
      /> */}
    </div>
  )
}
