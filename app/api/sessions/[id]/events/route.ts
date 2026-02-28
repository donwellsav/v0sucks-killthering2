import { NextRequest, NextResponse } from 'next/server'
import { bulkInsertEvents } from '@/lib/db/sessions'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await req.json()
    const { events } = body as {
      events: Array<{
        id: string
        type: string
        timestamp: number
        data: Record<string, unknown>
      }>
    }
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'events must be an array' }, { status: 400 })
    }
    await bulkInsertEvents(id, events)
    return NextResponse.json({ saved: events.length })
  } catch (err) {
    console.error('[sessions/:id/events] POST error:', err)
    return NextResponse.json({ error: 'Failed to save events' }, { status: 500 })
  }
}
