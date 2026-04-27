import { useState } from 'react'
import Header from '../components/Header'
import { API_BASE_URL } from '../api/orbita'
import { useAuth } from '../contexts/useAuth'
import { useSearchParams } from 'react-router-dom'
import { BrainCircuit, Send, Loader2, FileText, AlertTriangle, ArrowDown } from 'lucide-react'

export default function AIInvestigation() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const initialAlertId = Number(searchParams.get('alertId')) || 1
  const [alertId, setAlertId] = useState(initialAlertId)
  const [provider, setProvider] = useState('gemini')
  const [isRunning, setIsRunning] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runInvestigation = async () => {
    setIsRunning(true); setReport(null); setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/agents/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ alert_id: alertId, provider }),
      })
      const data = await res.json()
      if (res.ok) { setReport(data.report) }
      else { setError(data.detail || 'Investigation failed') }
    } catch { setError('Failed to connect to agent service') }
    finally { setIsRunning(false) }
  }

  const downloadReport = () => {
    if (!report) return
    const plainReport = report
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '- ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\r\n/g, '\n')
      .trim()

    const blob = new Blob([plainReport], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `incident_report_alert_${alertId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#04060b] text-slate-200 overflow-hidden font-['Inter'] pt-[4.5rem]">
      <Header />
      <div className="flex-1 overflow-auto">
        {/* Hero */}
        <div className="relative px-8 py-12 border-b border-white/[0.06] overflow-hidden">
          <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-wider uppercase mb-6">
              <BrainCircuit className="w-3.5 h-3.5" /> Autonomous AI Agent
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Anomaly Investigation</h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              The AI agent autonomously queries telemetry, checks space weather, runs orbital propagation, correlates events, and writes an incident report.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="bg-[#0a1428]/70 rounded-2xl border border-white/8 p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-violet-400" /> Configure
            </h2>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Alert ID to Investigate</label>
              <input type="number" value={alertId} onChange={e => setAlertId(+e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">LLM Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="gemini">Google Gemini (1.5 Pro)</option>
                <option value="deepseek">DeepSeek (deepseek-chat)</option>
                <option value="huggingface">Hugging Face (HF Router)</option>
              </select>
            </div>
            <button onClick={runInvestigation} disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all">
              {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Investigating...</> : <><Send className="w-4 h-4" /> Run Investigation</>}
            </button>
            {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" />{error}</div>}

            {/* Agent pipeline steps */}
            <div className="border-t border-white/5 pt-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Agent Pipeline</p>
              {['Query Telemetry', 'Check Space Weather', 'Run Propagation', 'Correlate Events', 'Generate Report'].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${isRunning ? 'border-violet-500/30 text-violet-400 animate-pulse' : 'border-white/10 text-slate-600'}`}>{i + 1}</div>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Report output */}
          <div className="lg:col-span-2 bg-[#0a1428]/70 rounded-2xl border border-white/8 p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-400" /> Incident Report
              {report && (
                <button
                  onClick={downloadReport}
                  title="Download report"
                  className="ml-auto w-7 h-7 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              )}
            </h2>
            {!report && !isRunning && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No report generated yet.</p>
                <p className="text-xs opacity-60 mt-1">Select an alert and run the investigation.</p>
              </div>
            )}
            {isRunning && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-4" />
                <p className="text-sm text-slate-400 animate-pulse">Agent is reasoning...</p>
              </div>
            )}
            {report && (
              <div className="prose prose-invert prose-sm max-w-none bg-slate-950/50 rounded-xl border border-white/5 p-6 whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed overflow-auto max-h-[60vh]">
                {report}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
