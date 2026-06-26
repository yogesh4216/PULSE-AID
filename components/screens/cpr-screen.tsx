'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { Volume2, VolumeX, Smartphone, X } from 'lucide-react'
import type { SessionData, SessionMode } from '@/lib/types'
import { useCompressionDetector } from '@/lib/use-compression-detector'
import { useMetronome } from '@/lib/use-metronome'
import { useCoach } from '@/lib/use-coach'
import { computeSessionStats } from '@/lib/scoring'
import { stopSpeaking, ttsSupported } from '@/lib/tts'
import { PulseIndicator } from '@/components/cpr/pulse-indicator'
import { DepthBar } from '@/components/cpr/depth-bar'

const TARGET_BPM = 110

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function CprScreen({
  mode,
  onEnd,
  onAbort,
}: {
  mode: SessionMode
  onEnd: (data: SessionData) => void
  onAbort: () => void
}) {
  const isPractice = mode === 'practice'
  const accent = isPractice ? 'var(--training)' : 'var(--primary)'

  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const sessionIdRef = useRef<string>(nanoid())
  const endedRef = useRef(false)

  const detector = useCompressionDetector(true)
  const metronomeTick = useMetronome(isPractice, TARGET_BPM)
  const { cue, requestCue } = useCoach(voiceEnabled && ttsSupported())

  const inRange = detector.bpm >= 100 && detector.bpm <= 120

  // session timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current)
    }, 250)
    return () => clearInterval(id)
  }, [])

  // create session record on mount
  useEffect(() => {
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        sessionData: { id: sessionIdRef.current, mode },
      }),
    }).catch(() => {})
  }, [mode])

  // request a fresh coaching cue every ~5s once we have data
  useEffect(() => {
    const userType = isPractice ? 'trainee' : 'rescuer'
    const id = setInterval(() => {
      requestCue(detector.bpm, detector.depth, userType)
    }, 5000)
    return () => clearInterval(id)
  }, [detector.bpm, detector.depth, isPractice, requestCue])

  const handleEnd = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    stopSpeaking()

    const stats = computeSessionStats(detector.events)
    const durationMs = Date.now() - startTimeRef.current
    const data: SessionData = {
      id: sessionIdRef.current,
      mode,
      createdAt: startTimeRef.current,
      endedAt: Date.now(),
      durationMs,
      totalCompressions: stats.totalCompressions,
      avgRate: stats.avgRate,
      avgDepth: stats.avgDepth,
      depthRating: stats.depthRating,
      score: stats.score,
    }

    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', sessionData: data }),
    }).catch(() => {})

    onEnd(data)
  }, [detector.events, mode, onEnd])

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Coaching banner */}
      <div
        className="px-4 pt-10 pb-4 text-center"
        style={{
          background: `linear-gradient(to bottom, color-mix(in oklab, ${accent} 16%, transparent), transparent)`,
        }}
        aria-live="polite"
      >
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          {isPractice ? 'Practice Coach' : 'Voice Coach'}
        </p>
        <p className="text-lg font-semibold text-balance leading-snug min-h-[3.5rem] flex items-center justify-center">
          {cue}
        </p>
      </div>

      {/* Top bar: mode + timer + voice toggle */}
      <div className="flex items-center justify-between px-5">
        <span
          className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
          style={{
            color: accent,
            backgroundColor: `color-mix(in oklab, ${accent} 18%, transparent)`,
          }}
        >
          {isPractice ? 'Practice' : 'Emergency'}
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {formatTime(elapsed)}
        </span>
        <button
          type="button"
          onClick={() => {
            if (voiceEnabled) stopSpeaking()
            setVoiceEnabled((v) => !v)
          }}
          aria-label={voiceEnabled ? 'Mute voice coaching' : 'Enable voice coaching'}
          className="flex items-center justify-center size-10 rounded-full bg-secondary text-foreground"
        >
          {voiceEnabled ? (
            <Volume2 className="size-5" aria-hidden="true" />
          ) : (
            <VolumeX className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Pulse indicator */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <PulseIndicator
          beat={detector.beat}
          bpm={detector.bpm}
          ghostBeat={isPractice ? metronomeTick : undefined}
          inRange={inRange}
        />
        <p className="text-xs text-muted-foreground">
          Target 100&ndash;120 / min
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {detector.totalCompressions} compressions
        </p>
      </div>

      {/* Depth + sensor status + end button */}
      <div className="px-5 pb-8 flex flex-col gap-4">
        <DepthBar depth={detector.depth} />

        {detector.usingMock && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Smartphone className="size-3.5" aria-hidden="true" />
            <span>Simulated motion — no accelerometer detected</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleEnd}
          className="flex items-center justify-center gap-2 w-full min-h-[64px] rounded-2xl bg-card border-2 border-border text-foreground text-lg font-semibold transition-transform active:scale-[0.98]"
        >
          <X className="size-5" aria-hidden="true" />
          End Session
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          stopSpeaking()
          onAbort()
        }}
        className="sr-only"
      >
        Cancel and return home
      </button>
    </div>
  )
}
