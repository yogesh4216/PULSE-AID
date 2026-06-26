'use client'

import { useCallback, useState } from 'react'
import type { SessionData, SessionMode } from '@/lib/types'
import { HomeScreen } from '@/components/screens/home-screen'
import { CprScreen } from '@/components/screens/cpr-screen'
import { SummaryScreen } from '@/components/screens/summary-screen'

type Screen = 'home' | 'cpr' | 'summary'

export function PulseAidApp() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<SessionMode>('live')
  const [summary, setSummary] = useState<SessionData | null>(null)

  const startSession = useCallback((nextMode: SessionMode) => {
    setMode(nextMode)
    setScreen('cpr')
  }, [])

  const endSession = useCallback((data: SessionData) => {
    setSummary(data)
    setScreen('summary')
  }, [])

  const goHome = useCallback(() => {
    setScreen('home')
  }, [])

  const restart = useCallback(() => {
    setScreen('cpr')
  }, [])

  if (screen === 'cpr') {
    return <CprScreen mode={mode} onEnd={endSession} onAbort={goHome} />
  }

  if (screen === 'summary' && summary) {
    return (
      <SummaryScreen
        session={summary}
        onRestart={restart}
        onHome={goHome}
      />
    )
  }

  return <HomeScreen onStart={startSession} />
}
