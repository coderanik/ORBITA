import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import GlobeView from '../components/GlobeView'
import { fetchUnacknowledgedAlerts, fetchPlatformStats } from '../api/orbita'
import type { AnomalyAlert, PlatformStats } from '../types'

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [realPositions, setRealPositions] = useState<Record<string, {name: string, lat: number, lon: number, alt: number}>>({})
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null)

  useEffect(() => {
    async function loadData() {
      const [alertsData, statsData] = await Promise.all([
        fetchUnacknowledgedAlerts(),
        fetchPlatformStats()
      ]);
      setAnomalies(alertsData);
      setStats(statsData);
    }
    
    // Fetch real live TLE coordinates from python service every 3 seconds
    const fetchPositions = async () => {
      try {
        const res = await fetch("http://localhost:8001/real-positions");
        const data = await res.json();
        setRealPositions(data);
      } catch (err) {
        console.warn("Could not fetch real TLE data API:", err);
      }
    };

    // Initial load
    loadData()
    fetchPositions()
    
    // Poll every 5 seconds for new live telemetry anomaly detection updates
    const interval = setInterval(loadData, 5000)
    const posInterval = setInterval(fetchPositions, 3000)
    
    return () => {
      clearInterval(interval)
      clearInterval(posInterval)
    }
  }, [])

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <Header />
      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar 
          anomalies={anomalies} 
          stats={stats} 
          realPositions={realPositions}
          selectedAnomaly={selectedAnomaly}
          setSelectedAnomaly={setSelectedAnomaly}
        />
        <GlobeView 
          anomalies={anomalies} 
          realPositions={realPositions}
          selectedAnomaly={selectedAnomaly}
        />
      </div>
    </div>
  )
}
