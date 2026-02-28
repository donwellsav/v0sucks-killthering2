// Room Mode Learning Service
// Tracks problematic frequencies across sessions to identify venue-specific feedback patterns

export interface RoomMode {
  id: string
  frequencyHz: number
  frequencyBand: number
  occurrenceCount: number
  totalSeverityScore: number
  avgAmplitudeDb: number
  avgQFactor: number
  avgProminenceDb: number
  primaryClassification: string
  firstSeenAt: string
  lastSeenAt: string
  sessionCount: number
}

export interface RoomModeObservation {
  frequencyHz: number
  amplitudeDb: number
  qFactor: number
  prominenceDb: number
  classification: string
  severityScore: number
  sessionId: string
}

// Local buffer for batching observations
const observationBuffer: RoomModeObservation[] = []
let flushTimeout: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL_MS = 5000 // Flush every 5 seconds
const MAX_BUFFER_SIZE = 50 // Or when buffer reaches 50 items

/**
 * Record a room mode observation (buffered)
 */
export function recordRoomMode(observation: RoomModeObservation): void {
  observationBuffer.push(observation)

  // Flush if buffer is full
  if (observationBuffer.length >= MAX_BUFFER_SIZE) {
    flushRoomModes()
    return
  }

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushRoomModes, FLUSH_INTERVAL_MS)
  }
}

/**
 * Flush buffered observations to the server
 */
export async function flushRoomModes(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }

  if (observationBuffer.length === 0) return

  const toFlush = observationBuffer.splice(0, observationBuffer.length)

  // Send observations in parallel
  try {
    await Promise.all(
      toFlush.map((obs) =>
        fetch('/api/room-modes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frequencyHz: obs.frequencyHz,
            amplitudeDb: obs.amplitudeDb,
            qFactor: obs.qFactor,
            prominenceDb: obs.prominenceDb,
            classification: obs.classification,
            severityScore: obs.severityScore,
            sessionId: obs.sessionId,
          }),
        })
      )
    )
  } catch (err) {
    console.error('[roomModeService] Failed to flush observations:', err)
    // Re-add failed observations to buffer
    observationBuffer.unshift(...toFlush)
  }
}

/**
 * Fetch learned room modes from the server
 */
export async function fetchRoomModes(options: {
  limit?: number
  minOccurrences?: number
} = {}): Promise<RoomMode[]> {
  try {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.minOccurrences) params.set('minOccurrences', options.minOccurrences.toString())

    const res = await fetch(`/api/room-modes?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch room modes')

    const data = await res.json()
    
    // Map snake_case to camelCase
    return (data.modes || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      frequencyHz: m.frequency_hz,
      frequencyBand: m.frequency_band,
      occurrenceCount: m.occurrence_count,
      totalSeverityScore: m.total_severity_score,
      avgAmplitudeDb: m.avg_amplitude_db,
      avgQFactor: m.avg_q_factor,
      avgProminenceDb: m.avg_prominence_db,
      primaryClassification: m.primary_classification,
      firstSeenAt: m.first_seen_at,
      lastSeenAt: m.last_seen_at,
      sessionCount: m.session_count,
    }))
  } catch (err) {
    console.error('[roomModeService] Failed to fetch room modes:', err)
    return []
  }
}

/**
 * Clear all learned room modes
 */
export async function clearRoomModes(): Promise<boolean> {
  try {
    const res = await fetch('/api/room-modes', { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[roomModeService] Failed to clear room modes:', err)
    return false
  }
}

/**
 * Get severity score based on classification and amplitude
 */
export function computeSeverityScore(
  classification: string,
  amplitudeDb: number,
  prominenceDb: number
): number {
  // Base score from classification
  const classScores: Record<string, number> = {
    runaway: 10,
    growing: 7,
    resonance: 5,
    ring: 3,
    whistle: 2,
    instrument: 1,
    unknown: 1,
  }
  const baseScore = classScores[classification] || 1

  // Boost by amplitude (louder = more severe)
  const ampBoost = Math.max(0, (amplitudeDb + 60) / 30) // 0-2 range

  // Boost by prominence (more prominent = more severe)
  const promBoost = Math.max(0, prominenceDb / 20) // 0-1.5 range

  return baseScore * (1 + ampBoost) * (1 + promBoost)
}

/**
 * Check if a frequency is a known room mode
 * Returns the room mode if found within tolerance
 */
export function isKnownRoomMode(
  frequencyHz: number,
  roomModes: RoomMode[],
  toleranceHz: number = 15
): RoomMode | null {
  for (const mode of roomModes) {
    if (Math.abs(frequencyHz - mode.frequencyHz) <= toleranceHz) {
      return mode
    }
  }
  return null
}
