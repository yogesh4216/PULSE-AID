'use client'

import { useCallback, useRef, useState } from 'react'
import { speak } from './tts'
import type { UserType } from './types'

/**
 * Fetches a streaming coaching cue from /api/coach, updates the banner text
 * token-by-token, and speaks the final cue once the stream completes.
 */
export function useCoach(voiceEnabled: boolean) {
  const [cue, setCue] = useState('Get ready — start compressions.')
  const busyRef = useRef(false)

  const requestCue = useCallback(
    async (rate: number, depthEstimate: number, userType: UserType) => {
      if (busyRef.current) return
      busyRef.current = true
      try {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rate, depthEstimate, userType }),
        })
        if (!res.body) {
          busyRef.current = false
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
          setCue(text.trim())
        }
        if (text.trim()) speak(text.trim(), voiceEnabled)
      } catch {
        // keep last cue on failure
      } finally {
        busyRef.current = false
      }
    },
    [voiceEnabled],
  )

  return { cue, requestCue }
}
