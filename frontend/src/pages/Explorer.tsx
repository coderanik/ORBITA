import React, { useState, useEffect } from 'react'
import { Server, Zap, ShieldAlert, GitMerge, FileText, Satellite, Binoculars, Droplet, Flame } from 'lucide-react'
import Header from '../components/Header'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const EXPLORER_TABS = [
  { id: 'space-objects', label: 'Space Catalog', icon: Satellite, endpoint: '/space-objects/' },
  { id: 'conjunctions', label: 'Conjunctions', icon: GitMerge, endpoint: '/conjunctions/' },
  { id: 'telemetry', label: 'Raw Telemetry', icon: Zap, endpoint: '/telemetry/' },
  { id: 'observations', label: 'Observations', icon: Binoculars, endpoint: '/observations/' },
  { id: 'maneuvers', label: 'Maneuver Logs', icon: Flame, endpoint: '/maneuvers/' },
  { id: 'reentry', label: 'Reentry Events', icon: Droplet, endpoint: '/reentry-events/' },
  { id: 'breakups', label: 'Breakup Events', icon: Server, endpoint: '/breakup-events/' },
  { id: 'alerts', label: 'Anomaly History', icon: ShieldAlert, endpoint: '/anomaly-alerts/' },
  { id: 'datasets', label: 'ATSAD Datasets', icon: FileText, endpoint: '/atsad/datasets/' },
]

export default function Explorer() {
  const [activeTab, setActiveTab] = useState(EXPLORER_TABS[0])
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setData([])
      try {
        const res = await fetch(`${API_BASE_URL}${activeTab.endpoint}`)
        const json = await res.json()
        
        // Fast API pagination usually returns { items: [], total: x, ... }
        if (json && json.items) {
          setData(json.items)
        } else if (Array.isArray(json)) {
          setData(json)
        } else {
           // Fallback if the endpoint returns something unexpected
           setData([json as Record<string, unknown>])
        }
      } catch (err) {
        console.error("Failed fetching explorer data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab])

  // Dynamically extract columns based on the first item in the data array
  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'metadata_') : []
  const ActiveIcon = activeTab.icon;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-white/10 bg-slate-950/50 p-4 space-y-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-3">System Registries</h2>
          {EXPLORER_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab.id === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-light text-white flex items-center gap-3">
              <ActiveIcon className="w-6 h-6 text-blue-400" />
              {activeTab.label}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live inspection of ORBITA PostgreSQL registry via <code className="bg-black/30 px-1 py-0.5 rounded text-blue-300">{activeTab.endpoint}</code>
            </p>
          </div>
          
          <div className="flex-1 overflow-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                 <ActiveIcon className="w-12 h-12 mb-4 opacity-20" />
                 <p className="text-lg">No records found.</p>
                 <p className="text-sm">The {activeTab.label} registry is currently empty.</p>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10">
                      <tr>
                        {columns.map(col => (
                          <th key={col} className="px-6 py-4 font-semibold tracking-wider">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          {columns.map(col => {
                            let val: React.ReactNode = row[col] as React.ReactNode;
                            if (typeof row[col] === 'object' && row[col] !== null) {
                               val = JSON.stringify(row[col]);
                            } else if (row[col] === null || row[col] === undefined) {
                               val = <span className="opacity-30">-</span>
                            } else if (typeof row[col] === 'boolean') {
                               val = row[col] ? 'Yes' : 'No'
                            } else {
                               val = String(row[col])
                            }
                            return (
                              <td key={col} className="px-6 py-3 border-white/5 text-slate-300">
                                {val}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
