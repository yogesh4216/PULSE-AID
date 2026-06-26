import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const maxDuration = 30

type CoachRequestBody = {
  rate: number
  depthEstimate: string | number
  userType: 'bystander' | 'emt' | 'rescuer' | 'trainee'
}

function isValidBody(body: unknown): body is CoachRequestBody {
  if (!body || typeof body !== 'object') {
    return false
  }

  const payload = body as Record<string, unknown>

  return (
    typeof payload.rate === 'number' &&
    (typeof payload.depthEstimate === 'string' ||
      typeof payload.depthEstimate === 'number') &&
    (payload.userType === 'bystander' ||
      payload.userType === 'emt' ||
      payload.userType === 'rescuer' ||
      payload.userType === 'trainee')
  )
}

function normalizeDepthEstimate(depthEstimate: string | number) {
  if (typeof depthEstimate === 'string') {
    return depthEstimate
  }

  if (depthEstimate < 0.7) return 'too shallow'
  if (depthEstimate > 1.15) return 'too deep'
  return 'good'
}

function normalizeUserType(userType: CoachRequestBody['userType']) {
  if (userType === 'emt') return 'emt'
  return 'bystander'
}

function buildPrompt({ rate, depthEstimate, userType }: CoachRequestBody) {
  return `You are a CPR coaching assistant. Current stats: rate=${rate} compressions/min (target 100-120), depth=${normalizeDepthEstimate(depthEstimate)}, user type=${normalizeUserType(userType)}. Give one short calm corrective instruction under 15 words.`
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'GEMINI_API_KEY is not configured.' },
      { status: 500 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!isValidBody(body)) {
    return Response.json(
      {
        error:
          "Body must include { rate: number, depthEstimate: string, userType: 'bystander' | 'emt' }.",
      },
      { status: 400 },
    )
  }

  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
      { model: 'gemini-1.5-flash' },
    )
    const result = await model.generateContentStream(buildPrompt(body))
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Gemini coaching request failed:', error)
    return Response.json(
      { error: 'Unable to generate coaching instruction.' },
      { status: 500 },
    )
  }
}
