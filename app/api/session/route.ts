import { nanoid } from 'nanoid'
import {
  createSession,
  updateSession,
  getSession,
  getRecentSessions,
} from '@/lib/db'
import type {
  SessionApiRequest,
  SessionData,
  DepthRating,
} from '@/lib/types'

function ratingFromDepth(avgDepth: number): DepthRating {
  if (avgDepth < 0.7) return 'shallow'
  if (avgDepth > 1.15) return 'deep'
  return 'good'
}

// GET /api/session  -> recent sessions (used for "last session score")
export async function GET() {
  try {
    const sessions = await getRecentSessions(10)
    return Response.json({ sessions })
  } catch (err) {
    console.log('[v0] session GET error:', (err as Error).message)
    return Response.json({ sessions: [] })
  }
}

export async function POST(req: Request) {
  let body: SessionApiRequest
  try {
    body = (await req.json()) as SessionApiRequest
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { action, sessionData } = body

  try {
    if (action === 'create') {
      const now = Date.now()
      const session: SessionData = {
        id: sessionData.id || nanoid(),
        mode: sessionData.mode || 'live',
        createdAt: now,
        durationMs: 0,
        totalCompressions: 0,
        avgRate: 0,
        avgDepth: 0,
        depthRating: 'good',
        score: 0,
      }
      const created = await createSession(session)
      return Response.json({ session: created })
    }

    if (action === 'update') {
      if (!sessionData.id) {
        return Response.json({ error: 'Missing session id' }, { status: 400 })
      }
      const updated = await updateSession(sessionData.id, sessionData)
      return Response.json({ session: updated })
    }

    if (action === 'end') {
      if (!sessionData.id) {
        return Response.json({ error: 'Missing session id' }, { status: 400 })
      }
      const avgDepth = sessionData.avgDepth ?? 0
      const finalData: Partial<SessionData> = {
        ...sessionData,
        endedAt: Date.now(),
        depthRating: sessionData.depthRating || ratingFromDepth(avgDepth),
      }
      const ended = await updateSession(sessionData.id, finalData)
      return Response.json({ session: ended })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.log('[v0] session POST error:', (err as Error).name, (err as Error).message)
    return Response.json(
      { error: 'Storage error', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
