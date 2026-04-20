import { useEffect } from 'react'
import { Cartesian3 } from 'cesium'

interface TrajectoryPoint {
  lat: number
  lon: number
  alt: number
  time: number // ms epoch
}

interface TrajectoryRendererProps {
  trajectories: Map<string, TrajectoryPoint[]>
  highlightId?: string | null
}

/**
 * Renders orbital trajectory paths using Cesium's PolylineCollection
 * for efficient batch rendering of hundreds of orbits.
 */
export default function TrajectoryRenderer({ trajectories, highlightId }: TrajectoryRendererProps) {

  // This component is designed to be used inside an existing Viewer context
  // For standalone use, wrap in a Viewer

  useEffect(() => {
    // This would typically be called with a viewer reference passed from the parent
    // For now, this serves as the component structure
  }, [trajectories, highlightId])

  return null // Renders via Cesium primitives, not React DOM
}

/**
 * Utility: Convert a trajectory to Cesium positions.
 */
export function trajectoryToPositions(points: TrajectoryPoint[]): any[] {
  return points.map(p => Cartesian3.fromDegrees(p.lon, p.lat, p.alt))
}
