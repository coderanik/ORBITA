import { useState, useRef, useCallback, useEffect } from 'react'

export interface TimeControllerState {
  currentTime: Date
  isPlaying: boolean
  playbackSpeed: number
}

const SPEED_OPTIONS = [1, 10, 60, 600, 3600] // 1x, 10x, 60x, 600x, 3600x

export function useTimeController(startTime?: Date) {
  const [currentTime, setCurrentTime] = useState(startTime || new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const setTime = useCallback((time: Date) => {
    setCurrentTime(time)
  }, [])

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      const idx = SPEED_OPTIONS.indexOf(prev)
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    })
  }, [])

  const jumpForward = useCallback((seconds: number) => {
    setCurrentTime(prev => new Date(prev.getTime() + seconds * 1000))
  }, [])

  const jumpBackward = useCallback((seconds: number) => {
    setCurrentTime(prev => new Date(prev.getTime() - seconds * 1000))
  }, [])

  const resetToNow = useCallback(() => {
    setCurrentTime(new Date())
  }, [])

  useEffect(() => {
    if (isPlaying) {
      // Tick every 50ms for smooth animation
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => new Date(prev.getTime() + playbackSpeed * 50))
      }, 50)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, playbackSpeed])

  return {
    currentTime,
    isPlaying,
    playbackSpeed,
    speedOptions: SPEED_OPTIONS,
    play,
    pause,
    togglePlay,
    setTime,
    setPlaybackSpeed,
    cycleSpeed,
    jumpForward,
    jumpBackward,
    resetToNow,
  }
}
