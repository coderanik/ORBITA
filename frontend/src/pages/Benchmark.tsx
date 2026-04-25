import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { fetchLeaderboard, evaluateAtsadRun, fetchAtsadRunsList, fetchAtsadStats, seedAndEvaluateAtsadDemo, type AtsadRunListItem } from '../api/orbita'
import type { LeaderboardEntry } from '../types'
import { Trophy, Medal, Target, Zap, Clock, Hash, BarChart3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

const SORT_OPTIONS = [
  { label: 'ATSAD Score', key: 'atsad_composite_score' },
  { label: 'F1 Score', key: 'f1_score' },
  { label: 'Alarm Accuracy', key: 'alarm_accuracy' },
  { label: 'Alarm Latency', key: 'alarm_latency' },
  { label: 'Contiguity', key: 'alarm_contiguity' },
]

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${color} bg-gradient-to-b from-white/[0.04] to-transparent`}>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      <span className="text-sm font-bold text-white tabular-nums mt-0.5">{value}</span>
    </div>
  )
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(value * 100, 100)}%` }} />
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]"><Trophy className="w-4 h-4 text-white" /></div>
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-[0_0_8px_rgba(148,163,184,0.4)]"><Medal className="w-4 h-4 text-white" /></div>
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-[0_0_8px_rgba(180,83,9,0.4)]"><Medal className="w-4 h-4 text-white" /></div>
  return <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 text-xs font-bold">{rank}</div>
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className={`flex-1 p-5 rounded-2xl border ${color} bg-gradient-to-br from-slate-900/70 to-slate-800/30`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}

export default function Benchmark() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('atsad_composite_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [runId, setRunId] = useState('')
  const [yTrueInput, setYTrueInput] = useState('0,0,0,1,1,0,0,1,0,0')
  const [yPredInput, setYPredInput] = useState('0,0,0,1,0,0,0,1,0,0')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [atsadRuns, setAtsadRuns] = useState<AtsadRunListItem[]>([])
  const [modelTotal, setModelTotal] = useState(0)
  const [runTotal, setRunTotal] = useState(0)
  const [demoLoading, setDemoLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [data, stats, runs] = await Promise.all([
      fetchLeaderboard(),
      fetchAtsadStats(),
      fetchAtsadRunsList(100),
    ])
    setEntries(data)
    setModelTotal(stats.modelTotal)
    setRunTotal(stats.runTotal)
    setAtsadRuns(runs)
    if (!runId.trim() && runs.length > 0) {
      setRunId(String(runs[0].run_id))
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleDemoSeed = async () => {
    const yTrue = parse01Series(yTrueInput)
    const yPred = parse01Series(yPredInput)
    if (yTrue.length === 0 || yPred.length === 0) {
      setSubmitMsg('Set y_true and y_pred (0/1) before running the demo.')
      return
    }
    if (yTrue.length !== yPred.length) {
      setSubmitMsg('y_true and y_pred must be the same length.')
      return
    }
    setDemoLoading(true)
    setSubmitMsg(null)
    const out = await seedAndEvaluateAtsadDemo(yTrue, yPred)
    if (out.ok) {
      if (out.runId) setRunId(String(out.runId))
      setSubmitMsg(`Demo complete — run #${out.runId}. Leaderboard updated.`)
      await loadData()
    } else {
      setSubmitMsg(out.error ? `Demo failed: ${out.error}` : 'Demo failed.')
      if (out.runId) setRunId(String(out.runId))
    }
    setDemoLoading(false)
  }

  const fmt = (v: number | undefined | null, decimals = 3) =>
    v != null ? v.toFixed(decimals) : '—'

  const sorted = [...entries].sort((a, b) => {
    const va = (a[sortKey as keyof typeof a]) ?? -Infinity
    const vb = (b[sortKey as keyof typeof b]) ?? -Infinity
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const bestScore = entries.length > 0
    ? Math.max(...entries.map(e => e.atsad_composite_score ?? 0))
    : 0

  const modelTypes = [...new Set(entries.map(e => e.model_type).filter(Boolean))]

  const modelTypeColors: Record<string, string> = {
    LLM: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    DEEP_LEARNING: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    STATISTICAL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    HYBRID: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  }

  const parse01Series = (text: string): number[] => {
    return text
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => n === 0 || n === 1)
  }

  const submitEvaluation = async () => {
    const parsedRunId = Number(runId)
    const yTrue = parse01Series(yTrueInput)
    const yPred = parse01Series(yPredInput)

    if (!parsedRunId || Number.isNaN(parsedRunId)) {
      setSubmitMsg('Enter a valid run ID.')
      return
    }
    if (yTrue.length === 0 || yPred.length === 0) {
      setSubmitMsg('y_true and y_pred must contain 0/1 values.')
      return
    }
    if (yTrue.length !== yPred.length) {
      setSubmitMsg('y_true and y_pred must be the same length.')
      return
    }

    setSubmitLoading(true)
    setSubmitMsg(null)
    const result = await evaluateAtsadRun({
      run_id: parsedRunId,
      y_true: yTrue,
      y_pred: yPred,
      save_detections: true,
    })
    if (result.ok) {
      setSubmitMsg('Evaluation submitted and leaderboard refreshed.')
      await loadData()
    } else {
      setSubmitMsg(result.error ?? 'Evaluation failed.')
    }
    setSubmitLoading(false)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden font-['Inter'] pt-[4.5rem]">
      <Header />

      <div className="flex-1 overflow-auto custom-scrollbar">
        {/* Hero section */}
        <div className="relative px-10 pt-10 pb-8 border-b border-white/[0.06] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 w-64 h-32 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                <Trophy className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">ATSAD Bench</h1>
                <p className="text-slate-400 mt-0.5">ATSADBench — anomaly detection model leaderboard and evaluation runs</p>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 text-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Summary cards */}
            <div className="flex gap-3 mt-6">
              <SummaryCard label="Registered Models" value={`${modelTotal || [...new Set(entries.map(e => e.model_name))].length}`} icon={Hash} color="border-blue-500/20 text-blue-400" />
              <SummaryCard label="Eval runs" value={`${runTotal || entries.length}`} icon={BarChart3} color="border-purple-500/20 text-purple-400" />
              <SummaryCard label="Best ATSAD Score" value={bestScore > 0 ? bestScore.toFixed(4) : '—'} icon={Target} color="border-yellow-500/20 text-yellow-400" />
              <SummaryCard label="Model Types" value={`${modelTypes.length}`} icon={Zap} color="border-cyan-500/20 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="px-10 py-6 space-y-5">
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/35 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-white">Quick Evaluate</h3>
              <span className="text-[11px] text-slate-500">POST `/api/v1/atsad/evaluate`</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Run</label>
                <div className="flex gap-2">
                  <select
                    value={atsadRuns.some((r) => String(r.run_id) === runId) ? runId : ''}
                    onChange={(e) => {
                      if (e.target.value) setRunId(e.target.value)
                    }}
                    className="bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-200 max-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">Pick run…</option>
                    {atsadRuns.map((r) => (
                      <option key={r.run_id} value={String(r.run_id)}>
                        #{r.run_id} {r.status}
                      </option>
                    ))}
                  </select>
                  <input
                    value={runId}
                    onChange={(e) => setRunId(e.target.value)}
                    placeholder="Run ID"
                    className="flex-1 min-w-0 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
              <input
                value={yTrueInput}
                onChange={(e) => setYTrueInput(e.target.value)}
                placeholder="y_true (comma-separated 0/1)"
                className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <input
                value={yPredInput}
                onChange={(e) => setYPredInput(e.target.value)}
                placeholder="y_pred (comma-separated 0/1)"
                className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={submitEvaluation}
                disabled={submitLoading || demoLoading}
                className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white border border-blue-500/40"
              >
                {submitLoading ? 'Submitting...' : 'Run Evaluation'}
              </button>
              <button
                type="button"
                onClick={handleDemoSeed}
                disabled={demoLoading || submitLoading}
                className="px-4 py-2 rounded-xl text-sm bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white border border-emerald-500/40"
              >
                {demoLoading ? 'Setting up...' : 'Create demo run & evaluate'}
              </button>
              {submitMsg && <span className="text-xs text-slate-300 max-w-xl">{submitMsg}</span>}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              <strong className="text-slate-400">Run Evaluation</strong> needs an existing run ID. Use the dropdown, or click{' '}
              <strong className="text-slate-400">Create demo run &amp; evaluate</strong> to register a dataset, model, and run, then compute metrics in one step.
            </p>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  if (sortKey === opt.key) setSortAsc(!sortAsc)
                  else { setSortKey(opt.key); setSortAsc(false) }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  sortKey === opt.key
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                }`}
              >
                {opt.label}
                {sortKey === opt.key && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
                <div className="absolute inset-0 rounded-full border-t-2 border-yellow-500 animate-spin" />
                <Trophy className="absolute inset-0 m-auto w-5 h-5 text-yellow-500 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm tracking-widest uppercase font-semibold animate-pulse">Loading Leaderboard</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 border border-dashed border-white/8 rounded-3xl bg-white/[0.015]">
              <Trophy className="w-12 h-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">No leaderboard results yet</h3>
              <p className="text-slate-500 text-sm text-center max-w-md">
                Create a run with <span className="text-emerald-400">Create demo run &amp; evaluate</span>, or pick a run ID and use{' '}
                <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">POST /api/v1/atsad/evaluate</code>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((entry, i) => {
                const rank = i + 1
                const isExpanded = expandedRow === i
                const typeColor = modelTypeColors[entry.model_type] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/30'
                const score = entry.atsad_composite_score ?? 0

                return (
                  <div
                    key={`${entry.run_id}-${i}`}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      rank <= 3
                        ? 'border-yellow-500/20 bg-gradient-to-r from-yellow-500/[0.04] to-transparent'
                        : 'border-white/[0.07] bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
                  >
                    <button
                      className="w-full text-left p-5 flex items-center gap-5"
                      onClick={() => setExpandedRow(isExpanded ? null : i)}
                    >
                      <RankBadge rank={rank} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-white font-semibold text-base truncate">{entry.model_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${typeColor}`}>
                            {entry.model_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>Dataset: <span className="text-slate-300">{entry.dataset_name}</span></span>
                          {entry.architecture && <span>· {entry.architecture}</span>}
                          {entry.context_strategy && <span>· {entry.context_strategy}</span>}
                        </div>
                        <div className="mt-2">
                          <ScoreBar value={score} color={rank === 1 ? "bg-gradient-to-r from-yellow-500 to-amber-400" : rank <= 3 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : "bg-blue-600"} />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">ATSAD Score</p>
                          <p className={`text-xl font-bold tabular-nums ${rank === 1 ? 'text-yellow-400' : 'text-white'}`}>
                            {fmt(entry.atsad_composite_score, 4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">F1</p>
                          <p className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(entry.f1_score)}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-white/5 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricPill label="Alarm Accuracy" value={fmt(entry.alarm_accuracy)} color="border-blue-500/20 text-blue-400" />
                        <MetricPill label="Alarm Latency" value={entry.alarm_latency != null ? `${fmt(entry.alarm_latency, 1)} ts` : '—'} color="border-amber-500/20 text-amber-400" />
                        <MetricPill label="Contiguity" value={fmt(entry.alarm_contiguity)} color="border-emerald-500/20 text-emerald-400" />
                        <MetricPill label="F1 Score" value={fmt(entry.f1_score)} color="border-cyan-500/20 text-cyan-400" />
                        {entry.inference_time_ms != null && (
                          <MetricPill label="Inference (ms)" value={fmt(entry.inference_time_ms, 1)} color="border-purple-500/20 text-purple-400" />
                        )}
                        {entry.tokens_used != null && (
                          <MetricPill label="Tokens Used" value={entry.tokens_used.toLocaleString()} color="border-slate-600 text-slate-400" />
                        )}
                        <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500 px-3 py-2 bg-black/20 rounded-xl border border-white/5">
                          <Clock className="w-3.5 h-3.5" />
                          Run ID #{entry.run_id} · Task: {entry.task_type}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
