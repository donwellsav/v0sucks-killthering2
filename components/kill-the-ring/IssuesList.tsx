'use client'

import { useState } from 'react'
import { formatFrequency, formatPitch } from '@/lib/utils/pitchUtils'
import { getSeverityColor } from '@/lib/dsp/eqAdvisor'
import type { Advisory, SeverityLevel } from '@/types/advisory'

interface IssuesListProps {
  advisories: Advisory[]
  maxIssues?: number
}

const ALL_SEVERITIES: SeverityLevel[] = [
  'RUNAWAY',
  'GROWING',
  'RESONANCE',
  'POSSIBLE_RING',
  'WHISTLE',
  'INSTRUMENT',
]

const SEVERITY_SHORT: Record<SeverityLevel, string> = {
  RUNAWAY: 'RUN',
  GROWING: 'GRW',
  RESONANCE: 'RES',
  POSSIBLE_RING: 'RNG',
  WHISTLE: 'WHI',
  INSTRUMENT: 'INS',
}

export function IssuesList({ advisories, maxIssues = 10 }: IssuesListProps) {
  // Track which severity levels are actively filtered (empty set = show all)
  const [activeFilters, setActiveFilters] = useState<Set<SeverityLevel>>(new Set())

  // Count per severity across all advisories (not just displayed)
  const counts = ALL_SEVERITIES.reduce<Record<SeverityLevel, number>>((acc, s) => {
    acc[s] = advisories.filter((a) => a.severity === s).length
    return acc
  }, {} as Record<SeverityLevel, number>)

  // Only show chips for severities that have at least one advisory
  const presentSeverities = ALL_SEVERITIES.filter((s) => counts[s] > 0)

  const toggleFilter = (s: SeverityLevel) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) {
        next.delete(s)
      } else {
        next.add(s)
      }
      return next
    })
  }

  // Filter + sort by frequency (low → high)
  const filtered = [...advisories]
    .filter((a) => activeFilters.size === 0 || activeFilters.has(a.severity))
    .sort((a, b) => (a.trueFrequencyHz ?? 0) - (b.trueFrequencyHz ?? 0))
    .slice(0, maxIssues)

  return (
    <div className="flex flex-col gap-2">
      {/* Severity filter chips — only shown when there are issues */}
      {presentSeverities.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by severity">
          {presentSeverities.map((s) => {
            const color = getSeverityColor(s)
            const active = activeFilters.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleFilter(s)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                  active
                    ? 'opacity-100 border-transparent'
                    : 'opacity-60 bg-transparent hover:opacity-90 border-border'
                }`}
                style={
                  active
                    ? { backgroundColor: color, color: '#000', borderColor: color }
                    : { color, borderColor: color }
                }
              >
                {SEVERITY_SHORT[s]}
                <span
                  className={`tabular-nums text-[8px] font-bold px-0.5 rounded ${active ? 'opacity-80' : ''}`}
                >
                  {counts[s]}
                </span>
              </button>
            )
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="px-1.5 py-0.5 rounded text-[9px] text-muted-foreground border border-border hover:text-foreground hover:border-foreground/30 transition-colors"
              aria-label="Clear all filters"
            >
              All
            </button>
          )}
        </div>
      )}

      {/* Issue cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
          {advisories.length === 0 ? (
            <>
              <div className="text-sm">No issues detected</div>
              <div className="text-xs mt-1">Monitoring for feedback...</div>
            </>
          ) : (
            <>
              <div className="text-sm">No matching issues</div>
              <div className="text-xs mt-1">
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        filtered.map((advisory, index) => (
          <IssueCard key={advisory.id} advisory={advisory} rank={index + 1} />
        ))
      )}
    </div>
  )
}

interface IssueCardProps {
  advisory: Advisory
  rank: number
}

function IssueCard({ advisory, rank }: IssueCardProps) {
  const severityColor = getSeverityColor(advisory.severity)
  const pitchStr = advisory.advisory?.pitch ? formatPitch(advisory.advisory.pitch) : '---'
  const freqStr = advisory.trueFrequencyHz != null ? formatFrequency(advisory.trueFrequencyHz) : '---'

  const geq = advisory.advisory?.geq
  const peq = advisory.advisory?.peq

  return (
    <div
      className="flex flex-col gap-0.5 px-2 py-1.5 rounded border border-border bg-card/80"
      style={{ borderLeftColor: severityColor, borderLeftWidth: '2px' }}
    >
      {/* Main row: freq + severity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-foreground">
            {freqStr}Hz
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {pitchStr}
          </span>
        </div>
        <span
          className="text-[10px] font-semibold uppercase px-1 py-0.5 rounded"
          style={{ backgroundColor: severityColor, color: '#000' }}
        >
          {advisory.severity}
        </span>
      </div>

      {/* EQ line */}
      {geq && peq && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">
            GEQ {geq.bandHz} <span className="text-foreground">{geq.suggestedDb}dB</span>
          </span>
          <span className="font-mono">
            PEQ Q{(peq.q ?? 1).toFixed(0)} <span className="text-foreground">{peq.gainDb ?? 0}dB</span>
          </span>
        </div>
      )}
    </div>
  )
}
