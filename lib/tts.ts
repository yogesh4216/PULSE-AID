'use client'

/** Lightweight wrapper around the Web Speech API for voice coaching. */
export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  const synth = window.speechSynthesis
  if (!synth) return

  // Cancel queued speech so cues stay current with the live rhythm.
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.05
  utterance.pitch = 1
  utterance.volume = 1
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window === 'undefined') return
  window.speechSynthesis?.cancel()
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
