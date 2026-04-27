import { useRef, useEffect, useState } from 'react'
import { Viewer, Entity } from 'resium'
import type { CesiumComponentRef } from 'resium'
import { Cartesian3, Color, Ion, SceneMode, TileMapServiceImageryProvider, UrlTemplateImageryProvider, buildModuleUrl, Viewer as CesiumViewer, Entity as CesiumEntity, JulianDate, Math as CesiumMath } from 'cesium'
import type { AnomalyAlert } from '../types'
import { Home, WifiOff } from 'lucide-react'

// Only set the Ion token if one is provided; otherwise leave it unset
// so that no requests are made to api.cesium.com
if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
} else {
  // Set to empty string to prevent Cesium from using its built-in demo token
  Ion.defaultAccessToken = '';
}

interface GlobeViewProps {
  anomalies: AnomalyAlert[];
  realPositions: Record<string, {name: string, lat: number, lon: number, alt: number}>;
  selectedAnomaly: AnomalyAlert | null;
  setSelectedAnomaly: (anomaly: AnomalyAlert | null) => void;
  tleError?: boolean;
  lastUpdated?: Date | null;
  currentTime?: Date;
  hideOverlays?: boolean;
  enableDayNight?: boolean;
  sceneMode?: '3d' | '2d';
  showOrbits?: boolean;
  autoRotateEarth?: boolean;
  showRotationStats?: boolean;
}

export default function GlobeView({
  anomalies,
  realPositions,
  selectedAnomaly,
  setSelectedAnomaly,
  tleError,
  lastUpdated,
  currentTime,
  hideOverlays = false,
  enableDayNight = true,
  sceneMode = '3d',
  showOrbits = false,
  autoRotateEarth = false,
  showRotationStats = false,
}: GlobeViewProps) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const rotationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Always initialize imagery explicitly so the globe renders even if Ion is unavailable.
  useEffect(() => {
    let cancelled = false

    const setupImagery = async () => {
      const viewer = viewerRef.current?.cesiumElement
      if (!viewer || cancelled) return

      viewer.imageryLayers.removeAll()

      try {
        // Use satellite imagery so Earth looks like a physical globe.
        const worldImagery = new UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          credit: 'Esri, Maxar, Earthstar Geographics',
        })
        viewer.imageryLayers.addImageryProvider(worldImagery)
      } catch {
        // Fallback to bundled Cesium texture assets if remote imagery is unavailable.
        const naturalEarth = await TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl('Assets/Textures/NaturalEarthII')
        )
        if (!cancelled) {
          viewer.imageryLayers.addImageryProvider(naturalEarth)
        }
      }

      viewer.scene.globe.show = true
      viewer.scene.globe.enableLighting = enableDayNight
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = enableDayNight
      }

      // Force an initial world view so we don't end up with an off-globe camera.
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(78.9629, 20.5937, 22_000_000),
      })
    }

    const waitForViewerAndInit = () => {
      if (cancelled) return
      if (!viewerRef.current?.cesiumElement) {
        requestAnimationFrame(waitForViewerAndInit)
        return
      }
      void setupImagery()
    }

    waitForViewerAndInit()

    return () => {
      cancelled = true
    }
  }, [enableDayNight]);

  // Sync the external currentTime with Cesium's internal clock
  useEffect(() => {
    if (viewerRef.current?.cesiumElement && currentTime) {
      viewerRef.current.cesiumElement.clock.currentTime = JulianDate.fromDate(currentTime);
    }
  }, [currentTime]);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer) return
    if (sceneMode === '2d' && viewer.scene.mode !== SceneMode.SCENE2D) {
      viewer.scene.morphTo2D(0.8)
    } else if (sceneMode === '3d' && viewer.scene.mode !== SceneMode.SCENE3D) {
      viewer.scene.morphTo3D(0.8)
    }
  }, [sceneMode])

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer || !autoRotateEarth || sceneMode !== '3d') return

    const siderealDaySeconds = 86164
    const angularVelocityRadPerSec = (2 * Math.PI) / siderealDaySeconds

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current == null) {
        lastFrameTimeRef.current = timestamp
      }
      const deltaSec = (timestamp - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = timestamp
      viewer.camera.rotateRight(angularVelocityRadPerSec * deltaSec)
      rotationFrameRef.current = requestAnimationFrame(animate)
    }

    rotationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (rotationFrameRef.current != null) {
        cancelAnimationFrame(rotationFrameRef.current)
        rotationFrameRef.current = null
      }
      lastFrameTimeRef.current = null
    }
  }, [autoRotateEarth, sceneMode])

  const allSatIds = new Set<string>()
  Object.keys(realPositions).forEach(k => allSatIds.add(k))
  anomalies.forEach(a => allSatIds.add(a.object_id.toString()))

  const totalSats = allSatIds.size
  const nominalCount = totalSats - anomalies.length
  const critCount = anomalies.filter(a => a.severity === 'CRITICAL' || a.severity === 'RED').length

  const handleSelectedEntityChanged = (entity: CesiumEntity | null) => {
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

  const buildOrbitPath = (latDeg: number, lonDeg: number, altMeters: number) => {
    const inclination = Math.max(5, Math.min(85, Math.abs(latDeg)))
    const i = CesiumMath.toRadians(inclination)
    const lon0 = CesiumMath.toRadians(lonDeg)
    const points: Cartesian3[] = []
    for (let deg = 0; deg <= 360; deg += 4) {
      const u = CesiumMath.toRadians(deg)
      const lat = Math.asin(Math.sin(i) * Math.sin(u))
      const lon = lon0 + Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u))
      points.push(Cartesian3.fromDegrees(CesiumMath.toDegrees(lon), CesiumMath.toDegrees(lat), altMeters))
    }
    return points
  }

  const focusCurrentLocation = () => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer) return
    setGeoError(null)

    if (!navigator.geolocation) {
      setGeoError('Location is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(coords.longitude, coords.latitude, 1_200_000),
          duration: 1.2,
        })
      },
      () => {
        setGeoError('Unable to fetch your current location (permission blocked or unavailable).')
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      }
    )
  }

  return (
    <div className="h-full w-full bg-black relative">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        baseLayer={false}
        geocoder={false}
        homeButton={false}
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
        {showOrbits && Array.from(allSatIds).map((satId) => {
          const pos = realPositions[satId]
          if (!pos) return null
          return (
            <Entity
              key={`orbit-${satId}`}
              polyline={{
                positions: buildOrbitPath(pos.lat, pos.lon, pos.alt || 400000),
                width: 1.2,
                material: Color.fromCssColorString('#60a5fa').withAlpha(0.5),
              }}
            />
          )
        })}
      </Viewer>

      <button
        type="button"
        onClick={focusCurrentLocation}
        title="Go to my current location"
        className="absolute top-3 right-[52px] w-10 h-10 rounded-md border border-white/[0.15] bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-colors z-20 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      >
        <Home className="w-5 h-5" />
      </button>

      {geoError && (
        <div className="absolute top-14 right-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] z-20 max-w-[280px]">
          {geoError}
        </div>
      )}

      {/* Top-left overlay */}
      {!hideOverlays && <div className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md bg-slate-950/70 border border-white/10 pointer-events-none space-y-2 min-w-[200px]">
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
      </div>}

      {/* TLE error badge */}
      {!hideOverlays && tleError && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs backdrop-blur-sm pointer-events-none">
          <WifiOff className="w-3 h-3" />
          TLE service offline — positions approximate
        </div>
      )}

      {/* Legend */}
      {!hideOverlays && <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/5 pointer-events-none">
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
      </div>}

      {showRotationStats && sceneMode === '3d' && (
        <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 pointer-events-none">
          Earth rotation: 1670 km/h (0.0042 deg/s)
        </div>
      )}
    </div>
  )
}
