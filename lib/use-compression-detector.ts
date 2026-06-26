'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CompressionEvent } from './types'

interface DetectorState {
  bpm: number
  depth: number
  totalCompressions: number
  /** increments on each detected compression; drives the pulse animation */
  beat: number
  usingMock: boolean
  events: CompressionEvent[]
}

const INITIAL: DetectorState = {
  bpm: 0,
  depth: 1,
  totalCompressions: 0,
  beat: 0,
  usingMock: false,
  events: [],
}

const REFRACTORY_MS = 280 // min gap between compressions (~214 bpm ceiling)
const PEAK_THRESHOLD = 2.2 // m/s^2 above gravity baseline to count as a push
const MOTION_REF_AMPLITUDE = 9 // amplitude mapped to "ideal" depth (1.0)

/**
 * Detects chest compressions from device motion. Falls back to generated
 * mock data when no accelerometer / permission is available so the app is
 * always demoable.
 */
export function useCompressionDetector(active: boolean) {
  const [state, setState] = useState<DetectorState>(INITIAL)
  const startRef = useRef<number>(0)
  const lastBeatRef = useRef<number>(0)
  const intervalsRef = useRef<number[]>([])
  const eventsRef = useRef<CompressionEvent[]>([])
  const mockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baselineRef = useRef<number>(9.81)
  const risingRef = useRef<boolean>(false)
  const peakRef = useRef<number>(0)

  const registerCompression = useCallback((depth: number) => {
    const now = performance.now()
    const gap = now - lastBeatRef.current
    lastBeatRef.current = now

    const intervals = intervalsRef.current
    if (gap > 0 && gap < 2000) {
      intervals.push(gap)
      if (intervals.length > 6) intervals.shift()
    }

    const avgGap =
      intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 0
    const bpm = avgGap > 0 ? Math.round(60000 / avgGap) : 0

    const event: CompressionEvent = {
      t: Math.round(now - startRef.current),
      rate: bpm,
      depth: Number(depth.toFixed(2)),
    }
    eventsRef.current.push(event)

    setState((prev) => ({
      bpm,
      depth,
      totalCompressions: prev.totalCompressions + 1,
      beat: prev.beat + 1,
      usingMock: prev.usingMock,
      events: eventsRef.current,
    }))
  }, [])

  // Mock generator: ~108 bpm with drift + depth wobble.
  const startMock = useCallback(() => {
    setState((prev) => ({ ...prev, usingMock: true }))
    let phase = 0
    const tick = () => {
      phase += 1
      // base interval ~555ms (108 bpm) with slow sinusoidal drift + jitter
      const drift = Math.sin(phase / 9) * 70
      const jitter = (Math.random() - 0.5) * 40
      const interval = 555 + drift + jitter
      // depth wobbles around ideal, occasionally shallow
      const depth = 0.95 + Math.sin(phase / 5) * 0.22 + (Math.random() - 0.5) * 0.12
      registerCompression(Math.max(0.4, depth))
      mockTimerRef.current = setTimeout(tick, Math.max(300, interval))
    }
    mockTimerRef.current = setTimeout(tick, 500)
  }, [registerCompression])

  const handleMotion = useCallback(
    (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc || acc.z == null) return
      const mag = Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
      )
      // slow baseline tracking
      baselineRef.current = baselineRef.current * 0.95 + mag * 0.05
      const delta = mag - baselineRef.current

      if (delta > PEAK_THRESHOLD) {
        risingRef.current = true
        peakRef.current = Math.max(peakRef.current, delta)
      } else if (risingRef.current && delta < PEAK_THRESHOLD * 0.4) {
        // falling edge -> compression completed
        const now = performance.now()
        if (now - lastBeatRef.current > REFRACTORY_MS) {
          const depth = Math.min(1.6, peakRef.current / MOTION_REF_AMPLITUDE)
          registerCompression(depth)
        }
        risingRef.current = false
        peakRef.current = 0
      }
    },
    [registerCompression],
  )

  useEffect(() => {
    if (!active) return

    // reset for a fresh session
    startRef.current = performance.now()
    lastBeatRef.current = performance.now()
    intervalsRef.current = []
    eventsRef.current = []
    setState(INITIAL)

    let cancelled = false
    let usingMotion = false

    const attachMotion = () => {
      usingMotion = true
      window.addEventListener('devicemotion', handleMotion)
    }

    const init = async () => {
      const hasMotion =
        typeof window !== 'undefined' && 'DeviceMotionEvent' in window
      const DME = (typeof window !== 'undefined'
        ? (window.DeviceMotionEvent as unknown as {
            requestPermission?: () => Promise<'granted' | 'denied'>
          })
        : undefined)

      if (hasMotion && typeof DME?.requestPermission === 'function') {
        try {
          const res = await DME.requestPermission()
          if (cancelled) return
          if (res === 'granted') {
            attachMotion()
            return
          }
        } catch {
          // fall through to mock
        }
      } else if (hasMotion) {
        // Attach the real sensor, but run a watchdog: if no *actual*
        // compression is detected within the window (e.g. desktop browsers
        // that fire devicemotion with null/zero data, or a stationary
        // device), fall back to mock so the app is always demoable.
        attachMotion()
        setTimeout(() => {
          if (cancelled) return
          if (eventsRef.current.length === 0 && !mockTimerRef.current) {
            window.removeEventListener('devicemotion', handleMotion)
            usingMotion = false
            startMock()
          }
        }, 2500)
        return
      }

      if (!cancelled) startMock()
    }

    init()

    return () => {
      cancelled = true
      if (usingMotion) window.removeEventListener('devicemotion', handleMotion)
      if (mockTimerRef.current) {
        clearTimeout(mockTimerRef.current)
        mockTimerRef.current = null
      }
    }
  }, [active, handleMotion, startMock])

  return state
}
