import React, { useState, useEffect } from 'react'
import { Server, Zap, ShieldAlert, GitMerge, FileText, Satellite, Binoculars, Droplet, Flame, ArrowRight, Activity, Search, RefreshCw, Download, Copy, Check } from 'lucide-react'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const EXPLORER_TABS = [
  { id: 'space-objects', label: 'Space Catalog', icon: Satellite, endpoint: '/space-objects/', description: "Master registry of orbital bodies and debris" },
  { id: 'conjunctions', label: 'Conjunctions', icon: GitMerge, endpoint: '/conjunctions/', description: "High-risk temporal proximity events" },
  { id: 'telemetry', label: 'Sat-4 Telemetry', icon: Zap, endpoint: '/telemetry/4', description: "Live multi-modal sensor readings" },
  { id: 'observations', label: 'Observations', icon: Binoculars, endpoint: '/observations/', description: "Ground-station tracking data" },
  { id: 'maneuvers', label: 'Maneuver Logs', icon: Flame, endpoint: '/maneuvers/', description: "Orbital adjustment thruster burns" },
  { id: 'reentry', label: 'Reentry Events', icon: Droplet, endpoint: '/reentry-events/', description: "Atmospheric reentry tracking" },
  { id: 'breakups', label: 'Breakup Events', icon: Server, endpoint: '/breakup-events/', description: "Collision and fragmentation logs" },
  { id: 'alerts', label: 'Anomaly History', icon: ShieldAlert, endpoint: '/anomaly-alerts/', description: "AI-detected telemetry anomalies" },
  { id: 'datasets', label: 'ATSAD Datasets', icon: FileText, endpoint: '/atsad/datasets/', description: "Benchmarking datasets" },
]

export default function Explorer() {
  const [activeTab, setActiveTab] = useState(EXPLORER_TABS[0])
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { token, logout } = useAuth()
  
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setData([])
    try {
      const res = await fetch(`${API_BASE_URL}${activeTab.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.status === 401) {
        console.error("Unauthorized. Proceeding to logout.")
        logout()
        return
      }

      const json = await res.json()
      
      if (json && json.items) {
        setData(json.items)
      } else if (Array.isArray(json)) {
        setData(json)
      } else {
        setData([json as Record<string, unknown>])
      }
    } catch (err) {
      console.error("Failed fetching explorer data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, token, logout])

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'metadata_') : []
  const ActiveIcon = activeTab.icon;

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden font-['Inter'] selection:bg-blue-500/30">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Sidebar Navigation */}
        <div className="w-72 border-r border-white/5 bg-[#0b1221]/50 backdrop-blur-xl p-6 py-8 space-y-6 overflow-y-auto relative z-10 custom-scrollbar shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-6 px-1">
              <Activity className="w-5 h-5 text-blue-400" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">System Registries</h2>
            </div>
            
            <div className="space-y-1.5">
              {EXPLORER_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab.id === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                    className={`w-full text-left group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive 
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.25)] border-transparent" 
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                    </div>
                    <span className="flex-1 tracking-wide">{tab.label}</span>
                    {isActive && <ArrowRight className="w-4 h-4 opacity-75" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          
          {/* Header Section */}
          <div className="px-8 py-8 border-b border-white/5 bg-gradient-to-b from-[#0b1221]/80 to-transparent backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <ActiveIcon className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">{activeTab.label}</h1>
                  <p className="text-slate-400 mt-1">{activeTab.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchData}
                  disabled={loading}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/10 transition-colors disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => {
                    const csv = [
                      columns.join(','),
                      ...filteredData.map(row => columns.map(col => JSON.stringify(row[col])).join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `${activeTab.id}_export.csv`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/10 transition-colors"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="text-xs font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded flex items-center gap-2 border border-white/5 w-fit">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  {activeTab.endpoint}
                </div>
              </div>
              
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Filter records..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
          
          {/* Table Area */}
          <div className="flex-1 overflow-auto p-8 custom-scrollbar relative">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-full gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                  <ActiveIcon className="w-6 h-6 text-blue-500 animate-pulse" />
                </div>
                <p className="text-slate-400 text-sm tracking-widest uppercase font-semibold animate-pulse">Retrieving Protocol Data</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/[0.02] backdrop-blur-sm max-w-2xl mx-auto p-12">
                 <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                   <Search className="w-10 h-10 text-slate-600" />
                 </div>
                 <h3 className="text-xl font-medium text-slate-300 mb-2">No Records Found</h3>
                 <p className="text-slate-500 text-center max-w-md">
                   {searchTerm ? `No results matching "${searchTerm}" in the registry.` : `The ${activeTab.label} registry is currently empty.`}
                 </p>
              </div>
            ) : (
              <div className="bg-[#0b1221]/80 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#04060b]/80 border-b border-white/5 test-xs uppercase tracking-wider text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-xl">
                      <tr>
                        {columns.map(col => (
                          <th key={col} className="px-6 py-5 whitespace-nowrap">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-900/10 transition-colors group">
                          {columns.map(col => {
                            let val: React.ReactNode = row[col] as React.ReactNode;
                            if (typeof row[col] === 'object' && row[col] !== null) {
                               val = <span className="font-mono text-xs opacity-70">{"{...}"}</span>;
                            } else if (row[col] === null || row[col] === undefined) {
                               val = <span className="opacity-30">-</span>
                            } else if (typeof row[col] === 'boolean') {
                               val = (
                                 <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row[col] ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                   {row[col] ? 'Yes' : 'No'}
                                 </span>
                               )
                            } else {
                               val = String(row[col])
                            }
                            
                            // Style numeric or timestamp heavily
                            const isNumber = typeof row[col] === 'number';
                            const cellValue = String(row[col]);
                            const isCopied = copySuccess === `${i}-${col}`;
                            
                            return (
                              <td 
                                key={col} 
                                className={`px-6 py-4 whitespace-nowrap border-white/5 group/cell cursor-pointer relative ${isNumber ? 'font-mono text-cyan-200' : 'text-slate-300'}`}
                                onClick={() => {
                                  navigator.clipboard.writeText(cellValue);
                                  setCopySuccess(`${i}-${col}`);
                                  setTimeout(() => setCopySuccess(null), 2000);
                                }}
                              >
                                {val}
                                <div className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-slate-800 text-white opacity-0 group-hover/cell:opacity-100 transition-opacity ${isCopied ? 'opacity-100 text-green-400' : ''}`}>
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="px-6 py-4 border-t border-white/5 bg-[#04060b]/50 text-xs text-slate-500 font-medium flex justify-between items-center">
                  <span>Showing {filteredData.length} records</span>
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Sync Active</span>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
