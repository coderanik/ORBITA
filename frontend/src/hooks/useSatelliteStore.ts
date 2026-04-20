import { useState, useCallback, useRef } from 'react'

export interface SatellitePosition {
  id: string
  name: string
  lat: number
  lon: number
  alt: number // meters
  status: 'nominal' | 'warning' | 'critical'
  noradId?: number
}

/**
 * Lightweight store for managing 10K+ satellite positions.
 * Uses a Map internally for O(1) lookups.
 */
export function useSatelliteStore() {
  const [satellites, setSatellites] = useState<Map<string, SatellitePosition>>(new Map())
  const [lastBulkUpdate, setLastBulkUpdate] = useState<Date | null>(null)
  const countRef = useRef(0)

  const updateSingle = useCallback((sat: SatellitePosition) => {
    setSatellites(prev => {
      const next = new Map(prev)
      next.set(sat.id, sat)
      return next
    })
  }, [])

  const updateBulk = useCallback((sats: SatellitePosition[]) => {
    setSatellites(prev => {
      const next = new Map(prev)
      for (const sat of sats) {
        next.set(sat.id, sat)
      }
      return next
    })
    countRef.current = sats.length
    setLastBulkUpdate(new Date())
  }, [])

  const replaceFull = useCallback((sats: SatellitePosition[]) => {
    const map = new Map<string, SatellitePosition>()
    for (const sat of sats) {
      map.set(sat.id, sat)
    }
    setSatellites(map)
    countRef.current = sats.length
    setLastBulkUpdate(new Date())
  }, [])

  const removeSatellite = useCallback((id: string) => {
    setSatellites(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSatellites(new Map())
    countRef.current = 0
  }, [])

  return {
    satellites,
    count: satellites.size,
    lastBulkUpdate,
    updateSingle,
    updateBulk,
    replaceFull,
    removeSatellite,
    clear,
  }
}
