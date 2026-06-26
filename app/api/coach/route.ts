import { streamText } from 'ai'
import type { CoachRequest } from '@/lib/types'

export const maxDuration = 30

function buildPrompt({ rate, depthEstimate, userType }: CoachRequest) {
  const audience =
    userType === 'trainee'
      ? 'a trainee practicing CPR in a calm training setting'
      : 'a rescuer performing CPR in a real emergency'

  return `You are PulseAid, a CPR coaching voice. Give ONE short spoken coaching cue (max 12 words) for ${audience}.
Current compression rate: ${Math.round(rate)} per minute (target 100-120).
Current depth estimate: ${(depthEstimate * 100).toFixed(0)}% of ideal (target ~50-60mm).
Rules:
- If rate < 100: tell them to push faster.
- If rate > 120: tell them to slow down slightly.
- If depth < 0.7: tell them to push harder/deeper.
- If depth > 1.15: tell them to ease the depth.
- Otherwise: give brief encouragement to maintain.
Respond with ONLY the cue, no quotes, no extra text.`
}

/** Deterministic fallback so coaching never fails during an emergency. */
function fallbackCue({ rate, depthEstimate }: CoachRequest): string {
  if (rate > 0 && rate < 100) return 'Push faster — aim for one hundred per minute.'
  if (rate > 120) return 'Ease the pace slightly — stay under one twenty.'
  if (depthEstimate < 0.7) return 'Push harder and deeper, let the chest recoil.'
  if (depthEstimate > 1.15) return 'Slightly less depth, keep it steady.'
  if (rate === 0) return 'Begin compressions, center of the chest, push hard and fast.'
  return 'Great rhythm — keep it steady and strong.'
}

export async function POST(req: Request) {
  let body: CoachRequest
  try {
    body = (await req.json()) as CoachRequest
  } catch {
    body = { rate: 0, depthEstimate: 1, userType: 'rescuer' }
  }

  try {
    const result = streamText({
      model: 'openai/gpt-5-mini',
      prompt: buildPrompt(body),
      temperature: 0.6,
    })
    return result.toTextStreamResponse()
  } catch {
    // Stream the deterministic fallback as plain text.
    const text = fallbackCue(body)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
