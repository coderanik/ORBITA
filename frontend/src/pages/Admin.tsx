import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { API_BASE_URL } from '../api/orbita'
import { useAuth } from '../contexts/useAuth'

type TabKey = 'operators' | 'missions' | 'ground' | 'users'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'operators', label: 'Operators' },
  { key: 'missions', label: 'Missions' },
  { key: 'ground', label: 'Ground Stations' },
  { key: 'users', label: 'Users & API Keys' },
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
  const [activeTab, setActiveTab] = useState<TabKey>('operators')
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [formText, setFormText] = useState('{}')
  const [message, setMessage] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, unknown>[]>([])
  const [newApiKeyName, setNewApiKeyName] = useState('default-service-key')
  const [issuedKey, setIssuedKey] = useState<string | null>(null)

  const tabConfig = useMemo(() => {
    switch (activeTab) {
      case 'operators':
        return { list: '/operators/?limit=200', create: '/operators/', id: 'operator_id' }
      case 'missions':
        return { list: '/missions/?limit=200', create: '/missions/', id: 'mission_id' }
      case 'ground':
        return { list: '/ground-stations/?active_only=false', create: '/ground-stations/', id: 'station_id' }
      case 'users':
        return { list: '/auth/users?limit=200', create: '/auth/users', id: 'user_id' }
    }
  }, [activeTab])

  const loadItems = async () => {
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
  }, [activeTab])

  useEffect(() => {
    if (selected) {
      setFormText(JSON.stringify(selected, null, 2))
      setIssuedKey(null)
    }
  }, [selected])

  const handleCreate = async () => {
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
    if (!selected) return
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
    if (!selected) return
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

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
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
        <div className="w-64 border border-white/10 rounded-xl p-3 bg-[#0a1224]">
          <p className="text-xs uppercase text-slate-500 mb-2 tracking-wider">Admin modules</p>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${activeTab === tab.key ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-white/5'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-xl p-4 bg-[#0a1224] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Records</h2>
              <button className="text-xs px-2 py-1 bg-white/10 rounded" onClick={() => void loadItems()}>
                Refresh
              </button>
            </div>
            {loading && <p className="text-slate-400 text-sm">Loading...</p>}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  className={`w-full text-left p-2 rounded border ${selected === item ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 hover:bg-white/5'}`}
                  onClick={() => {
                    setSelected(item)
                    if (activeTab === 'users' && item.user_id) {
                      void loadApiKeys(item.user_id as number)
                    }
                  }}
                >
                  <p className="text-sm font-medium">{String(item.name ?? item.username ?? item.email ?? `Record ${idx + 1}`)}</p>
                  <p className="text-xs text-slate-400">{tabConfig.id}: {String(item[tabConfig.id] ?? 'n/a')}</p>
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
              <button className="px-3 py-2 rounded bg-emerald-600/20 text-emerald-300" onClick={() => void handleCreate()}>
                Create
              </button>
              <button className="px-3 py-2 rounded bg-blue-600/20 text-blue-300" disabled={!selected} onClick={() => void handleUpdate()}>
                Update
              </button>
              <button className="px-3 py-2 rounded bg-red-600/20 text-red-300" disabled={!selected} onClick={() => void handleDelete()}>
                Delete
              </button>
            </div>
            {message && <p className="text-xs mt-2 text-amber-300">{message}</p>}

            {activeTab === 'users' && selected && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="font-medium text-sm mb-2">API keys</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm"
                  />
                  <button className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-300" onClick={() => void createApiKey()}>
                    Issue
                  </button>
                </div>
                {issuedKey && <p className="text-xs text-green-300 break-all mb-2">New key (copy now): {issuedKey}</p>}
                <div className="space-y-1">
                  {apiKeys.map((key) => (
                    <div key={String(key.api_key_id)} className="text-xs border border-white/10 rounded p-2 flex justify-between items-center">
                      <span>{String(key.key_name)} · {Boolean(key.is_active) ? 'active' : 'inactive'}</span>
                      {Boolean(key.is_active) && (
                        <button className="text-red-300" onClick={() => void revokeApiKey(Number(key.api_key_id))}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
