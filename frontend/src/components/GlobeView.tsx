import { Viewer, Entity } from 'resium'
import { Cartesian3, Color, Ion } from 'cesium'
import type { AnomalyAlert } from '../types'

// If the user provided an ION token in .env, we inject it securely here
if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

interface GlobeViewProps {
  anomalies: AnomalyAlert[];
}

// Pseudo-random deterministic placement generator
const getStableCoord = (id: number) => {
  const seed1 = Math.abs(Math.sin(id)) * 10000;
  const seed2 = Math.abs(Math.cos(id)) * 10000;
  return {
    lat: (seed1 - Math.floor(seed1)) * 180 - 90,
    lon: (seed2 - Math.floor(seed2)) * 360 - 180,
    alt: 400000 + ((seed1 + seed2) - Math.floor(seed1 + seed2)) * 600000
  }
}

export default function GlobeView({ anomalies }: GlobeViewProps) {
  return (
    <div className="flex-1 bg-black relative">
      <Viewer 
        full 
        timeline={false} 
        animation={false} 
        baseLayerPicker={true}
        geocoder={false}
        homeButton={true}
        sceneModePicker={true}
        navigationHelpButton={false}
      >
        {anomalies.map(a => {
          const { lat, lon, alt } = getStableCoord(a.object_id);
          const isCrit = a.severity === 'CRITICAL' || a.severity === 'RED';
          return (
            <Entity
              key={a.alert_id}
              name={`Anomaly on SAT-${a.object_id}`}
              position={Cartesian3.fromDegrees(lon, lat, alt)}
              description={`Anomaly type: ${a.anomaly_type}<br/>Subsystem: ${a.subsystem}<br/>Severity: ${a.severity}`}
              point={{ 
                pixelSize: isCrit ? 12 : 8, 
                color: isCrit ? Color.RED : Color.ORANGE,
                outlineColor: Color.WHITE,
                outlineWidth: 2
              }}
            />
          )
        })}
      </Viewer>

      {/* Map Overlay Overlay */}
      <div className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md bg-slate-950/60 border border-white/10 pointer-events-none">
        <h3 className="text-white/80 font-medium text-sm mb-1">Live Constellation View</h3>
        <p className="text-xs text-white/50">Tracking assets dynamically driven by API Data</p>
      </div>
    </div>
  )
}
