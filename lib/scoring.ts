import type { CompressionEvent, DepthRating } from './types'

export function depthRatingFromValue(depth: number): DepthRating {
  if (depth < 0.7) return 'shallow'
  if (depth > 1.15) return 'deep'
  return 'good'
}

/** Score a single rate value (compressions/min) against the 100-120 target. */
export function rateScore(rate: number): number {
  if (rate <= 0) return 0
  if (rate >= 100 && rate <= 120) return 1
  const distance = rate < 100 ? 100 - rate : rate - 120
  return Math.max(0, 1 - distance / 40)
}

/** Score a single depth value (1.0 == ideal). */
export function depthScore(depth: number): number {
  if (depth <= 0) return 0
  const distance = Math.abs(depth - 1)
  return Math.max(0, 1 - distance / 0.6)
}

export interface SessionStats {
  totalCompressions: number
  avgRate: number
  avgDepth: number
  score: number
  depthRating: DepthRating
}

export function computeSessionStats(
  events: CompressionEvent[],
): SessionStats {
  if (events.length === 0) {
    return {
      totalCompressions: 0,
      avgRate: 0,
      avgDepth: 0,
      score: 0,
      depthRating: 'good',
    }
  }

  const rated = events.filter((e) => e.rate > 0)
  const avgRate =
    rated.reduce((sum, e) => sum + e.rate, 0) / Math.max(1, rated.length)
  const avgDepth =
    events.reduce((sum, e) => sum + e.depth, 0) / events.length

  const rScore =
    rated.reduce((sum, e) => sum + rateScore(e.rate), 0) /
    Math.max(1, rated.length)
  const dScore =
    events.reduce((sum, e) => sum + depthScore(e.depth), 0) / events.length

  // 60% rate, 40% depth.
  const score = Math.round((rScore * 0.6 + dScore * 0.4) * 100)

  return {
    totalCompressions: events.length,
    avgRate: Math.round(avgRate),
    avgDepth: Number(avgDepth.toFixed(2)),
    score,
    depthRating: depthRatingFromValue(avgDepth),
  }
}
