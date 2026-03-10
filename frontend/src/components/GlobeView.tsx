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
  selectedAnomaly: AnomalyAlert | null;
  setSelectedAnomaly: (anomaly: AnomalyAlert | null) => void;
}

export default function GlobeView({ anomalies, realPositions, selectedAnomaly, setSelectedAnomaly }: GlobeViewProps) {
  // Combine all satellite records we have access to
  const allSatIds = new Set<string>();
  Object.keys(realPositions).forEach(k => allSatIds.add(k));
  anomalies.forEach(a => allSatIds.add(a.object_id.toString()));

  const handleSelectedEntityChanged = (entity: any) => {
    if (!entity || !entity.id) {
       setSelectedAnomaly(null);
       return;
    }
    const idStr = String(entity.id);
    if (idStr.startsWith('anomaly-')) {
       const alertId = parseInt(idStr.replace('anomaly-', ''), 10);
       const matched = anomalies.find(a => a.alert_id === alertId);
       if (matched) setSelectedAnomaly(matched);
    } else {
       setSelectedAnomaly(null);
    }
  };

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
        infoBox={false} // Hide default Cesium info box so our sidebar handles details
        navigationHelpButton={false}
        onSelectedEntityChange={handleSelectedEntityChanged}
      >
        {Array.from(allSatIds).map(satId => {
          const pos = realPositions[satId];
          const lat = pos ? pos.lat : 0;
          const lon = pos ? pos.lon : 0;
          const alt = pos ? pos.alt : 400000;
          const satName = pos ? pos.name : `SAT-${satId}`;

          const anomaly = anomalies.find(a => a.object_id.toString() === satId);
          
          if (anomaly) {
            const isCrit = anomaly.severity === 'CRITICAL' || anomaly.severity === 'RED';
            const isSelected = selectedAnomaly?.alert_id === anomaly.alert_id;
            
            return (
              <Entity
                key={`anomaly-${anomaly.alert_id}`}
                id={`anomaly-${anomaly.alert_id}`}
                name={`Anomaly on ${satName}`}
                position={Cartesian3.fromDegrees(lon, lat, alt)}
                description={`Anomaly type: ${anomaly.anomaly_type}<br/>Subsystem: ${anomaly.subsystem}<br/>Severity: ${anomaly.severity}`}
                point={{ 
                  pixelSize: isSelected ? 24 : (isCrit ? 12 : 8), 
                  color: isSelected ? Color.CYAN : (isCrit ? Color.RED : Color.ORANGE),
                  outlineColor: Color.WHITE,
                  outlineWidth: isSelected ? 4 : 2
                }}
              />
            )
          } else {
            // Non-anomalous satellite
            return (
              <Entity
                key={`sat-${satId}`}
                id={`sat-${satId}`}
                name={satName}
                position={Cartesian3.fromDegrees(lon, lat, alt)}
                description={`Status: Nominal`}
                point={{ 
                  pixelSize: 6, 
                  color: Color.fromCssColorString('#4ade80'),
                  outlineColor: Color.fromCssColorString('#14532d'),
                  outlineWidth: 1
                }}
              />
            )
          }
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
