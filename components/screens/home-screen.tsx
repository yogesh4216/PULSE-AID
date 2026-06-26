'use client'

import useSWR from 'swr'
import { Activity, Heart, GraduationCap } from 'lucide-react'
import type { SessionData, SessionMode } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function scoreColor(score: number) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-primary'
}

export function HomeScreen({
  onStart,
}: {
  onStart: (mode: SessionMode) => void
}) {
  const { data } = useSWR<{ sessions: SessionData[] }>('/api/session', fetcher, {
    revalidateOnFocus: false,
  })

  const last = data?.sessions?.find((s) => s.endedAt) ?? data?.sessions?.[0]

  return (
    <div className="flex flex-col min-h-dvh px-5 pt-12 pb-8">
      <header className="flex items-center gap-2.5 mb-2">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15">
          <Activity className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-none">
            PulseAid
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            CPR coaching assistant
          </p>
        </div>
      </header>

      <p className="text-sm text-muted-foreground text-pretty mt-4 mb-8 leading-relaxed">
        Real-time compression rate and depth feedback with AI voice coaching.
        Place your phone on the patient&apos;s chest or hold it against your hand
        while compressing.
      </p>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onStart('live')}
          className="group flex flex-col items-start gap-2 min-h-[112px] rounded-2xl bg-primary text-primary-foreground px-6 py-5 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <Heart className="size-7" aria-hidden="true" />
            <span className="text-xl font-bold">Start CPR</span>
          </div>
          <span className="text-sm text-primary-foreground/85">
            Emergency mode — begin compressions now
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStart('practice')}
          className="group flex flex-col items-start gap-2 min-h-[112px] rounded-2xl bg-training text-training-foreground px-6 py-5 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <GraduationCap className="size-7" aria-hidden="true" />
            <span className="text-xl font-bold">Practice Mode</span>
          </div>
          <span className="text-sm text-training-foreground/85">
            Training with metronome and target guide
          </span>
        </button>
      </div>

      <div className="mt-auto pt-8">
        {last && last.score > 0 ? (
          <div className="rounded-2xl bg-card border border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Last session
                </p>
                <p className="text-sm text-foreground mt-1 capitalize">
                  {last.mode} &middot; {last.totalCompressions} compressions
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-3xl font-bold tabular-nums ${scoreColor(last.score)}`}
                >
                  {last.score}
                </p>
                <p className="text-xs text-muted-foreground">score</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            No sessions yet — your last score will appear here.
          </p>
        )}
      </div>
    </div>
  )
}
