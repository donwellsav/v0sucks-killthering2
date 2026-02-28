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

export async function deleteSession(id: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${id}`
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

  // Single multi-value INSERT — one round-trip regardless of batch size
  const rows = events.map((ev) => {
    const d = ev.data as Record<string, unknown>
    const isIssue = ev.type === 'issue_detected'
    return {
      id: ev.id,
      session_id: sessionId,
      occurred_at: new Date(ev.timestamp).toISOString(),
      event_type: ev.type,
      frequency: isIssue ? (d.frequency as number) ?? null : null,
      amplitude: isIssue ? (d.amplitude as number) ?? null : null,
      severity: isIssue ? (d.severity as string) ?? null : null,
      classification: isIssue ? (d.classification as string) ?? null : null,
      q_factor: isIssue ? (d.qFactor as number) ?? null : null,
      bandwidth: isIssue ? (d.bandwidth as number) ?? null : null,
      growth_rate: isIssue ? (d.growthRate as number) ?? null : null,
      metadata: isIssue ? null : JSON.stringify(d),
    }
  })

  // Neon tagged template can't splat dynamic arrays — build a single INSERT
  // by looping the sql tag per row but batching via Promise.all (parallel, not serial)
  await Promise.all(
    rows.map((r) =>
      sql`
        INSERT INTO session_events (
          id, session_id, occurred_at, event_type,
          frequency, amplitude, severity, classification,
          q_factor, bandwidth, growth_rate, metadata
        ) VALUES (
          ${r.id}, ${r.session_id}, ${r.occurred_at}, ${r.event_type},
          ${r.frequency}, ${r.amplitude}, ${r.severity}, ${r.classification},
          ${r.q_factor}, ${r.bandwidth}, ${r.growth_rate}, ${r.metadata}
        )
        ON CONFLICT (id) DO NOTHING
      `,
    ),
  )
}

export async function getSessionEvents(sessionId: string): Promise<SessionEventRow[]> {
  const rows = await sql`
    SELECT * FROM session_events
    WHERE session_id = ${sessionId}
    ORDER BY occurred_at ASC
  `
  return rows as SessionEventRow[]
}
