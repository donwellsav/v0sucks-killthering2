import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

// GET: Retrieve room modes (most problematic frequencies)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const minOccurrences = parseInt(searchParams.get('minOccurrences') || '2', 10)

    const modes = await sql`
      SELECT 
        id,
        frequency_hz,
        frequency_band,
        occurrence_count,
        total_severity_score,
        avg_amplitude_db,
        avg_q_factor,
        avg_prominence_db,
        primary_classification,
        first_seen_at,
        last_seen_at,
        array_length(session_ids, 1) as session_count
      FROM room_modes
      WHERE occurrence_count >= ${minOccurrences}
      ORDER BY occurrence_count DESC, total_severity_score DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ modes })
  } catch (error) {
    console.error('[room-modes] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch room modes' }, { status: 500 })
  }
}

// POST: Record a room mode observation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      frequencyHz, 
      amplitudeDb, 
      qFactor, 
      prominenceDb, 
      classification, 
      severityScore,
      sessionId 
    } = body

    if (!frequencyHz || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: frequencyHz, sessionId' }, 
        { status: 400 }
      )
    }

    // Call the upsert function
    await sql`
      SELECT upsert_room_mode(
        ${frequencyHz}::DOUBLE PRECISION,
        ${amplitudeDb || -60}::DOUBLE PRECISION,
        ${qFactor || 10}::DOUBLE PRECISION,
        ${prominenceDb || 15}::DOUBLE PRECISION,
        ${classification || 'unknown'}::TEXT,
        ${severityScore || 1}::DOUBLE PRECISION,
        ${sessionId}::TEXT
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[room-modes] POST error:', error)
    return NextResponse.json({ error: 'Failed to record room mode' }, { status: 500 })
  }
}

// DELETE: Clear room modes (reset learning)
export async function DELETE() {
  try {
    await sql`DELETE FROM room_modes`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[room-modes] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to clear room modes' }, { status: 500 })
  }
}
