'use client'

import { formatFrequency, formatPitch } from '@/lib/utils/pitchUtils'
import { getSeverityColor } from '@/lib/dsp/eqAdvisor'
import type { Advisory } from '@/types/advisory'

interface IssuesListProps {
  advisories: Advisory[]
  maxIssues?: number
}

export function IssuesList({ advisories, maxIssues = 10 }: IssuesListProps) {
  // Sort by frequency (low to high) for easier GEQ/PEQ navigation
  const sortedAdvisories = [...advisories].sort((a, b) => 
    (a.trueFrequencyHz ?? 0) - (b.trueFrequencyHz ?? 0)
  )
  const displayedAdvisories = sortedAdvisories.slice(0, maxIssues)

  if (displayedAdvisories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
        <div className="text-sm">No issues detected</div>
        <div className="text-xs mt-1">Monitoring for feedback...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {displayedAdvisories.map((advisory, index) => (
        <IssueCard key={advisory.id} advisory={advisory} rank={index + 1} />
      ))}
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
