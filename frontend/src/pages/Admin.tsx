import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import { API_BASE_URL } from '../api/orbita'
import { useAuth } from '../contexts/useAuth'
import { Satellite, Building2, Rocket, Radio, Car, Users, AlertTriangle, Upload, Database, Cpu, Play, Search, Plus, RefreshCw, Pencil, Trash2, X, Check, Key, ArrowRight } from 'lucide-react'

type SectionKey =
  | 'catalog-space-objects'
  | 'catalog-operators'
  | 'catalog-missions'
  | 'catalog-ground-stations'
  | 'catalog-launch-vehicles'
  | 'users'
  | 'events-conjunctions'
  | 'events-maneuvers'
  | 'tle'
  | 'atsad-datasets'
  | 'atsad-models'
  | 'atsad-runs'

const SECTION_ORDER: { key: SectionKey; label: string; path: string; icon: React.ElementType; group: string }[] = [
  { key: 'catalog-space-objects', label: 'Space Objects', path: '/admin/catalog/space-objects', icon: Satellite, group: 'Catalog' },
  { key: 'catalog-operators', label: 'Operators', path: '/admin/catalog/operators', icon: Building2, group: 'Catalog' },
  { key: 'catalog-missions', label: 'Missions', path: '/admin/catalog/missions', icon: Rocket, group: 'Catalog' },
  { key: 'catalog-ground-stations', label: 'Ground Stations', path: '/admin/catalog/ground-stations', icon: Radio, group: 'Catalog' },
  { key: 'catalog-launch-vehicles', label: 'Launch Vehicles', path: '/admin/catalog/launch-vehicles', icon: Car, group: 'Catalog' },
  { key: 'users', label: 'Users & API Keys', path: '/admin/users', icon: Users, group: 'Access' },
  { key: 'events-conjunctions', label: 'Conjunctions', path: '/admin/events/conjunctions', icon: AlertTriangle, group: 'Events' },
  { key: 'events-maneuvers', label: 'Maneuvers', path: '/admin/events/maneuvers', icon: Rocket, group: 'Events' },
  { key: 'tle', label: 'Manual TLE Ingest', path: '/admin/tle', icon: Upload, group: 'Operations' },
  { key: 'atsad-datasets', label: 'Datasets', path: '/admin/atsad?tab=datasets', icon: Database, group: 'ATSAD Bench' },
  { key: 'atsad-models', label: 'Models', path: '/admin/atsad?tab=models', icon: Cpu, group: 'ATSAD Bench' },
  { key: 'atsad-runs', label: 'Runs', path: '/admin/atsad?tab=runs', icon: Play, group: 'ATSAD Bench' },
]

async function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem('orbita_token')
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.text()
    throw new Error(err || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return await res.json()
}

export default function Admin() {
  const { user } = useAuth()
  const role = user?.role ?? 'viewer'
  const canEdit = role === 'admin' || role === 'superadmin' || role === 'operator'
  const canManageUsers = role === 'admin' || role === 'superadmin'
  const location = useLocation()

  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [formText, setFormText] = useState('{}')
  const [message, setMessage] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, unknown>[]>([])
  const [newApiKeyName, setNewApiKeyName] = useState('default-service-key')
  const [issuedKey, setIssuedKey] = useState<string | null>(null)
  const [tlePayload, setTlePayload] = useState({ name: '', line1: '', line2: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [runResults, setRunResults] = useState<Record<string, unknown>[]>([])
  const [runDetections, setRunDetections] = useState<Record<string, unknown>[]>([])

  const section = useMemo<SectionKey>(() => {
    const path = location.pathname
    const params = new URLSearchParams(location.search)
    if (path === '/admin' || path === '/admin/catalog/space-objects') return 'catalog-space-objects'
    if (path === '/admin/catalog/operators') return 'catalog-operators'
    if (path === '/admin/catalog/missions') return 'catalog-missions'
    if (path === '/admin/catalog/ground-stations') return 'catalog-ground-stations'
    if (path === '/admin/catalog/launch-vehicles') return 'catalog-launch-vehicles'
    if (path === '/admin/users') return 'users'
    if (path === '/admin/events/conjunctions') return 'events-conjunctions'
    if (path === '/admin/events/maneuvers') return 'events-maneuvers'
    if (path === '/admin/tle') return 'tle'
    if (path === '/admin/atsad') {
      const tab = params.get('tab')
      if (tab === 'models') return 'atsad-models'
      if (tab === 'runs') return 'atsad-runs'
      return 'atsad-datasets'
    }
    return 'catalog-space-objects'
  }, [location.pathname, location.search])

  const tabConfig = useMemo(() => {
    switch (section) {
      case 'catalog-space-objects':
        return { list: '/space-objects/?limit=200', create: '/space-objects/', id: 'object_id' }
      case 'catalog-operators':
        return { list: '/operators/?limit=200', create: '/operators/', id: 'operator_id' }
      case 'catalog-missions':
        return { list: '/missions/?limit=200', create: '/missions/', id: 'mission_id' }
      case 'catalog-ground-stations':
        return { list: '/ground-stations/?active_only=false', create: '/ground-stations/', id: 'station_id' }
      case 'catalog-launch-vehicles':
        return { list: '/launch-vehicles/?limit=200', create: '/launch-vehicles/', id: 'vehicle_id' }
      case 'users':
        return { list: '/auth/users?limit=200', create: '/auth/users', id: 'user_id' }
      case 'events-conjunctions':
        return { list: '/conjunctions/?limit=200', create: '/conjunctions/', id: 'conjunction_id' }
      case 'events-maneuvers':
        return { list: '/maneuvers/?limit=200', create: '/maneuvers/', id: 'maneuver_id' }
      case 'atsad-datasets':
        return { list: '/atsad/datasets?limit=200', create: '/atsad/datasets', id: 'dataset_id' }
      case 'atsad-models':
        return { list: '/atsad/models?limit=200', create: '/atsad/models', id: 'model_id' }
      case 'atsad-runs':
        return { list: '/atsad/runs?limit=200', create: '/atsad/runs', id: 'run_id' }
      default:
        return null
    }
  }, [section])

  const loadItems = async () => {
    if (!tabConfig) return
    setLoading(true)
    setMessage(null)
    try {
      const data = await apiFetch(tabConfig.list)
      const normalized = Array.isArray(data) ? data : (data?.items ?? [])
      setItems(normalized)
      setSelected(null)
      setFormText('{}')
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [section])

  useEffect(() => {
    if (selected) {
      setFormText(JSON.stringify(selected, null, 2))
      setIssuedKey(null)
    }
  }, [selected])

  const handleCreate = async () => {
    if (!tabConfig) return
    try {
      const payload = JSON.parse(formText)
      const created = await apiFetch(tabConfig.create, { method: 'POST', body: JSON.stringify(payload) })
      setMessage('Created successfully')
      setSelected(created)
      await loadItems()
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  const handleUpdate = async () => {
    if (!tabConfig || !selected) return
    try {
      const payload = JSON.parse(formText)
      const idValue = selected[tabConfig.id]
      const updated = await apiFetch(`${tabConfig.create}${idValue}`, { method: 'PATCH', body: JSON.stringify(payload) })
      setMessage('Updated successfully')
      setSelected(updated)
      await loadItems()
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!tabConfig || !selected) return
    try {
      const idValue = selected[tabConfig.id]
      await apiFetch(`${tabConfig.create}${idValue}`, { method: 'DELETE' })
      setMessage('Deleted successfully')
      await loadItems()
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  const loadApiKeys = async (userId: number) => {
    const keys = await apiFetch(`/auth/users/${userId}/api-keys`)
    setApiKeys(keys ?? [])
  }

  const createApiKey = async () => {
    if (!selected) return
    const userId = selected.user_id as number
    const response = await apiFetch(`/auth/users/${userId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ key_name: newApiKeyName, scopes: ['read:catalog', 'write:catalog'] }),
    })
    setIssuedKey(response.api_key)
    await loadApiKeys(userId)
  }

  const revokeApiKey = async (apiKeyId: number) => {
    await apiFetch(`/auth/api-keys/${apiKeyId}`, { method: 'DELETE' })
    if (selected) await loadApiKeys(selected.user_id as number)
  }

  const transitionConjunction = async (status: string) => {
    if (!selected || section !== 'events-conjunctions' || !tabConfig) return
    try {
      const idValue = selected[tabConfig.id]
      const updated = await apiFetch(`${tabConfig.create}${idValue}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setSelected(updated)
      setFormText(JSON.stringify(updated, null, 2))
      setMessage(`Conjunction status -> ${status}`)
      await loadItems()
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  const submitManualTle = async () => {
    try {
      await apiFetch('/tle/manual', { method: 'POST', body: JSON.stringify(tlePayload) })
      setMessage('Manual TLE ingested')
      setTlePayload({ name: '', line1: '', line2: '' })
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  const inspectRun = async () => {
    if (!selected || section !== 'atsad-runs') return
    try {
      const runId = Number(selected.run_id)
      const results = await apiFetch(`/atsad/runs/${runId}/results`)
      const detections = await apiFetch(`/atsad/runs/${runId}/detections?limit=100`)
      setRunResults(results ?? [])
      setRunDetections(detections ?? [])
      setMessage(`Loaded ${results?.length ?? 0} result rows and ${detections?.length ?? 0} detections`)
    } catch (err) {
      setMessage((err as Error).message)
    }
  }

  if (role === 'viewer') {
    return (
      <div className="h-screen bg-[#04060b] text-white pt-[5rem] px-8">
        <Header />
        <div className="max-w-2xl mx-auto mt-16 border border-red-500/20 bg-red-500/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold">Admin access required</h2>
          <p className="text-slate-300 mt-2">Your account does not have permission to access the CRUD administration console.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-[#04060b] text-slate-200 pt-[4.5rem] overflow-hidden">
      <Header />
      <div className="h-full p-4 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0a1224] to-[#080e1a] overflow-auto custom-scrollbar">
          <div className="p-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white tracking-wide">Admin Console</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage platform resources</p>
          </div>
          <div className="p-2">
            {Array.from(new Set(SECTION_ORDER.map(s => s.group))).map(group => (
              <div key={group} className="mb-3">
                <p className="text-[10px] uppercase text-slate-600 tracking-widest font-bold px-3 py-1.5">{group}</p>
                {SECTION_ORDER.filter(s => s.group === group).map((entry) => {
                  const Icon = entry.icon
                  const isActive = section === entry.key
                  return (
                    <Link
                      to={entry.path}
                      key={entry.key}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl mb-0.5 text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">{entry.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          {section === 'tle' ? (
            <div className="col-span-2 border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-[#0a1224] to-[#080e1a]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Manual TLE Ingest</h2>
                  <p className="text-xs text-slate-500">Add objects bypassing automatic catalog synchronization.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Object Designation</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500/40 outline-none transition-all" 
                      placeholder="e.g. STARLINK-5042" 
                      value={tlePayload.name} 
                      onChange={(e) => setTlePayload((v) => ({ ...v, name: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">TLE Line 1</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-cyan-300 focus:ring-1 focus:ring-blue-500/40 outline-none transition-all" 
                      placeholder="1 25544U 98067A   23234.50421875  .00016717  00000-0  30143-3 0  9999" 
                      value={tlePayload.line1} 
                      onChange={(e) => setTlePayload((v) => ({ ...v, line1: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">TLE Line 2</label>
                    <input 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-cyan-300 focus:ring-1 focus:ring-blue-500/40 outline-none transition-all" 
                      placeholder="2 25544  51.6421  21.1448 0004481  42.1481  22.1481 15.49814812384124" 
                      value={tlePayload.line2} 
                      onChange={(e) => setTlePayload((v) => ({ ...v, line2: e.target.value }))} 
                    />
                  </div>
                  
                  <button 
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 active:scale-95" 
                    onClick={() => void submitManualTle()}
                  >
                    <Upload className="w-4 h-4" />
                    Ingest into Catalog
                  </button>
                  
                  {message && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      {message}
                    </div>
                  )}
                </div>
                
                <div className="rounded-2xl bg-black/30 border border-white/5 p-5 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Operational Note</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Manually ingested TLEs are prioritized over CelesTrak data for the same NORAD ID. 
                    Ensure the Two-Line Element set is in standard Format 1/2 to avoid propagation failures 
                    in the SGP4 engine.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0a1224] to-[#080e1a] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white text-sm">Records</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">{items.length} entries loaded</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelected(null); setFormText('{}'); setConfirmDelete(false) }} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="New record">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void loadItems()} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors" title="Refresh">
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="p-3 border-b border-white/[0.04]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search records..."
                      className="w-full bg-black/30 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                  {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="w-5 h-5 text-blue-400 animate-spin" /></div>}
                  {!loading && items.filter(item => {
                    if (!searchQuery) return true
                    const label = String(item.name ?? item.username ?? item.email ?? '')
                    return label.toLowerCase().includes(searchQuery.toLowerCase())
                  }).map((item, idx) => {
                    const label = String(item.name ?? item.username ?? item.email ?? `Record ${idx + 1}`)
                    const idVal = String(item[tabConfig?.id ?? 'id'] ?? 'n/a')
                    const isSelected = selected === item
                    return (
                      <button
                        key={idx}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150 group ${
                          isSelected
                            ? 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                            : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]'
                        }`}
                        onClick={() => {
                          setSelected(item)
                          setConfirmDelete(false)
                          if (section === 'users' && item.user_id) void loadApiKeys(item.user_id as number)
                        }}
                      >
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>{label}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {idVal}</p>
                      </button>
                    )
                  })}
                  {!loading && items.length === 0 && <p className="text-center text-slate-600 text-xs py-8">No records found</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0a1224] to-[#080e1a] overflow-auto flex flex-col">
                <div className="p-4 border-b border-white/[0.06]">
                  <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                    {selected ? 'Edit Record' : 'New Record'}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Edit JSON payload then Create, Update, or Delete.</p>
                </div>
                <div className="flex-1 p-4">
                  {section === 'users' && canManageUsers && (
                    <div className="mb-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                      <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-2">User role templates</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Viewer', role: 'viewer' },
                          { label: 'Operator', role: 'operator' },
                          { label: 'Admin', role: 'admin' },
                        ].map((preset) => (
                          <button
                            key={preset.role}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-medium hover:bg-cyan-500/20 transition-all"
                            onClick={() => {
                              const base = {
                                username: `${preset.role}_new_user`,
                                email: `${preset.role}.new@orbita.local`,
                                full_name: `${preset.label} User`,
                                role: preset.role,
                                org_id: user?.org_id ?? null,
                                password: 'ChangeMe123!',
                              }
                              setSelected(null)
                              setFormText(JSON.stringify(base, null, 2))
                            }}
                          >
                            New {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    className="w-full min-h-[280px] bg-black/40 border border-white/[0.08] rounded-xl p-4 font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all resize-none custom-scrollbar"
                    spellCheck={false}
                  />
                </div>
                <div className="p-4 border-t border-white/[0.06] space-y-3">
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={!canEdit}
                      onClick={() => void handleCreate()}
                    >
                      <Plus className="w-3 h-3" /> Create
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/20 transition-all text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={!selected || !canEdit}
                      onClick={() => void handleUpdate()}
                    >
                      <Check className="w-3 h-3" /> Update
                    </button>
                    {!confirmDelete ? (
                      <button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
                        disabled={!selected || !canEdit}
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-red-400">Confirm?</span>
                        <button className="px-3 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-medium hover:bg-red-500/30 transition-all" onClick={() => { void handleDelete(); setConfirmDelete(false) }}>Yes, delete</button>
                        <button className="px-3 py-2 rounded-xl bg-white/5 text-slate-400 text-xs hover:bg-white/10 transition-all" onClick={() => setConfirmDelete(false)}><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                  {message && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                      message.includes('success') || message.includes('Created') || message.includes('Updated') || message.includes('Deleted') || message.includes('ingested') || message.includes('Loaded')
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}>
                      {message.includes('success') || message.includes('Created') || message.includes('Updated') ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {message}
                      <button className="ml-auto" onClick={() => setMessage(null)}><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>

                {section === 'users' && selected && canManageUsers && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-white"><Key className="w-3.5 h-3.5 text-indigo-400" /> API Keys</h3>
                    <div className="flex gap-2 mb-3">
                      <input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-xs font-medium hover:bg-indigo-500/25 transition-all" onClick={() => void createApiKey()}><Plus className="w-3 h-3" /> Issue</button>
                    </div>
                    {issuedKey && <p className="text-xs text-emerald-300 break-all mb-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">🔑 New key (copy now): {issuedKey}</p>}
                    <div className="space-y-1">
                      {apiKeys.map((key) => (
                        <div key={String(key.api_key_id)} className="text-xs border border-white/[0.06] rounded-xl p-2.5 flex justify-between items-center bg-black/20">
                          <span className="text-slate-300">{String(key.key_name)} · <span className={Boolean(key.is_active) ? 'text-emerald-400' : 'text-red-400'}>{Boolean(key.is_active) ? 'active' : 'revoked'}</span></span>
                          {Boolean(key.is_active) && <button className="text-red-400 hover:text-red-300 transition-colors text-[10px] font-medium" onClick={() => void revokeApiKey(Number(key.api_key_id))}>Revoke</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {section === 'events-conjunctions' && selected && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-white"><ArrowRight className="w-3.5 h-3.5 text-purple-400" /> Conjunction Lifecycle</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'].map((nextStatus) => (
                        <button key={nextStatus} className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/15 text-[10px] font-bold tracking-wide hover:bg-purple-500/20 transition-all" onClick={() => void transitionConjunction(nextStatus)}>
                          {nextStatus}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {section === 'atsad-runs' && selected && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-white">
                      <Search className="w-3.5 h-3.5 text-cyan-400" /> Run Inspection
                    </h3>
                    <button 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium hover:bg-cyan-500/20 transition-all mb-4" 
                      onClick={() => void inspectRun()}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Load results + detections
                    </button>
                    
                    {(runResults.length > 0 || runDetections.length > 0) && (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Metrics Summary</p>
                          <div className="grid grid-cols-2 gap-2">
                            {runResults.map((res, i) => (
                              <div key={i} className="flex justify-between items-center px-2 py-1 bg-white/5 rounded-lg">
                                <span className="text-[10px] text-slate-400 uppercase">{String(res.metric_name)}</span>
                                <span className="text-xs font-mono text-cyan-300">{Number(res.metric_value).toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {runDetections.length > 0 && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Sample Detections ({runDetections.length})</p>
                            <div className="space-y-1.5 max-h-[150px] overflow-auto custom-scrollbar pr-1">
                              {runDetections.slice(0, 10).map((det, i) => (
                                <div key={i} className="text-[10px] p-2 bg-white/5 rounded-lg flex justify-between">
                                  <span className="text-slate-300">Timestamp: {new Date(String(det.timestamp)).toLocaleTimeString()}</span>
                                  <span className={`font-bold ${Number(det.is_anomaly) ? 'text-red-400' : 'text-slate-500'}`}>
                                    {Number(det.is_anomaly) ? 'ANOMALY' : 'NOMINAL'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {runResults.length === 0 && !loading && <p className="text-[10px] text-slate-500 text-center italic">No results loaded yet</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
