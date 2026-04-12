import { Viewer, Entity } from 'resium'
import { Cartesian3, Color, Ion, TileMapServiceImageryProvider, buildModuleUrl } from 'cesium'
import type { AnomalyAlert } from '../types'
import { WifiOff } from 'lucide-react'

if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

interface GlobeViewProps {
  anomalies: AnomalyAlert[];
  realPositions: Record<string, {name: string, lat: number, lon: number, alt: number}>;
  selectedAnomaly: AnomalyAlert | null;
  setSelectedAnomaly: (anomaly: AnomalyAlert | null) => void;
  tleError?: boolean;
  lastUpdated?: Date | null;
}

export default function GlobeView({ anomalies, realPositions, selectedAnomaly, setSelectedAnomaly, tleError, lastUpdated }: GlobeViewProps) {
  const allSatIds = new Set<string>()
  Object.keys(realPositions).forEach(k => allSatIds.add(k))
  anomalies.forEach(a => allSatIds.add(a.object_id.toString()))

  const totalSats = allSatIds.size
  const nominalCount = totalSats - anomalies.length
  const critCount = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length

  const handleSelectedEntityChanged = (entity: any) => {
    if (!entity || !entity.id) { setSelectedAnomaly(null); return }
    const idStr = String(entity.id)
    if (idStr.startsWith('anomaly-')) {
      const alertId = parseInt(idStr.replace('anomaly-', ''), 10)
      const matched = anomalies.find(a => a.alert_id === alertId)
      if (matched) setSelectedAnomaly(matched)
    } else {
      setSelectedAnomaly(null)
    }
  }

  const defaultImagery = !import.meta.env.VITE_CESIUM_ION_TOKEN ? 
    new TileMapServiceImageryProvider({
      url: buildModuleUrl('Assets/Textures/NaturalEarthII')
    }) : undefined;

  return (
    <div className="flex-1 bg-black relative">
      <Viewer
        full
        timeline={false}
        animation={false}
        baseLayerPicker={!!import.meta.env.VITE_CESIUM_ION_TOKEN}
        imageryProvider={defaultImagery}
        geocoder={false}
        homeButton={true}
        sceneModePicker={true}
        infoBox={false}
        navigationHelpButton={false}
        onSelectedEntityChange={handleSelectedEntityChanged}
      >
        {Array.from(allSatIds).map(satId => {
          const pos = realPositions[satId]
          const lat = pos ? pos.lat : 0
          const lon = pos ? pos.lon : 0
          const alt = pos ? pos.alt : 400000
          const satName = pos ? pos.name : `SAT-${satId}`
          const anomaly = anomalies.find(a => a.object_id.toString() === satId)

          if (anomaly) {
            const isCrit = anomaly.severity === 'CRITICAL' || anomaly.severity === 'RED'
            const isSelected = selectedAnomaly?.alert_id === anomaly.alert_id
            return (
              <Entity
                key={`anomaly-${anomaly.alert_id}`}
                id={`anomaly-${anomaly.alert_id}`}
                name={`⚠ ${satName}`}
                position={Cartesian3.fromDegrees(lon, lat, alt)}
                description={`<b>Type:</b> ${anomaly.anomaly_type}<br/><b>Subsystem:</b> ${anomaly.subsystem}<br/><b>Severity:</b> ${anomaly.severity}<br/><b>Object ID:</b> ${anomaly.object_id}`}
                point={{
                  pixelSize: isSelected ? 22 : (isCrit ? 13 : 9),
                  color: isSelected ? Color.CYAN : (isCrit ? Color.fromCssColorString('#ff3333') : Color.fromCssColorString('#ffaa00')),
                  outlineColor: isSelected ? Color.WHITE : Color.fromCssColorString('#ffffff40'),
                  outlineWidth: isSelected ? 3 : 1.5
                }}
              />
            )
          } else {
            return (
              <Entity
                key={`sat-${satId}`}
                id={`sat-${satId}`}
                name={satName}
                position={Cartesian3.fromDegrees(lon, lat, alt)}
                description={`<b>Status:</b> Nominal<br/><b>Object ID:</b> ${satId}`}
                point={{
                  pixelSize: 5,
                  color: Color.fromCssColorString('#4ade80'),
                  outlineColor: Color.fromCssColorString('#14532d'),
                  outlineWidth: 1
                }}
              />
            )
          }
        })}
      </Viewer>

      {/* Top-left overlay */}
      <div className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md bg-slate-950/70 border border-white/10 pointer-events-none space-y-2 min-w-[200px]">
        <h3 className="text-white/90 font-semibold text-sm tracking-wide">Live Constellation</h3>
        <p className="text-xs text-white/40">TLE-driven orbital tracking</p>
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
            <span className="text-slate-300">{nominalCount} Nominal</span>
          </div>
          {anomalies.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <span className="text-slate-300">{anomalies.length - critCount} Anomaly</span>
            </div>
          )}
          {critCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" />
              <span className="text-red-300 font-medium">{critCount} Critical</span>
            </div>
          )}
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-white/25 pt-1 border-t border-white/5">
            Updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </p>
        )}
      </div>

      {/* TLE error badge */}
      {tleError && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs backdrop-blur-sm pointer-events-none">
          <WifiOff className="w-3 h-3" />
          TLE service offline — positions approximate
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/5 pointer-events-none">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Legend</p>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Nominal
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Warning
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> Critical
        </div>
        <div className="flex items-center gap-2 text-[11px] text-cyan-300">
          <span className="w-3 h-3 rounded-full bg-cyan-400 ring-1 ring-white ring-offset-1 ring-offset-transparent" /> Selected
        </div>
      </div>
    </div>
  )
}
