'use client'

import { depthRatingFromValue } from '@/lib/scoring'

const LABELS = {
  shallow: 'Too Shallow',
  good: 'Good',
  deep: 'Too Deep',
} as const

export function DepthBar({ depth }: { depth: number }) {
  const rating = depthRatingFromValue(depth)
  // map depth (0..1.6) to a 0..100 marker position
  const pos = Math.max(2, Math.min(98, (depth / 1.6) * 100))

  const ratingColor =
    rating === 'good'
      ? 'text-success'
      : rating === 'shallow'
        ? 'text-warning'
        : 'text-primary'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Depth
        </span>
        <span className={`text-sm font-semibold ${ratingColor}`}>
          {LABELS[rating]}
        </span>
      </div>

      <div className="relative h-3.5 rounded-full overflow-hidden bg-secondary">
        {/* zones: shallow | good | deep */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: '44%', backgroundColor: 'color-mix(in oklab, var(--warning) 35%, transparent)' }} />
          <div className="h-full" style={{ width: '28%', backgroundColor: 'color-mix(in oklab, var(--success) 45%, transparent)' }} />
          <div className="h-full" style={{ width: '28%', backgroundColor: 'color-mix(in oklab, var(--primary) 35%, transparent)' }} />
        </div>
        {/* marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-5 rounded-full border-2 border-background shadow transition-[left] duration-150"
          style={{
            left: `${pos}%`,
            backgroundColor:
              rating === 'good'
                ? 'var(--success)'
                : rating === 'shallow'
                  ? 'var(--warning)'
                  : 'var(--primary)',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>Shallow</span>
        <span>Ideal</span>
        <span>Deep</span>
      </div>
    </div>
  )
}
