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
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shouldReconnectRef = useRef(true)

  const connect = useCallback(function connect() {
    if (!shouldReconnectRef.current) return
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return

    const ws = new WebSocket(WS_BASE)

    ws.onopen = () => {
      setIsConnected(true)
      console.log('[WS] Connected to ORBITA stream')
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 15000)
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        if (msg.type === 'HEARTBEAT' || msg.type === 'PONG') {
          return
        }
        setLastMessage(msg)
        setMessageLog(prev => [...prev.slice(-99), msg]) // Keep last 100
      } catch {
        console.warn('[WS] Could not parse message:', event.data)
      }
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
      console.warn(
        `[WS] Disconnected (code=${event.code}, reason="${event.reason || 'none'}", clean=${event.wasClean}).`
      )
      if (shouldReconnectRef.current) {
        console.log('[WS] Reconnecting in 5s...')
        reconnectTimerRef.current = setTimeout(() => connect(), 5000)
      }
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      ws.close()
    }

    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { isConnected, lastMessage, messageLog, connect, disconnect }
}
