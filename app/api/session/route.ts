import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { db, SESSION_TABLE_NAME } from '@/lib/dynamodb'

export const runtime = 'nodejs'

type SessionAction = 'create' | 'update' | 'end'

type SessionRequestBody = {
  action: SessionAction
  sessionData: {
    sessionId?: string
    id?: string
    mode?: string
    userId?: string
    startTime?: string
    createdAt?: number
    compressionCount?: number
    totalCompressions?: number
    avgRate?: number
    depthRating?: string
    endTime?: string
    endedAt?: number
    qualityScore?: number
    score?: number
    [key: string]: unknown
  }
}

function isValidAction(action: unknown): action is SessionAction {
  return action === 'create' || action === 'update' || action === 'end'
}

function buildUpdateExpression(fields: Record<string, unknown>) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined)

  if (entries.length === 0) {
    return null
  }

  const segments: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}

  entries.forEach(([key, value], index) => {
    const nameKey = `#field${index}`
    const valueKey = `:value${index}`

    segments.push(`${nameKey} = ${valueKey}`)
    names[nameKey] = key
    values[valueKey] = value
  })

  return {
    UpdateExpression: `SET ${segments.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }
}

function getSessionId(sessionData: SessionRequestBody['sessionData']) {
  return sessionData.sessionId ?? sessionData.id
}

export async function GET() {
  try {
    const result = await db.send(
      new ScanCommand({
        TableName: SESSION_TABLE_NAME,
        Limit: 25,
      }),
    )

    const sessions = [...(result.Items ?? [])].sort((a, b) => {
      const aTime =
        typeof a.createdAt === 'number'
          ? a.createdAt
          : new Date(String(a.startTime ?? 0)).getTime()
      const bTime =
        typeof b.createdAt === 'number'
          ? b.createdAt
          : new Date(String(b.startTime ?? 0)).getTime()

      return bTime - aTime
    })

    return Response.json({ sessions })
  } catch (error) {
    console.error('Session GET error:', error)
    return Response.json({ sessions: [] })
  }
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Request body is required.' }, { status: 400 })
  }

  const { action, sessionData } = body as SessionRequestBody

  if (!isValidAction(action) || !sessionData || typeof sessionData !== 'object') {
    return Response.json(
      { error: "Body must include action and sessionData." },
      { status: 400 },
    )
  }

  try {
    if (action === 'create') {
      const sessionId = getSessionId(sessionData) ?? crypto.randomUUID()
      const item = {
        ...sessionData,
        sessionId,
        id: sessionData.id ?? sessionId,
        userId: sessionData.userId ?? 'anonymous',
        startTime: sessionData.startTime ?? new Date().toISOString(),
        createdAt: sessionData.createdAt ?? Date.now(),
        status: 'active',
      }

      await db.send(
        new PutCommand({
          TableName: SESSION_TABLE_NAME,
          Item: item,
        }),
      )

      return Response.json(item, { status: 201 })
    }

    const sessionId = getSessionId(sessionData)

    if (!sessionId) {
      return Response.json(
        { error: 'sessionData.sessionId is required.' },
        { status: 400 },
      )
    }

    if (action === 'update') {
      const updatePayload = buildUpdateExpression({
        ...sessionData,
        sessionId: undefined,
        id: undefined,
        compressionCount:
          sessionData.compressionCount ?? sessionData.totalCompressions,
        avgRate: sessionData.avgRate,
        depthRating: sessionData.depthRating,
      })

      if (!updatePayload) {
        return Response.json(
          {
            error:
              'Provide at least one of compressionCount, avgRate, or depthRating.',
          },
          { status: 400 },
        )
      }

      const result = await db.send(
        new UpdateCommand({
          TableName: SESSION_TABLE_NAME,
          Key: { sessionId },
          ...updatePayload,
          ReturnValues: 'ALL_NEW',
        }),
      )

      return Response.json(result.Attributes ?? {})
    }

    const updatePayload = buildUpdateExpression({
      ...sessionData,
      sessionId: undefined,
      id: undefined,
      endTime:
        sessionData.endTime ??
        (typeof sessionData.endedAt === 'number'
          ? new Date(sessionData.endedAt).toISOString()
          : new Date().toISOString()),
      qualityScore: sessionData.qualityScore ?? sessionData.score,
      status: 'completed',
    })

    if (!updatePayload) {
      return Response.json({ error: 'Unable to end session.' }, { status: 400 })
    }

    const result = await db.send(
      new UpdateCommand({
        TableName: SESSION_TABLE_NAME,
        Key: { sessionId },
        ...updatePayload,
        ReturnValues: 'ALL_NEW',
      }),
    )

    return Response.json(result.Attributes ?? {})
  } catch (error) {
    console.error('Session API error:', error)
    return Response.json(
      { error: 'Failed to process session request.' },
      { status: 500 },
    )
  }
}
