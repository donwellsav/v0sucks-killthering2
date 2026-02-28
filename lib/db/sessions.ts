import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  started_at: string
  ended_at: string | null
  mode: string
  fft_size: number
  label: string | null
  event_count?: number
}

export async function createSession(params: {
  id: string
  mode: string
  fftSize: number
}): Promise<Session> {
  const rows = await sql`
    INSERT INTO sessions (id, mode, fft_size)
    VALUES (${params.id}, ${params.mode}, ${params.fftSize})
    RETURNING *
  `
  return rows[0] as Session
}

export async function endSession(id: string): Promise<Session> {
  const rows = await sql`
    UPDATE sessions
    SET ended_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0] as Session
}

export async function listSessions(limit = 50): Promise<Session[]> {
  const rows = await sql`
    SELECT
      s.*,
      COUNT(e.id)::int AS event_count
    FROM sessions s
    LEFT JOIN session_events e ON e.session_id = s.id AND e.event_type = 'issue_detected'
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT ${limit}
  `
  return rows as Session[]
}

export async function getSession(id: string): Promise<Session | null> {
  const rows = await sql`
    SELECT
      s.*,
      COUNT(e.id)::int AS event_count
    FROM sessions s
    LEFT JOIN session_events e ON e.session_id = s.id AND e.event_type = 'issue_detected'
    WHERE s.id = ${id}
    GROUP BY s.id
  `
  return (rows[0] as Session) ?? null
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface SessionEventRow {
  id: string
  session_id: string
  occurred_at: string
  event_type: string
  frequency: number | null
  amplitude: number | null
  severity: string | null
  classification: string | null
  q_factor: number | null
  bandwidth: number | null
  growth_rate: number | null
  metadata: Record<string, unknown> | null
}

export async function bulkInsertEvents(
  sessionId: string,
  events: Array<{
    id: string
    type: string
    timestamp: number
    data: Record<string, unknown>
  }>,
): Promise<void> {
  if (events.length === 0) return

  // Build per-row values and insert one at a time to keep parameterized queries safe
  for (const ev of events) {
    const d = ev.data as Record<string, unknown>
    const isIssue = ev.type === 'issue_detected'
    await sql`
      INSERT INTO session_events (
        id, session_id, occurred_at, event_type,
        frequency, amplitude, severity, classification,
        q_factor, bandwidth, growth_rate, metadata
      ) VALUES (
        ${ev.id},
        ${sessionId},
        ${new Date(ev.timestamp).toISOString()},
        ${ev.type},
        ${isIssue ? (d.frequency as number) : null},
        ${isIssue ? (d.amplitude as number) : null},
        ${isIssue ? (d.severity as string) : null},
        ${isIssue ? (d.classification as string) : null},
        ${isIssue ? (d.qFactor as number) : null},
        ${isIssue ? (d.bandwidth as number) : null},
        ${isIssue ? (d.growthRate as number) : null},
        ${isIssue ? null : JSON.stringify(d)}
      )
      ON CONFLICT (id) DO NOTHING
    `
  }
}

export async function getSessionEvents(sessionId: string): Promise<SessionEventRow[]> {
  const rows = await sql`
    SELECT * FROM session_events
    WHERE session_id = ${sessionId}
    ORDER BY occurred_at ASC
  `
  return rows as SessionEventRow[]
}
