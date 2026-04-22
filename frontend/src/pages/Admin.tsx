import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import { API_BASE_URL } from '../api/orbita'
import { useAuth } from '../contexts/useAuth'

type SectionKey =
  | 'catalog-space-objects'
  | 'catalog-operators'
  | 'catalog-missions'
  | 'catalog-ground-stations'
  | 'catalog-launch-vehicles'
  | 'users'
  | 'events-conjunctions'
  | 'tle'
  | 'atsad-datasets'
  | 'atsad-models'
  | 'atsad-runs'

const SECTION_ORDER: { key: SectionKey; label: string; path: string }[] = [
  { key: 'catalog-space-objects', label: 'Catalog · Space Objects', path: '/admin/catalog/space-objects' },
  { key: 'catalog-operators', label: 'Catalog · Operators', path: '/admin/catalog/operators' },
  { key: 'catalog-missions', label: 'Catalog · Missions', path: '/admin/catalog/missions' },
  { key: 'catalog-ground-stations', label: 'Catalog · Ground Stations', path: '/admin/catalog/ground-stations' },
  { key: 'catalog-launch-vehicles', label: 'Catalog · Launch Vehicles', path: '/admin/catalog/launch-vehicles' },
  { key: 'users', label: 'Users & API Keys', path: '/admin/users' },
  { key: 'events-conjunctions', label: 'Events · Conjunctions', path: '/admin/events/conjunctions' },
  { key: 'tle', label: 'Operations · Manual TLE Ingest', path: '/admin/tle' },
  { key: 'atsad-datasets', label: 'ATSAD · Datasets', path: '/admin/atsad?tab=datasets' },
  { key: 'atsad-models', label: 'ATSAD · Models', path: '/admin/atsad?tab=models' },
  { key: 'atsad-runs', label: 'ATSAD · Runs', path: '/admin/atsad?tab=runs' },
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
      <div className="h-full p-6 flex gap-4">
        <div className="w-80 border border-white/10 rounded-xl p-3 bg-[#0a1224] overflow-auto">
          <p className="text-xs uppercase text-slate-500 mb-2 tracking-wider">Admin modules</p>
          {SECTION_ORDER.map((entry) => (
            <Link
              to={entry.path}
              key={entry.key}
              className={`block w-full text-left px-3 py-2 rounded-lg mb-1 ${section === entry.key ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-white/5'}`}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          {section === 'tle' ? (
            <div className="col-span-2 border border-white/10 rounded-xl p-4 bg-[#0a1224]">
              <h2 className="font-semibold mb-3">Manual TLE ingest</h2>
              <p className="text-xs text-slate-400 mb-4">For objects not present in CelesTrak, ingest a full TLE entry manually.</p>
              <div className="space-y-2 max-w-3xl">
                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm" placeholder="Object Name" value={tlePayload.name} onChange={(e) => setTlePayload((v) => ({ ...v, name: e.target.value }))} />
                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-mono" placeholder="TLE Line 1 (69 chars)" value={tlePayload.line1} onChange={(e) => setTlePayload((v) => ({ ...v, line1: e.target.value }))} />
                <input className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs font-mono" placeholder="TLE Line 2 (69 chars)" value={tlePayload.line2} onChange={(e) => setTlePayload((v) => ({ ...v, line2: e.target.value }))} />
                <button className="px-3 py-2 rounded bg-emerald-600/20 text-emerald-300" onClick={() => void submitManualTle()}>
                  Ingest Manual TLE
                </button>
                {message && <p className="text-xs text-amber-300">{message}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="border border-white/10 rounded-xl p-4 bg-[#0a1224] overflow-auto">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold">Records</h2>
                  <button className="text-xs px-2 py-1 bg-white/10 rounded" onClick={() => void loadItems()}>Refresh</button>
                </div>
                {loading && <p className="text-slate-400 text-sm">Loading...</p>}
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      className={`w-full text-left p-2 rounded border ${selected === item ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 hover:bg-white/5'}`}
                      onClick={() => {
                        setSelected(item)
                        if (section === 'users' && item.user_id) void loadApiKeys(item.user_id as number)
                      }}
                    >
                      <p className="text-sm font-medium">{String(item.name ?? item.username ?? item.email ?? `Record ${idx + 1}`)}</p>
                      <p className="text-xs text-slate-400">{tabConfig?.id}: {String(item[tabConfig?.id ?? 'id'] ?? 'n/a')}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-4 bg-[#0a1224] overflow-auto">
                <h2 className="font-semibold mb-2">JSON editor</h2>
                <p className="text-xs text-slate-400 mb-2">Edit JSON then Create / Update / Delete.</p>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full min-h-[320px] bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-xs"
                />
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-2 rounded bg-emerald-600/20 text-emerald-300 disabled:opacity-40" disabled={!canEdit} onClick={() => void handleCreate()}>Create</button>
                  <button className="px-3 py-2 rounded bg-blue-600/20 text-blue-300 disabled:opacity-40" disabled={!selected || !canEdit} onClick={() => void handleUpdate()}>Update</button>
                  <button className="px-3 py-2 rounded bg-red-600/20 text-red-300 disabled:opacity-40" disabled={!selected || !canEdit} onClick={() => void handleDelete()}>Delete</button>
                </div>
                {message && <p className="text-xs mt-2 text-amber-300">{message}</p>}

                {section === 'users' && selected && canManageUsers && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="font-medium text-sm mb-2">API keys</h3>
                    <div className="flex gap-2 mb-2">
                      <input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm" />
                      <button className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-300" onClick={() => void createApiKey()}>Issue</button>
                    </div>
                    {issuedKey && <p className="text-xs text-green-300 break-all mb-2">New key (copy now): {issuedKey}</p>}
                    <div className="space-y-1">
                      {apiKeys.map((key) => (
                        <div key={String(key.api_key_id)} className="text-xs border border-white/10 rounded p-2 flex justify-between items-center">
                          <span>{String(key.key_name)} · {Boolean(key.is_active) ? 'active' : 'inactive'}</span>
                          {Boolean(key.is_active) && <button className="text-red-300" onClick={() => void revokeApiKey(Number(key.api_key_id))}>Revoke</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {section === 'events-conjunctions' && selected && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="font-medium text-sm mb-2">Conjunction lifecycle</h3>
                    <div className="flex flex-wrap gap-2">
                      {['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'].map((nextStatus) => (
                        <button key={nextStatus} className="px-2 py-1 rounded bg-purple-600/20 text-purple-300 text-xs" onClick={() => void transitionConjunction(nextStatus)}>
                          {nextStatus}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {section === 'atsad-runs' && selected && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="font-medium text-sm mb-2">Run inspection</h3>
                    <button className="px-3 py-1 rounded bg-cyan-600/20 text-cyan-300 text-xs mb-2" onClick={() => void inspectRun()}>
                      Load results + detections
                    </button>
                    <p className="text-xs text-slate-400">Results: {runResults.length} · Detections: {runDetections.length}</p>
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
