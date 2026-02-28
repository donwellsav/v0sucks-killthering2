import { NextRequest, NextResponse } from 'next/server'
import { endSession, getSession, getSessionEvents } from '@/lib/db/sessions'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const [session, events] = await Promise.all([
      getSession(id),
      getSessionEvents(id),
    ])
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ session, events })
  } catch (err) {
    console.error('[sessions/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const session = await endSession(id)
    return NextResponse.json(session)
  } catch (err) {
    console.error('[sessions/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
