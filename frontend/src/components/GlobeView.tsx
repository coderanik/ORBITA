import { Viewer, Entity } from 'resium'
import { Cartesian3, Color, Ion } from 'cesium'
import type { AnomalyAlert } from '../types'

// If the user provided an ION token in .env, we inject it securely here
if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

interface GlobeViewProps {
  anomalies: AnomalyAlert[];
  realPositions: Record<string, {name: string, lat: number, lon: number, alt: number}>;
}

export default function GlobeView({ anomalies, realPositions }: GlobeViewProps) {
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
          // If python backend has live position for this ID, use it. Otherwise 0,0,0
          const pos = realPositions[a.object_id.toString()];
          const lat = pos ? pos.lat : 0;
          const lon = pos ? pos.lon : 0;
          const alt = pos ? pos.alt : 400000;
          const satName = pos ? pos.name : `SAT-${a.object_id}`;
          
          const isCrit = a.severity === 'CRITICAL' || a.severity === 'RED';
          return (
            <Entity
              key={a.alert_id}
              name={`Anomaly on ${satName}`}
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
