import { Cartesian3 } from 'cesium'

export interface TrajectoryPoint {
  lat: number
  lon: number
  alt: number
  time: number // ms epoch
}

/**
 * Utility: Convert a trajectory to Cesium positions.
 */
export function trajectoryToPositions(points: TrajectoryPoint[]): Cartesian3[] {
  return points.map(p => Cartesian3.fromDegrees(p.lon, p.lat, p.alt))
}
