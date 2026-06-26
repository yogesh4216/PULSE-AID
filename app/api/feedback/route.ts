import { generateObject } from 'ai'
import { z } from 'zod'
import type { SessionData } from '@/lib/types'

export const maxDuration = 30

const schema = z.object({
  bullets: z.array(z.string()).length(3),
})

function fallbackFeedback(s: SessionData): string[] {
  const bullets: string[] = []

  if (s.avgRate === 0) {
    return [
      'No compressions were detected this session.',
      'Make sure the phone can sense motion while you compress.',
      'Aim for a steady 100–120 compressions per minute next time.',
    ]
  }

  if (s.avgRate < 100) {
    bullets.push(
      `Your average rate was ${s.avgRate}/min — push a little faster toward 100–120.`,
    )
  } else if (s.avgRate > 120) {
    bullets.push(
      `Your average rate was ${s.avgRate}/min — ease off slightly to stay under 120.`,
    )
  } else {
    bullets.push(
      `Excellent rate control at ${s.avgRate}/min, right in the target zone.`,
    )
  }

  if (s.depthRating === 'shallow') {
    bullets.push('Compressions were often shallow — push harder for full depth.')
  } else if (s.depthRating === 'deep') {
    bullets.push('Some compressions were too deep — let the chest fully recoil.')
  } else {
    bullets.push('Compression depth was consistent and effective.')
  }

  bullets.push(
    s.score >= 80
      ? 'Strong overall performance — keep practicing to maintain it.'
      : 'Focus on a steady metronome rhythm to improve your consistency.',
  )

  return bullets
}

export async function POST(req: Request) {
  let session: SessionData
  try {
    session = (await req.json()) as SessionData
  } catch {
    return Response.json({ bullets: [] }, { status: 400 })
  }

  try {
    const { object } = await generateObject({
      model: 'openai/gpt-5-mini',
      schema,
      prompt: `You are a CPR instructor reviewing a ${session.mode} session.
Stats: score ${session.score}/100, average rate ${session.avgRate}/min (target 100-120),
depth rating "${session.depthRating}", ${session.totalCompressions} total compressions,
duration ${Math.round(session.durationMs / 1000)}s.
Give exactly 3 short, specific, encouraging coaching bullet points (max 16 words each).`,
    })
    return Response.json(object)
  } catch {
    return Response.json({ bullets: fallbackFeedback(session) })
  }
}
