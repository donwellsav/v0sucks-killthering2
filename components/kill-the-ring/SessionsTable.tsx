'use client'

import Link from 'next/link'
import type { Session } from '@/lib/db/sessions'

interface SessionsTableProps {
  sessions: Session[]
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In progress'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const MODE_LABELS: Record<string, string> = {
  feedbackHunt: 'Feedback Hunt',
  vocalRing: 'Vocal Ring',
  musicAware: 'Music-Aware',
  aggressive: 'Aggressive',
  calibration: 'Calibration',
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg text-center gap-3">
        <svg className="w-10 h-10 text-muted-foreground/30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.31-2.5-4.06v8.12c1.48-.75 2.5-2.29 2.5-4.06zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <p className="text-sm text-muted-foreground">No sessions yet</p>
        <p className="text-xs text-muted-foreground/70">Start an analysis on the main page to record your first session.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Desktop table */}
      <table className="hidden sm:table w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Started</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Mode</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">FFT</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Duration</th>
            <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Issues</th>
            <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr
              key={s.id}
              className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}
            >
              <td className="px-4 py-3 font-mono text-foreground/80">{formatDate(s.started_at)}</td>
              <td className="px-4 py-3 text-foreground">{MODE_LABELS[s.mode] ?? s.mode}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{s.fft_size}</td>
              <td className="px-4 py-3 font-mono text-muted-foreground">{formatDuration(s.started_at, s.ended_at)}</td>
              <td className="px-4 py-3 text-right">
                <span className={`font-mono font-medium ${(s.event_count ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.event_count ?? 0}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {s.ended_at ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Ended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-border">
        {sessions.map((s) => (
          <div key={s.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{formatDate(s.started_at)}</span>
              {s.ended_at ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Ended</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{MODE_LABELS[s.mode] ?? s.mode}</span>
              <span className="font-mono">{s.fft_size}pt</span>
              <span className="font-mono">{formatDuration(s.started_at, s.ended_at)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Issues: </span>
              <span className={`font-mono font-medium ${(s.event_count ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.event_count ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
