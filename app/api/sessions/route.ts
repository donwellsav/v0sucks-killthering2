import { NextRequest, NextResponse } from 'next/server'
import { createSession, listSessions } from '@/lib/db/sessions'

export async function GET() {
  try {
    const sessions = await listSessions(50)
    return NextResponse.json(sessions)
  } catch (err) {
    console.error('[sessions] GET error:', err)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, mode, fftSize } = body as { id: string; mode: string; fftSize: number }
    if (!id || !mode || !fftSize) {
      return NextResponse.json({ error: 'Missing id, mode, or fftSize' }, { status: 400 })
    }
    const session = await createSession({ id, mode, fftSize })
    return NextResponse.json(session, { status: 201 })
  } catch (err) {
    console.error('[sessions] POST error:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
