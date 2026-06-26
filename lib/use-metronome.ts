'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Drives a steady metronome at the given bpm. Returns a `tick` counter that
 * increments on every beat and plays a short click via the Web Audio API.
 */
export function useMetronome(active: boolean, bpm = 110) {
  const [tick, setTick] = useState(0)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!active) return

    const interval = 60000 / bpm

    const ensureCtx = () => {
      if (!ctxRef.current && typeof window !== 'undefined') {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (AC) ctxRef.current = new AC()
      }
      return ctxRef.current
    }

    const click = () => {
      const ctx = ensureCtx()
      if (!ctx) return
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 1000
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.07)
    }

    const id = setInterval(() => {
      setTick((t) => t + 1)
      click()
    }, interval)

    return () => clearInterval(id)
  }, [active, bpm])

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
    }
  }, [])

  return tick
}
