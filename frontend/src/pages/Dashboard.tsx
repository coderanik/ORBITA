import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import GlobeView from '../components/GlobeView'
import { fetchUnacknowledgedAlerts, fetchPlatformStats } from '../api/orbita'
import type { AnomalyAlert, PlatformStats } from '../types'

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    async function loadData() {
      const [alertsData, statsData] = await Promise.all([
        fetchUnacknowledgedAlerts(),
        fetchPlatformStats()
      ]);
      setAnomalies(alertsData);
      setStats(statsData);
    }
    
    // Initial load
    loadData()
    
    // Poll every 5 seconds for new live telemetry anomaly detection updates
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <Header />
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar anomalies={anomalies} stats={stats} />
        <GlobeView anomalies={anomalies} />
      </div>
    </div>
  )
}
