'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  Activity,
  Gauge,
  ArrowDownToLine,
  Check,
  RotateCcw,
  Home,
  Sparkles,
} from 'lucide-react'
import type { SessionData } from '@/lib/types'

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function scoreColor(score: number) {
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--primary)'
}

const depthLabel = {
  shallow: 'Too Shallow',
  good: 'Good',
  deep: 'Too Deep',
} as const

const feedbackFetcher = async (session: SessionData) => {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  })
  return res.json() as Promise<{ bullets: string[] }>
}

export function SummaryScreen({
  session,
  onRestart,
  onHome,
}: {
  session: SessionData
  onRestart: () => void
  onHome: () => void
}) {
  const [saved, setSaved] = useState(false)

  const { data: feedback, isLoading } = useSWR(
    ['feedback', session.id],
    () => feedbackFetcher(session),
    { revalidateOnFocus: false },
  )

  const bullets = feedback?.bullets ?? []
  const color = scoreColor(session.score)

  // persist AI feedback back to the session record once generated
  useEffect(() => {
    if (bullets.length === 0) return
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        sessionData: { id: session.id, feedback: bullets },
      }),
    }).catch(() => {})
  }, [bullets, session.id])

  const stats = [
    {
      icon: Activity,
      label: 'Compressions',
      value: session.totalCompressions.toString(),
    },
    {
      icon: Gauge,
      label: 'Avg Rate',
      value: `${session.avgRate}/min`,
    },
    {
      icon: ArrowDownToLine,
      label: 'Depth',
      value: depthLabel[session.depthRating],
    },
  ]

  return (
    <div className="flex flex-col min-h-dvh px-5 pt-12 pb-8">
      <h1 className="text-2xl font-bold tracking-tight text-center">
        Session Summary
      </h1>
      <p className="text-sm text-muted-foreground text-center mt-1 capitalize">
        {session.mode} &middot; {formatTime(session.durationMs)}
      </p>

      {/* Score dial */}
      <div className="flex flex-col items-center justify-center my-8">
        <div
          className="flex flex-col items-center justify-center size-44 rounded-full"
          style={{
            border: `6px solid ${color}`,
            backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
          }}
        >
          <span
            className="text-6xl font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {session.score}
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
            Quality
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-card border border-border py-3 px-2"
          >
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-semibold text-center leading-tight">
              {value}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground text-center">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* AI feedback */}
      <div className="mt-6 rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-4 text-training" aria-hidden="true" />
          <h2 className="text-sm font-semibold">AI Coaching Feedback</h2>
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 rounded bg-secondary animate-pulse"
                style={{ width: `${90 - i * 12}%` }}
              />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span
                  className="mt-1.5 size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-pretty">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setSaved(true)}
          disabled={saved}
          className="flex items-center justify-center gap-2 w-full min-h-[64px] rounded-2xl bg-training text-training-foreground text-lg font-semibold transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          {saved ? (
            <>
              <Check className="size-5" aria-hidden="true" />
              Report Saved
            </>
          ) : (
            <>
              <ArrowDownToLine className="size-5" aria-hidden="true" />
              Save Report
            </>
          )}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 flex-1 min-h-[64px] rounded-2xl bg-primary text-primary-foreground text-base font-semibold transition-transform active:scale-[0.98]"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            Start Again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex items-center justify-center gap-2 flex-1 min-h-[64px] rounded-2xl bg-card border border-border text-foreground text-base font-semibold transition-transform active:scale-[0.98]"
          >
            <Home className="size-5" aria-hidden="true" />
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
