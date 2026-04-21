import { useState, useEffect, useRef, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/v1/ws'

export interface WSMessage {
  type: string
  data: Record<string, unknown>
  ts: string
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const [messageLog, setMessageLog] = useState<WSMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_BASE)

    ws.onopen = () => {
      setIsConnected(true)
      console.log('[WS] Connected to ORBITA stream')
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        setLastMessage(msg)
        setMessageLog(prev => [...prev.slice(-99), msg]) // Keep last 100
      } catch {
        console.warn('[WS] Could not parse message:', event.data)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('[WS] Disconnected. Reconnecting in 5s...')
      reconnectTimerRef.current = setTimeout(() => connect(), 5000)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      ws.close()
    }

    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { isConnected, lastMessage, messageLog, connect, disconnect }
}
