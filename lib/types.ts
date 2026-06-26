export type UserType = 'rescuer' | 'trainee'

export type DepthRating = 'shallow' | 'good' | 'deep'

export type SessionMode = 'live' | 'practice'

export interface CompressionEvent {
  /** ms since session start */
  t: number
  /** instantaneous rate in compressions per minute */
  rate: number
  /** estimated relative depth 0..1 */
  depth: number
}

export interface SessionData {
  id: string
  mode: SessionMode
  createdAt: number
  endedAt?: number
  durationMs: number
  totalCompressions: number
  avgRate: number
  avgDepth: number
  depthRating: DepthRating
  score: number
  feedback?: string[]
}

export interface SessionRecord extends SessionData {
  /** partition key value, mirrors id */
  pk?: string
}

export interface CoachRequest {
  rate: number
  depthEstimate: number
  userType: UserType
}

export type SessionAction = 'create' | 'update' | 'end'

export interface SessionApiRequest {
  action: SessionAction
  sessionData: Partial<SessionData> & { id?: string }
}
