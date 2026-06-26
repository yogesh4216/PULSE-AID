import Link from 'next/link'

const RING_SIZE = 184
const RING_STROKE = 12
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

type SearchParams = Record<string, string | string[] | undefined>

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function allValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean)
  }

  return value ? [value] : []
}

function readNumber(value: string | null, fallback: number) {
  if (value === null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeDepthRating(value: string | null) {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'too shallow' || normalized === 'shallow') {
    return 'Too Shallow'
  }

  if (normalized === 'too deep' || normalized === 'deep') {
    return 'Too Deep'
  }

  return 'Good'
}

function getFeedback(searchParams: SearchParams) {
  const repeatedFeedback = allValues(searchParams.feedback)
  const keyedFeedback = ['feedback1', 'feedback2', 'feedback3']
    .map((key) => firstValue(searchParams[key]))
    .filter((value): value is string => Boolean(value))

  const feedback = repeatedFeedback.length > 0 ? repeatedFeedback : keyedFeedback

  if (feedback.length > 0) {
    return feedback.slice(0, 3)
  }

  return [
    'Keep your compression rate steady between 100 and 120 per minute.',
    'Let the chest fully recoil after every compression.',
    'Swap rescuers early if your depth starts to fade.',
  ]
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const score = clamp(readNumber(firstValue(params.score), 0), 0, 100)
  const compressionCount = Math.max(
    0,
    Math.round(
      readNumber(firstValue(params.compressions) ?? firstValue(params.count), 0),
    ),
  )
  const avgRate = Math.max(
    0,
    Math.round(
      readNumber(
        firstValue(params.avgRate) ?? firstValue(params.averageRate),
        0,
      ),
    ),
  )
  const depthRating = normalizeDepthRating(
    firstValue(params.depthRating) ?? firstValue(params.depth),
  )
  const feedback = getFeedback(params)
  const progressOffset =
    RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE

  const report = [
    'PULSE-AID SESSION REPORT',
    `Quality Score: ${score}/100`,
    `Total Compressions: ${compressionCount}`,
    `Average Rate: ${avgRate}/min`,
    `Depth Rating: ${depthRating}`,
    '',
    'AI Coaching Feedback:',
    ...feedback.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')

  const reportHref = `data:text/plain;charset=utf-8,${encodeURIComponent(report)}`

  return (
    <main className="min-h-dvh bg-[#0a0f1e] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[390px] flex-col rounded-[28px] border border-white/8 bg-white/4 px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-red-300/80">
            Session Summary
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            CPR performance recap
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Review the session, save the report, then start another round.
          </p>
        </div>

        <section className="mt-8 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <svg
              aria-hidden="true"
              className="-rotate-90"
              height={RING_SIZE}
              width={RING_SIZE}
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RING_RADIUS}
                stroke="#ef4444"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                strokeWidth={RING_STROKE}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-semibold tabular-nums">{score}</span>
              <span className="mt-2 text-xs uppercase tracking-[0.28em] text-slate-400">
                Quality Score
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-3">
          <div className="rounded-3xl border border-white/8 bg-[#12192c] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Total Compressions
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {compressionCount}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/8 bg-[#12192c] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Avg Rate
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {avgRate}
                <span className="ml-1 text-base font-medium text-slate-400">
                  /min
                </span>
              </p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-[#12192c] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Depth Rating
              </p>
              <p className="mt-2 text-xl font-semibold text-red-400">
                {depthRating}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-red-500/20 bg-[#12192c] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">
            AI Coaching Feedback
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
            {feedback.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto space-y-3 pt-8">
          <a
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#ef4444] px-4 text-base font-semibold text-white transition active:scale-[0.985]"
            download={`pulse-aid-session-${Date.now()}.txt`}
            href={reportHref}
          >
            Save Report
          </a>
          <Link
            className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-base font-semibold text-white transition active:scale-[0.985]"
            href="/"
          >
            Start Again
          </Link>
        </div>
      </div>
    </main>
  )
}
