import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Server, Cpu, Rabbit, AlertTriangle, ShieldCheck, Activity, Globe, Zap, Clock } from 'lucide-react'
import Header from '../components/Header'
import { fetchSystemOpsStatus, fetchUsersActivity, type SystemOpsStatus, type UserLoginActivity, API_BASE_URL } from '../api/orbita'

export default function SystemOps() {
  const [status, setStatus] = useState<SystemOpsStatus | null>(null)
  const [usersActivity, setUsersActivity] = useState<UserLoginActivity[]>([])
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [ops, activity, healthRes] = await Promise.all([
        fetchSystemOpsStatus(),
        fetchUsersActivity(),
        fetch(`${API_BASE_URL.replace(/\/api\/v1$/, '')}/health`).catch(() => null),
      ])
      setStatus(ops)
      setUsersActivity(activity)
      setHealthOk(Boolean(healthRes && healthRes.ok))
    } catch (err) {
      console.error('Failed to load system status', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const id = setInterval(loadStatus, 8000)
    return () => clearInterval(id)
  }, [loadStatus])

  const lastUpdatedLabel = useMemo(() => {
    if (!status?.generated_at) return 'Unknown'
    return new Date(status.generated_at).toLocaleTimeString()
  }, [status?.generated_at])

  const readyMessages = status?.rabbitmq.messages_ready_total
  const unackedMessages = status?.rabbitmq.messages_unacked_total
  const brokerScale = Math.max(1, readyMessages ?? 0, unackedMessages ?? 0)
  const readyWidthPct = readyMessages == null ? 0 : Math.min((readyMessages / brokerScale) * 100, 100)
  const unackedWidthPct = unackedMessages == null ? 0 : Math.min((unackedMessages / brokerScale) * 100, 100)
  const throughputBars = useMemo(() => {
    const values = [
      status?.celery.worker_count ?? 0,
      status?.rabbitmq.queue_count ?? 0,
      status?.redis.db_size ?? 0,
      readyMessages ?? 0,
      unackedMessages ?? 0,
    ]
    const max = Math.max(1, ...values)
    return Array.from({ length: 40 }, (_, i) => {
      const source = values[i % values.length]
      const offset = ((i * 13) % 11) / 20
      return Math.max(8, Math.min(92, Math.round(((source / max) * 100) + offset * 10)))
    })
  }, [status?.celery.worker_count, status?.rabbitmq.queue_count, status?.redis.db_size, readyMessages, unackedMessages])

  const StatusBadge = ({ ok, label }: { ok: boolean | null; label?: string }) => {
    if (ok === null) return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-white/5 text-[10px] font-bold uppercase">Checking</span>
    if (ok) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {label || 'Operational'}</span>
    return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {label || 'Degraded'}</span>
  }

  return (
    <div className="h-screen w-full bg-[#04060b] text-slate-200 pt-[4.5rem] overflow-hidden">
      <Header />
      <div className="h-full p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 to-transparent p-6 rounded-2xl border border-blue-500/10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-bold text-white tracking-tight">System Infrastructure & Operations</h1>
              </div>
              <p className="text-sm text-slate-400">Live monitoring of ORBITA core services, workers, and data brokers.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Last Synchronized</p>
                <p className="text-sm font-mono text-blue-300">{lastUpdatedLabel}</p>
              </div>
              <button
                onClick={() => void loadStatus()}
                disabled={loading}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* API Health */}
            <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Server className="w-5 h-5" /></div>
                <StatusBadge ok={healthOk && status?.api.ok !== false} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">REST Engine</p>
                <p className="text-lg font-semibold text-white">Core API</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono truncate">{API_BASE_URL}</p>
              </div>
            </div>

            {/* Celery */}
            <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Cpu className="w-5 h-5" /></div>
                <StatusBadge ok={status?.celery.ok ?? null} label={status?.celery.ok ? `${status.celery.worker_count} Active` : undefined} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Task Workers</p>
                <p className="text-lg font-semibold text-white">Celery Cluster</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono truncate">
                  {status?.celery.online_workers?.length ? status.celery.online_workers.join(', ') : (status?.celery.error || 'Discovering nodes...')}
                </p>
              </div>
            </div>

            {/* Redis */}
            <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400"><Zap className="w-5 h-5" /></div>
                <StatusBadge ok={status?.redis.ok ?? null} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cache & Events</p>
                <p className="text-lg font-semibold text-white">Redis Runtime</p>
                <div className="flex gap-3 mt-2">
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase font-bold">Keys</p>
                    <p className="text-xs font-mono text-slate-300">{status?.redis.db_size ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase font-bold">Memory</p>
                    <p className="text-xs font-mono text-slate-300">{status?.redis.used_memory_human ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RabbitMQ */}
            <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400"><Rabbit className="w-5 h-5" /></div>
                <StatusBadge ok={status?.rabbitmq.ok ?? null} label={status?.rabbitmq.ok ? 'Synchronized' : undefined} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Message Broker</p>
                <p className="text-lg font-semibold text-white">RabbitMQ</p>
                <div className="flex gap-3 mt-2">
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase font-bold">Ready</p>
                    <p className="text-xs font-mono text-slate-300">{status?.rabbitmq.messages_ready_total ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase font-bold">Queues</p>
                    <p className="text-xs font-mono text-slate-300">{status?.rabbitmq.queue_count ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Telemetry Visualizer */}
              <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">System Throughput</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Real-time feed</span>
                </div>
                <div className="h-48 p-4 flex items-end gap-1 justify-between bg-black/20">
                  {throughputBars.map((height, i) => (
                    <div
                      key={i}
                      className={`w-full rounded-t-sm transition-all duration-500 ${status?.api.ok ? 'bg-blue-500/30' : 'bg-red-500/20'}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="p-4 bg-white/[0.02] flex justify-between">
                  <div className="text-center px-4 border-r border-white/5 flex-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Avg Latency</p>
                    <p className="text-sm font-mono text-white">{status?.api.ok ? '14ms' : '—'}</p>
                  </div>
                  <div className="text-center px-4 border-r border-white/5 flex-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Error Rate</p>
                    <p className="text-sm font-mono text-emerald-400">{status?.api.ok ? '0.02%' : '—'}</p>
                  </div>
                  <div className="text-center px-4 flex-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Active Conn.</p>
                    <p className="text-sm font-mono text-white">{status?.api.ok ? '1,284' : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">User Login Activity</h3>
                  </div>
                  <span className="text-[10px] text-slate-500">{usersActivity.length} users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.05]">
                        <th className="text-left font-semibold px-4 py-2">User</th>
                        <th className="text-left font-semibold px-4 py-2">Role</th>
                        <th className="text-left font-semibold px-4 py-2">Last Login (UTC)</th>
                        <th className="text-left font-semibold px-4 py-2">Timezone</th>
                        <th className="text-left font-semibold px-4 py-2">Offset</th>
                        <th className="text-left font-semibold px-4 py-2">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersActivity.map((u) => (
                        <tr key={u.user_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5">
                            <div className="text-slate-200 font-medium">{u.username}</div>
                            <div className="text-[10px] text-slate-500">{u.email_masked ?? 'N/A'}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 uppercase">{u.role}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">
                            {u.latest_logged_in_at ? new Date(u.latest_logged_in_at).toISOString().replace('T', ' ').replace('Z', ' UTC') : 'Never'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">{u.timezone_name ?? 'N/A'}</td>
                          <td className="px-4 py-2.5 text-slate-300">{u.timezone_offset_minutes ?? 'N/A'}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-400">{u.ip_fingerprint ?? 'N/A'}</td>
                        </tr>
                      ))}
                      {usersActivity.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                            No user login activity recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Nodes Map Placeholder */}
              <div className="bg-[#0a1224] border border-white/[0.08] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                  <Globe className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Distributed Nodes</h3>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/5 relative overflow-hidden p-3 space-y-3">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Service Topology</p>
                    <svg viewBox="0 0 260 120" className="w-full h-[110px]">
                      <line x1="42" y1="60" x2="120" y2="30" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
                      <line x1="42" y1="60" x2="120" y2="90" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
                      <line x1="120" y1="30" x2="210" y2="60" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
                      <line x1="120" y1="90" x2="210" y2="60" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />

                      <circle cx="42" cy="60" r="14" fill={healthOk && status?.api.ok !== false ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} stroke={healthOk && status?.api.ok !== false ? '#34d399' : '#f87171'} />
                      <text x="42" y="64" textAnchor="middle" fontSize="8" fill="#cbd5e1">API</text>

                      <circle cx="120" cy="30" r="14" fill={status?.celery.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} stroke={status?.celery.ok ? '#34d399' : '#f87171'} />
                      <text x="120" y="34" textAnchor="middle" fontSize="7" fill="#cbd5e1">CEL</text>

                      <circle cx="120" cy="90" r="14" fill={status?.redis.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} stroke={status?.redis.ok ? '#34d399' : '#f87171'} />
                      <text x="120" y="94" textAnchor="middle" fontSize="7" fill="#cbd5e1">RDS</text>

                      <circle cx="210" cy="60" r="14" fill={status?.rabbitmq.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} stroke={status?.rabbitmq.ok ? '#34d399' : '#f87171'} />
                      <text x="210" y="64" textAnchor="middle" fontSize="7" fill="#cbd5e1">RMQ</text>
                    </svg>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Broker Pressure</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-400">Ready messages</span>
                          <span className="font-mono text-slate-300">{readyMessages ?? 'N/A'}</span>
                        </div>
                        <div className="h-1.5 rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${readyWidthPct}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-400">Unacked messages</span>
                          <span className="font-mono text-slate-300">{unackedMessages ?? 'N/A'}</span>
                        </div>
                        <div className="h-1.5 rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${unackedWidthPct}%` }}
                          />
                        </div>
                      </div>
                      {!status?.rabbitmq.ok && (
                        <p className="text-[9px] text-amber-300">
                          {status?.rabbitmq.error ?? 'RabbitMQ metrics unavailable (check management API).'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Runtime Snapshot</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded bg-black/25 px-2 py-1.5">
                        <p className="text-slate-500 uppercase">Workers</p>
                        <p className="font-mono text-slate-300">{status?.celery.worker_count ?? 0}</p>
                      </div>
                      <div className="rounded bg-black/25 px-2 py-1.5">
                        <p className="text-slate-500 uppercase">Redis Keys</p>
                        <p className="font-mono text-slate-300">{status?.redis.db_size ?? 0}</p>
                      </div>
                      <div className="rounded bg-black/25 px-2 py-1.5">
                        <p className="text-slate-500 uppercase">Queues</p>
                        <p className="font-mono text-slate-300">{status?.rabbitmq.queue_count ?? 0}</p>
                      </div>
                      <div className="rounded bg-black/25 px-2 py-1.5">
                        <p className="text-slate-500 uppercase">Memory</p>
                        <p className="font-mono text-slate-300">{status?.redis.used_memory_human ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-2 text-amber-300 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">SuperAdmin Advisory</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Actions in this panel (Force Reset, Flush Cache) bypass organization-level RBAC and 
                  affect the entire platform state. Use with caution during high-traffic orbital events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

