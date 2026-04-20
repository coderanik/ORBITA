import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap, Clock } from 'lucide-react'
import type { ConjunctionAlert } from '../types'

interface TimelineSliderProps {
  startEpoch: Date
  endEpoch: Date
  currentTime: Date
  isPlaying: boolean
  playbackSpeed: number
  onTimeChange: (t: Date) => void
  onTogglePlay: () => void
  onCycleSpeed: () => void
  onResetToNow: () => void
  onJumpForward: (s: number) => void
  onJumpBackward: (s: number) => void
  events?: ConjunctionAlert[]
}

export default function TimelineSlider({
  startEpoch,
  endEpoch,
  currentTime,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onTogglePlay,
  onCycleSpeed,
  onResetToNow,
  onJumpForward,
  onJumpBackward,
  events = []
}: TimelineSliderProps) {
  const totalRange = endEpoch.getTime() - startEpoch.getTime()
  const progress = totalRange > 0 
    ? ((currentTime.getTime() - startEpoch.getTime()) / totalRange) * 100 
    : 0

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value)
    const newTime = new Date(startEpoch.getTime() + (pct / 100) * totalRange)
    onTimeChange(newTime)
  }

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  const speedLabel = playbackSpeed >= 3600 ? `${playbackSpeed / 3600}h/s`
    : playbackSpeed >= 60 ? `${playbackSpeed / 60}m/s`
    : `${playbackSpeed}x`

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.06] px-6 py-3">
      {/* Time display row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-slate-400 font-mono">{formatDate(currentTime)}</span>
          <span className="text-sm text-white font-mono font-bold tracking-wide">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] text-slate-600">UTC</span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onJumpBackward(300)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Jump back 5 min"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-xl transition-all ${
              isPlaying
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onJumpForward(300)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Jump forward 5 min"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={onCycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 transition-colors text-xs font-mono"
            title="Cycle playback speed"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            {speedLabel}
          </button>

          <button
            onClick={onResetToNow}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Reset to current time"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* End time label */}
        <div className="text-xs text-slate-500 font-mono">
          {formatDate(startEpoch)} — {formatDate(endEpoch)}
        </div>
      </div>

      {/* Slider track */}
      <div className="relative w-full h-8 flex items-center">
        {/* Event markers on the track */}
        {events.map((evt, i) => {
          const evtTime = new Date(evt.time_of_closest_approach).getTime()
          const evtPct = ((evtTime - startEpoch.getTime()) / totalRange) * 100
          if (evtPct < 0 || evtPct > 100) return null
          const isHighRisk = evt.risk_level === 'RED' || evt.risk_level === 'CRITICAL'
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex items-center z-10"
              style={{ left: `${evtPct}%` }}
              title={`${evt.primary_name} × ${evt.secondary_name} — ${evt.miss_distance_km.toFixed(2)} km`}
            >
              <div className={`w-1.5 h-4 rounded-full ${isHighRisk ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-amber-400'}`} />
            </div>
          )
        })}

        {/* The range input */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={progress}
          onChange={handleSliderChange}
          className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-blue-500
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(59,130,246,0.5)]
            [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white/30
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-blue-500
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white/30
          "
          style={{
            background: `linear-gradient(to right, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.6) ${progress}%, rgb(30,41,59) ${progress}%, rgb(30,41,59) 100%)`
          }}
        />
      </div>
    </div>
  )
}
