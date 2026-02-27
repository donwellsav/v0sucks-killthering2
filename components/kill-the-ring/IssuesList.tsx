'use client'

import { formatFrequency, formatPitch } from '@/lib/utils/pitchUtils'
import { getSeverityColor } from '@/lib/dsp/eqAdvisor'
import type { Advisory } from '@/types/advisory'

interface IssuesListProps {
  advisories: Advisory[]
  maxIssues?: number
}

export function IssuesList({ advisories, maxIssues = 10 }: IssuesListProps) {
  const displayedAdvisories = advisories.slice(0, maxIssues)

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
  const pitchStr = formatPitch(advisory.advisory.pitch)
  const freqStr = formatFrequency(advisory.trueFrequencyHz)

  return (
    <div 
      className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card"
      style={{ borderLeftColor: severityColor, borderLeftWidth: '3px' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{ backgroundColor: severityColor, color: '#000' }}
          >
            #{rank}
          </span>
          <span className="font-mono text-sm font-medium text-foreground">
            {freqStr}Hz
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {pitchStr}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-semibold uppercase"
            style={{ color: severityColor }}
          >
            {advisory.severity}
          </span>
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Level: <span className="font-mono text-foreground">{advisory.trueAmplitudeDb.toFixed(1)}dB</span>
        </span>
        <span>
          Q: <span className="font-mono text-foreground">{advisory.qEstimate.toFixed(1)}</span>
        </span>
        {advisory.velocityDbPerSec !== 0 && (
          <span>
            Growth: <span className="font-mono text-foreground">{advisory.velocityDbPerSec > 0 ? '+' : ''}{advisory.velocityDbPerSec.toFixed(1)}dB/s</span>
          </span>
        )}
      </div>

      {/* EQ Recommendation */}
      <div className="flex items-center gap-4 text-xs mt-1">
        <span className="text-muted-foreground">GEQ:</span>
        <span className="font-mono text-foreground">
          {advisory.advisory.geq.bandHz}Hz {advisory.advisory.geq.suggestedDb < 0 ? '' : '+'}{advisory.advisory.geq.suggestedDb}dB
        </span>
        <span className="text-muted-foreground">PEQ:</span>
        <span className="font-mono text-foreground">
          {advisory.advisory.peq.type} @ Q={advisory.advisory.peq.q.toFixed(1)} {advisory.advisory.peq.gainDb < 0 ? '' : '+'}{advisory.advisory.peq.gainDb}dB
        </span>
      </div>

      {/* Confidence and reasons */}
      {advisory.why.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {advisory.why.slice(0, 2).join(' | ')}
        </div>
      )}
    </div>
  )
}
