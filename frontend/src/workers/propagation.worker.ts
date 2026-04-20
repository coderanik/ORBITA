/**
 * Web Worker for client-side SGP4 orbit propagation.
 * Offloads heavy math from the main thread to keep 60 FPS.
 * 
 * Usage from main thread:
 *   const worker = new Worker(new URL('./propagation.worker.ts', import.meta.url), { type: 'module' })
 *   worker.postMessage({ type: 'PROPAGATE', tles: [...], targetTime: Date.now() })
 *   worker.onmessage = (e) => { /* e.data = { positions: [...] } *\/ }
 */

// satellite.js would be imported here in production
// import { twoline2satrec, propagate, gstime, eciToGeodetic } from 'satellite.js'

interface TLEData {
  id: string
  name: string
  line1: string
  line2: string
}

interface PropagateMessage {
  type: 'PROPAGATE'
  tles: TLEData[]
  targetTime: number // ms since epoch
}

interface PositionResult {
  id: string
  name: string
  lat: number
  lon: number
  alt: number
}

// Listen for messages from the main thread
self.onmessage = function (event: MessageEvent<PropagateMessage>) {
  const { type, tles, targetTime } = event.data

  if (type === 'PROPAGATE') {
    // const date = new Date(targetTime)
    const results: PositionResult[] = []

    for (const tle of tles) {
      try {
        // In production with satellite.js:
        // const satrec = twoline2satrec(tle.line1, tle.line2)
        // const posVel = propagate(satrec, date)
        // const gmst = gstime(date)
        // const geo = eciToGeodetic(posVel.position, gmst)
        // results.push({
        //   id: tle.id,
        //   name: tle.name,
        //   lat: geo.latitude * (180 / Math.PI),
        //   lon: geo.longitude * (180 / Math.PI),
        //   alt: geo.height * 1000,
        // })

        // Placeholder: generate demo positions along orbital paths
        const norad = parseInt(tle.id) || 0
        const seed = norad * 137 + targetTime / 60000
        const inc = (norad % 90) + 10
        const phase = (seed * 0.001) % (2 * Math.PI)
        const lat = inc * Math.sin(phase)
        const lon = ((seed * 0.1) % 360) - 180
        const alt = 300000 + (norad % 600) * 1000

        results.push({ id: tle.id, name: tle.name, lat, lon, alt })
      } catch {
        // Skip TLEs that fail to parse
      }
    }

    self.postMessage({ type: 'POSITIONS', positions: results })
  }
}

export {} // Ensure this is treated as a module
