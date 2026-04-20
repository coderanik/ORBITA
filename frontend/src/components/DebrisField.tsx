import { useEffect, useRef } from 'react'
import { Cartesian3, Color, PointPrimitiveCollection, NearFarScalar } from 'cesium'

interface DebrisFragment {
  id: string
  lat: number
  lon: number
  alt: number
  size: 'small' | 'medium' | 'large'
}

interface DebrisFieldProps {
  fragments: DebrisFragment[]
  viewerRef: React.MutableRefObject<any>
}

/**
 * Renders a debris field from a simulated collision using
 * PointPrimitiveCollection. Each fragment is color-coded by size.
 * This component is designed for the Kessler Syndrome Simulator (Phase 7).
 */
export default function DebrisField({ fragments, viewerRef }: DebrisFieldProps) {
  const collectionRef = useRef<any>(null)

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer || fragments.length === 0) return

    // Remove old collection
    if (collectionRef.current) {
      viewer.scene.primitives.remove(collectionRef.current)
    }

    const collection = new PointPrimitiveCollection()

    for (const frag of fragments) {
      let color = Color.fromCssColorString('#94a3b8') // slate-400
      let size = 2

      if (frag.size === 'large') {
        color = Color.fromCssColorString('#ef4444') // red
        size = 6
      } else if (frag.size === 'medium') {
        color = Color.fromCssColorString('#f59e0b') // amber
        size = 4
      }

      collection.add({
        position: Cartesian3.fromDegrees(frag.lon, frag.lat, frag.alt),
        color,
        pixelSize: size,
        scaleByDistance: new NearFarScalar(1.0e2, 2.0, 8.0e6, 0.3),
        id: `debris-${frag.id}`,
      })
    }

    viewer.scene.primitives.add(collection)
    collectionRef.current = collection

    return () => {
      if (viewer && !viewer.isDestroyed() && collectionRef.current) {
        viewer.scene.primitives.remove(collectionRef.current)
        collectionRef.current = null
      }
    }
  }, [fragments, viewerRef])

  return null // Renders via Cesium primitives
}
