'use client'

import { formatFrequency, formatPitch } from '@/lib/utils/pitchUtils'
import { getSeverityColor } from '@/lib/dsp/eqAdvisor'
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Advisory } from '@/types/advisory'

// Velocity thresholds for runaway prediction
const RUNAWAY_VELOCITY_THRESHOLD = 15 // dB/s
const WARNING_VELOCITY_THRESHOLD = 10 // dB/s

interface IssuesListProps {
  advisories: Advisory[]
  maxIssues?: number
  appliedIds?: Set<string>
  onApply?: (advisory: Advisory) => void
}

export function IssuesList({ advisories, maxIssues = 10, appliedIds, onApply }: IssuesListProps) {
  // Sort by frequency (low → high) and slice to max
  const sorted = [...advisories]
    .sort((a, b) => (a.trueFrequencyHz ?? 0) - (b.trueFrequencyHz ?? 0))
    .slice(0, maxIssues)

  return (
    <div className="flex flex-col gap-2">
      {/* Issue cards */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
          <div className="text-sm">No issues detected</div>
          <div className="text-xs mt-1">Monitoring for feedback...</div>
        </div>
      ) : (
        sorted.map((advisory, index) => (
          <IssueCard
            key={advisory.id}
            advisory={advisory}
            rank={index + 1}
            isApplied={appliedIds?.has(advisory.id) ?? false}
            onApply={onApply}
          />
        ))
      )}
    </div>
  )
}

interface IssueCardProps {
  advisory: Advisory
  rank: number
  isApplied: boolean
  onApply?: (advisory: Advisory) => void
}

function IssueCard({ advisory, rank, isApplied, onApply }: IssueCardProps) {
  const severityColor = getSeverityColor(advisory.severity)
  const pitchStr = advisory.advisory?.pitch ? formatPitch(advisory.advisory.pitch) : '---'
  const freqStr = advisory.trueFrequencyHz != null ? formatFrequency(advisory.trueFrequencyHz) : '---'

  const geq = advisory.advisory?.geq
  const peq = advisory.advisory?.peq

  // Determine if this issue is at risk of runaway feedback
  const velocity = advisory.velocityDbPerSec ?? 0
  const isRunaway = velocity >= RUNAWAY_VELOCITY_THRESHOLD || advisory.isRunaway
  const isWarning = velocity >= WARNING_VELOCITY_THRESHOLD && !isRunaway

  // Estimate time to clip (0dB) if velocity is positive
  const timeToClipMs = advisory.predictedTimeToClipMs ?? (
    velocity > 0 && advisory.trueAmplitudeDb < 0
      ? ((0 - advisory.trueAmplitudeDb) / velocity) * 1000
      : null
  )
  const timeToClipStr = timeToClipMs != null && timeToClipMs < 5000
    ? `~${(timeToClipMs / 1000).toFixed(1)}s`
    : null

  const hasEq = !!(geq && peq)

  return (
    <div
      className={`flex flex-col gap-0.5 px-2 py-1.5 rounded border bg-card/80 transition-all ${
        isApplied
          ? 'border-primary/40 opacity-60'
          : isRunaway
            ? 'border-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
            : isWarning
              ? 'border-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.3)]'
              : 'border-border'
      }`}
      style={{ borderLeftColor: isApplied ? undefined : isRunaway ? '#ef4444' : isWarning ? '#f59e0b' : severityColor, borderLeftWidth: '3px' }}
    >
      {/* Runaway warning badge */}
      {(isRunaway || isWarning) && !isApplied && (
        <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide mb-0.5 ${
          isRunaway ? 'text-red-500' : 'text-amber-500'
        }`}>
          <AlertTriangle className={`w-3 h-3 ${isRunaway ? 'animate-pulse' : ''}`} />
          <span>{isRunaway ? 'RUNAWAY' : 'WARNING'}</span>
          {timeToClipStr && (
            <span className="font-mono ml-1 opacity-80">{timeToClipStr}</span>
          )}
          <span className="font-mono ml-auto opacity-60">+{velocity.toFixed(0)}dB/s</span>
        </div>
      )}

      {/* Main row: freq + severity + apply */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono text-xs font-medium text-foreground">
            {freqStr}Hz
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {pitchStr}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-[10px] font-semibold uppercase px-1 py-0.5 rounded"
            style={{ backgroundColor: severityColor, color: '#000' }}
          >
            {advisory.severity}
          </span>
          {hasEq && onApply && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => !isApplied && onApply(advisory)}
                    disabled={isApplied}
                    aria-label={isApplied ? 'Cut sent to EQ Notepad' : `Send cut to EQ Notepad (${freqStr}Hz)`}
                    className={`h-5 w-5 p-0 transition-colors ${
                      isApplied
                        ? 'text-primary cursor-default'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {isApplied
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <Circle className="w-3 h-3" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {isApplied ? 'Sent to EQ Notepad' : 'Send to EQ Notepad'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
