import { useRef, useEffect } from 'react'
import { Viewer } from 'resium'
import type { CesiumComponentRef } from 'resium'
import { Cartesian3, Cartesian2, Color, Ion, TileMapServiceImageryProvider, buildModuleUrl, Viewer as CesiumViewer, PointPrimitiveCollection, NearFarScalar, ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium'
import type { SatellitePosition } from '../hooks/useSatelliteStore'
import { WifiOff, Layers } from 'lucide-react'

// Only set the Ion token if one is provided
if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
} else {
  Ion.defaultAccessToken = '';
}

interface GlobeViewOptimizedProps {
  satellites: Map<string, SatellitePosition>
  anomalyIds: Set<string>
  criticalIds: Set<string>
  selectedId: string | null
  onSelectSatellite: (id: string | null) => void
  tleError?: boolean
  lastUpdated?: Date | null
  currentTime?: Date
  isPlaying?: boolean
}

export default function GlobeViewOptimized({
  satellites,
  anomalyIds,
  criticalIds,
  selectedId,
  onSelectSatellite,
  tleError,
  lastUpdated,
  currentTime,
  isPlaying
}: GlobeViewOptimizedProps) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null)
  const pointCollectionRef = useRef<PointPrimitiveCollection | null>(null)

  // Replace default Ion imagery with local textures if no token
  useEffect(() => {
    const setupOfflineImagery = async () => {
      if (!import.meta.env.VITE_CESIUM_ION_TOKEN && viewerRef.current?.cesiumElement) {
        const viewer = viewerRef.current.cesiumElement
        viewer.imageryLayers.removeAll()
        const provider = await TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl('Assets/Textures/NaturalEarthII')
        )
        viewer.imageryLayers.addImageryProvider(provider)
      }
    }
    setupOfflineImagery()
  }, [])

  /**
   * PERFORMANCE: Use Cesium's PointPrimitiveCollection for instanced rendering.
   * Instead of creating thousands of Entity objects (which each have overhead),
   * we use a single PointPrimitiveCollection that batches all draw calls.
   */
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer) return

    // Remove old collection if it exists
    if (pointCollectionRef.current) {
      viewer.scene.primitives.remove(pointCollectionRef.current)
    }

    const pointCollection = new PointPrimitiveCollection()

    satellites.forEach((sat) => {
      const isAnomaly = anomalyIds.has(sat.id)
      const isCritical = criticalIds.has(sat.id)
      const isSelected = selectedId === sat.id

      let color = Color.fromCssColorString('#4ade80')  // Nominal green
      let size = 4

      if (isCritical) {
        color = Color.fromCssColorString('#ff3333')
        size = 10
      } else if (isAnomaly) {
        color = Color.fromCssColorString('#ffaa00')
        size = 7
      }

      if (isSelected) {
        color = Color.CYAN
        size = 16
      }

      pointCollection.add({
        position: Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt),
        color,
        pixelSize: size,
        scaleByDistance: new NearFarScalar(1.0e2, 1.5, 8.0e6, 0.5),
        id: sat.id,
      })
    })

    viewer.scene.primitives.add(pointCollection)
    pointCollectionRef.current = pointCollection

    return () => {
      if (viewer && !viewer.isDestroyed() && pointCollectionRef.current) {
        viewer.scene.primitives.remove(pointCollectionRef.current)
        pointCollectionRef.current = null
      }
    }
  }, [satellites, anomalyIds, criticalIds, selectedId])

  // Handle click on primitives
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer) return

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((click: { position: { x: number; y: number } }) => {
      const picked = viewer.scene.pick(new Cartesian2(click.position.x, click.position.y))
      if (picked?.primitive?.id) {
        onSelectSatellite(picked.primitive.id as string)
      } else {
        onSelectSatellite(null)
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    return () => handler.destroy()
  }, [onSelectSatellite])

  const totalSats = satellites.size
  const nominalCount = totalSats - anomalyIds.size
  const critCount = criticalIds.size

  return (
    <div className="h-full w-full bg-black relative">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={!!import.meta.env.VITE_CESIUM_ION_TOKEN}
        baseLayer={import.meta.env.VITE_CESIUM_ION_TOKEN ? undefined : false}
        geocoder={false}
        homeButton={true}
        sceneModePicker={true}
        infoBox={false}
        navigationHelpButton={false}
      >
        {/* We no longer render Entity objects — using PointPrimitiveCollection above */}
      </Viewer>

      {/* Top-left overlay: constellation status */}
      <div className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md bg-slate-950/70 border border-white/10 pointer-events-none space-y-2 min-w-[220px]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h3 className="text-white/90 font-semibold text-sm tracking-wide">Live Constellation</h3>
        </div>
        <p className="text-xs text-white/40">Instanced rendering · {totalSats.toLocaleString()} objects</p>
        
        {currentTime && (
          <p className="text-xs text-blue-400 font-mono">
            T: {currentTime.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            {isPlaying && <span className="ml-1.5 text-green-400 animate-pulse">▶</span>}
          </p>
        )}

        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
            <span className="text-slate-300">{nominalCount.toLocaleString()} Nominal</span>
          </div>
          {anomalyIds.size > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <span className="text-slate-300">{(anomalyIds.size - critCount)} Warning</span>
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
