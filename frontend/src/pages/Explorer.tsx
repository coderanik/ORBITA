import React, { useState, useEffect, useCallback } from 'react'
import { Server, Zap, ShieldAlert, GitMerge, FileText, Satellite, Binoculars, Droplet, Flame, ArrowRight, Activity, Search, RefreshCw, Download, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Header from '../components/Header'
import { useAuth } from '../contexts/useAuth'
import { API_BASE_URL } from '../api/orbita'

const EXPLORER_TABS = [
  { id: 'space-objects', label: 'Space Catalog', icon: Satellite, endpoint: '/space-objects/', description: "Master registry of tracked orbital bodies and debris" },
  { id: 'conjunctions', label: 'Conjunctions', icon: GitMerge, endpoint: '/conjunctions/', description: "High-risk temporal proximity events between objects" },
  { id: 'telemetry', label: 'Sat-4 Telemetry', icon: Zap, endpoint: '/telemetry/4', description: "Live multi-modal telemetry sensor readings" },
  { id: 'observations', label: 'Observations', icon: Binoculars, endpoint: '/observations/', description: "Ground-station optical tracking data" },
  { id: 'maneuvers', label: 'Maneuver Logs', icon: Flame, endpoint: '/maneuvers/', description: "Orbital adjustment and thruster burn records" },
  { id: 'reentry', label: 'Reentry Events', icon: Droplet, endpoint: '/reentry-events/', description: "Atmospheric reentry tracking events" },
  { id: 'breakups', label: 'Breakup Events', icon: Server, endpoint: '/breakup-events/', description: "Collision and fragmentation event logs" },
  { id: 'alerts', label: 'Anomaly History', icon: ShieldAlert, endpoint: '/anomaly-alerts/', description: "Full historical AI-detected telemetry anomalies" },
  { id: 'datasets', label: 'ATSAD Datasets', icon: FileText, endpoint: '/atsad/datasets/', description: "Registered ATSADBench evaluation datasets" },
]

const PAGE_SIZE = 50

export default function Explorer() {
  const [activeTab, setActiveTab] = useState(EXPLORER_TABS[0])
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const { token, logout } = useAuth()

  const fetchData = useCallback(async (offset = 0) => {
    setLoading(true)
    setData([])
    try {
      const sep = activeTab.endpoint.includes('?') ? '&' : '?'
      const url = `${API_BASE_URL}${activeTab.endpoint}${sep}offset=${offset}&limit=${PAGE_SIZE}`
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 401) { logout(); return }
      const json = await res.json()
      if (json && json.items) {
        setData(json.items)
        setTotal(json.total ?? json.items.length)
      } else if (Array.isArray(json)) {
        setData(json)
        setTotal(json.length)
      } else {
        setData([json as Record<string, unknown>])
        setTotal(1)
      }
    } catch (err) {
      console.error("Failed fetching explorer data:", err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, token, logout])

  useEffect(() => {
    setPage(0)
    setSearchTerm('')
    void fetchData(0)
  }, [activeTab, fetchData])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage * PAGE_SIZE)
  }

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'metadata_') : []
  const ActiveIcon = activeTab.icon
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filteredData = data.filter(row => {
    if (!searchTerm) return true
    return Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const handleExportCSV = () => {
    const csv = [
      columns.join(','),
      ...filteredData.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `${activeTab.id}_export.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden font-['Inter'] selection:bg-blue-500/30 pt-[4.5rem]">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Ambient glow effects */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-white/[0.06] bg-[#080f1e]/60 backdrop-blur-xl p-5 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
          <div className="flex items-center gap-2 mb-5 px-1">
            <Activity className="w-4 h-4 text-blue-400 shrink-0" />
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Registries</h2>
          </div>
          {EXPLORER_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab.id === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab); setSearchTerm(''); setPage(0) }}
                className={`w-full text-left group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors shrink-0 ${isActive ? 'bg-white/15' : 'bg-slate-800/80 group-hover:bg-slate-700'}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                </div>
                <span className="flex-1 text-[13px] tracking-wide">{tab.label}</span>
                {isActive && <ArrowRight className="w-3.5 h-3.5 opacity-70 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">

          {/* Section Header */}
          <div className="px-8 py-6 border-b border-white/[0.06] bg-gradient-to-b from-[#080f1e]/60 to-transparent backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-2xl border border-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <ActiveIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{activeTab.label}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{activeTab.description}</p>
                {total > 0 && !loading && (
                  <p className="text-[11px] text-slate-500 mt-1">{total.toLocaleString()} total records · Page {page + 1} of {totalPages || 1}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <button onClick={() => fetchData(page * PAGE_SIZE)} disabled={loading} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/10 transition-colors disabled:opacity-50" title="Refresh">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleExportCSV} disabled={filteredData.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/10 transition-colors disabled:opacity-50" title="Export CSV">
                  <Download className="w-4 h-4" />
                </button>
                <div className="text-xs font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded flex items-center gap-2 border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)] animate-pulse" />
                  {activeTab.endpoint}
                </div>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter visible records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-full gap-4">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" />
                  <ActiveIcon className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>
                <p className="text-slate-400 text-sm tracking-widest uppercase font-semibold animate-pulse">Retrieving Protocol Data</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 border border-dashed border-white/8 rounded-3xl bg-white/[0.015] max-w-xl mx-auto p-12">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-5 border border-white/5">
                  <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Records Found</h3>
                <p className="text-slate-500 text-center text-sm">
                  {searchTerm ? `No results matching "${searchTerm}"` : `The ${activeTab.label} registry is empty.`}
                </p>
              </div>
            ) : (
              <div className="bg-[#0a1428]/70 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#04060b]/70 border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-xl">
                      <tr>
                        {columns.map(col => (
                          <th key={col} className="px-5 py-4 whitespace-nowrap">
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-900/8 transition-colors group">
                          {columns.map(col => {
                            let val: React.ReactNode = row[col] as React.ReactNode
                            if (typeof row[col] === 'object' && row[col] !== null) {
                              val = <span className="font-mono text-xs opacity-50">{'{...}'}</span>
                            } else if (row[col] === null || row[col] === undefined) {
                              val = <span className="opacity-20 select-none">—</span>
                            } else if (typeof row[col] === 'boolean') {
                              val = (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${row[col] ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                  {row[col] ? '✓ Yes' : '✗ No'}
                                </span>
                              )
                            } else {
                              val = String(row[col])
                            }
                            const isNumber = typeof row[col] === 'number'
                            const cellValue = String(row[col] ?? '')
                            const isCopied = copySuccess === `${i}-${col}`
                            return (
                              <td
                                key={col}
                                className={`px-5 py-3.5 whitespace-nowrap group/cell cursor-pointer relative ${isNumber ? 'font-mono text-cyan-300' : 'text-slate-300'}`}
                                onClick={() => {
                                  navigator.clipboard.writeText(cellValue)
                                  setCopySuccess(`${i}-${col}`)
                                  setTimeout(() => setCopySuccess(null), 1800)
                                }}
                              >
                                {val}
                                <div className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-slate-700/90 text-white opacity-0 group-hover/cell:opacity-100 transition-opacity ${isCopied ? 'opacity-100 text-green-400 bg-green-900/60' : ''}`}>
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

                {/* Pagination Footer */}
                <div className="px-5 py-3.5 border-t border-white/5 bg-[#04060b]/40 text-xs text-slate-500 flex justify-between items-center">
                  <span>
                    {searchTerm
                      ? `${filteredData.length} filtered · ${total.toLocaleString()} total`
                      : `${total.toLocaleString()} records · Page ${page + 1} of ${totalPages || 1}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 mr-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Live
                    </span>
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 0 || loading}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1 bg-slate-900 rounded-lg border border-white/10 font-mono">
                      {page + 1} / {totalPages || 1}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= (totalPages - 1) || loading}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
