'use client'

import { useEffect, useRef, useState } from 'react'

interface PulseIndicatorProps {
  beat: number
  bpm: number
  /** practice ghost pulse trigger */
  ghostBeat?: number
  inRange: boolean
}

export function PulseIndicator({
  beat,
  bpm,
  ghostBeat,
  inRange,
}: PulseIndicatorProps) {
  const [popKey, setPopKey] = useState(0)
  const [ripples, setRipples] = useState<number[]>([])
  const rippleId = useRef(0)
  const firstBeat = useRef(true)

  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false
      return
    }
    setPopKey((k) => k + 1)
    const id = rippleId.current++
    setRipples((r) => [...r, id])
    const timer = setTimeout(() => {
      setRipples((r) => r.filter((x) => x !== id))
    }, 600)
    return () => clearTimeout(timer)
  }, [beat])

  const ringColor = inRange ? 'var(--training)' : 'var(--primary)'

  return (
    <div className="relative flex items-center justify-center size-64">
      {/* expanding ripples on each compression */}
      {ripples.map((id) => (
        <span
          key={id}
          className="absolute size-44 rounded-full animate-pulse-ring"
          style={{ border: `3px solid ${ringColor}` }}
          aria-hidden="true"
        />
      ))}

      {/* ghost target ring for practice mode */}
      {ghostBeat !== undefined && (
        <GhostRing trigger={ghostBeat} />
      )}

      {/* core circle */}
      <div
        key={popKey}
        className="animate-compression-pop relative flex flex-col items-center justify-center size-44 rounded-full"
        style={{
          backgroundColor: inRange
            ? 'color-mix(in oklab, var(--training) 22%, transparent)'
            : 'color-mix(in oklab, var(--primary) 22%, transparent)',
          border: `4px solid ${ringColor}`,
        }}
      >
        <span
          className="text-6xl font-bold tabular-nums leading-none"
          style={{ color: ringColor }}
        >
          {bpm > 0 ? bpm : '--'}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
          per min
        </span>
      </div>
    </div>
  )
}

function GhostRing({ trigger }: { trigger: number }) {
  const [key, setKey] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setKey((k) => k + 1)
  }, [trigger])

  return (
    <span
      key={key}
      className="absolute size-56 rounded-full animate-pulse-ring"
      style={{ border: '2px dashed color-mix(in oklab, var(--training) 70%, transparent)' }}
      aria-hidden="true"
    />
  )
}
