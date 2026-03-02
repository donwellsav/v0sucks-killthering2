'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatFrequency } from '@/lib/utils/pitchUtils'
import type { Advisory, SpectrumData } from '@/types/advisory'

interface GBFEstimatorProps {
  /** Current spectrum data */
  spectrum: SpectrumData | null
  /** Active advisories */
  advisories: Advisory[]
  /** Feedback threshold in dB */
  feedbackThresholdDb: number
  /** Show detailed breakdown */
  showDetails?: boolean
  className?: string
}

interface GBFResult {
  /** Estimated gain before feedback in dB */
  gbfDb: number
  /** Frequency most likely to feedback first */
  criticalFrequency: number
  /** Current headroom at critical frequency */
  headroomDb: number
  /** Risk level: safe, caution, danger, critical */
  riskLevel: 'safe' | 'caution' | 'danger' | 'critical'
  /** Limiting factor description */
  limitingFactor: string
}

/**
 * Estimates Gain Before Feedback (GBF) based on current spectrum and advisories.
 * 
 * GBF = Threshold_dB - Peak_dB + Margin
 * 
 * The calculation considers:
 * 1. Current peak level vs threshold
 * 2. Growth rate of active candidates
 * 3. Number of near-threshold frequencies
 */
function calculateGBF(
  spectrum: SpectrumData | null,
  advisories: Advisory[],
  feedbackThresholdDb: number
): GBFResult {
  // Default safe result when no data
  if (!spectrum?.freqDb || spectrum.noiseFloorDb === null) {
    return {
      gbfDb: 20,
      criticalFrequency: 1000,
      headroomDb: 20,
      riskLevel: 'safe',
      limitingFactor: 'No active analysis',
    }
  }

  const noiseFloor = spectrum.noiseFloorDb
  const effectiveThreshold = spectrum.effectiveThresholdDb

  // Find the highest peak that's a feedback candidate
  let maxPeakDb = -120
  let criticalFreq = 1000
  let fastestGrowthRate = 0
  let closestToThreshold = Infinity

  for (const advisory of advisories) {
    const peakDb = advisory.trueAmplitudeDb
    const headroom = effectiveThreshold - peakDb

    if (peakDb > maxPeakDb) {
      maxPeakDb = peakDb
      criticalFreq = advisory.trueFrequencyHz
    }

    if (headroom < closestToThreshold) {
      closestToThreshold = headroom
    }

    if (advisory.growthRateDbPerSec && advisory.growthRateDbPerSec > fastestGrowthRate) {
      fastestGrowthRate = advisory.growthRateDbPerSec
    }
  }

  // If no advisories, check raw spectrum for highest peak
  if (advisories.length === 0) {
    const hzPerBin = spectrum.sampleRate / spectrum.fftSize
    for (let i = 1; i < spectrum.freqDb.length; i++) {
      const db = spectrum.freqDb[i]
      if (db > maxPeakDb && db > noiseFloor + 6) {
        maxPeakDb = db
        criticalFreq = i * hzPerBin
      }
    }
  }

  // Calculate base GBF from current headroom
  const currentHeadroom = effectiveThreshold - maxPeakDb
  
  // Apply growth rate penalty (fast-growing peaks reduce GBF)
  // If growing at 3 dB/s, reduce GBF by ~3 dB (1 second warning)
  const growthPenalty = Math.min(fastestGrowthRate, 6)
  
  // Apply count penalty for multiple near-threshold peaks
  const nearThresholdCount = advisories.filter(a => 
    effectiveThreshold - a.trueAmplitudeDb < 6
  ).length
  const countPenalty = Math.min(nearThresholdCount * 0.5, 3)

  // Final GBF estimate
  const gbfDb = Math.max(0, currentHeadroom - growthPenalty - countPenalty)

  // Determine risk level
  let riskLevel: GBFResult['riskLevel']
  if (gbfDb > 12) {
    riskLevel = 'safe'
  } else if (gbfDb > 6) {
    riskLevel = 'caution'
  } else if (gbfDb > 3) {
    riskLevel = 'danger'
  } else {
    riskLevel = 'critical'
  }

  // Determine limiting factor
  let limitingFactor: string
  if (growthPenalty > countPenalty && growthPenalty > 1) {
    limitingFactor = `Fast growth at ${formatFrequency(criticalFreq)}`
  } else if (nearThresholdCount > 2) {
    limitingFactor = `${nearThresholdCount} frequencies near threshold`
  } else if (currentHeadroom < 6) {
    limitingFactor = `Peak at ${formatFrequency(criticalFreq)} near threshold`
  } else {
    limitingFactor = 'System stable'
  }

  return {
    gbfDb,
    criticalFrequency: criticalFreq,
    headroomDb: currentHeadroom,
    riskLevel,
    limitingFactor,
  }
}

export function GBFEstimator({
  spectrum,
  advisories,
  feedbackThresholdDb,
  showDetails = false,
  className,
}: GBFEstimatorProps) {
  const gbf = useMemo(
    () => calculateGBF(spectrum, advisories, feedbackThresholdDb),
    [spectrum, advisories, feedbackThresholdDb]
  )

  const riskColors = {
    safe: 'text-green-500 bg-green-500/10 border-green-500/30',
    caution: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    danger: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    critical: 'text-red-500 bg-red-500/10 border-red-500/30 animate-pulse',
  }

  const riskLabels = {
    safe: 'SAFE',
    caution: 'CAUTION',
    danger: 'DANGER',
    critical: 'CRITICAL',
  }

  return (
    <div className={cn('rounded-lg border p-3', riskColors[gbf.riskLevel], className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
            Gain Before Feedback
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono">
              +{gbf.gbfDb.toFixed(1)}
            </span>
            <span className="text-sm opacity-70">dB</span>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-xs font-bold px-2 py-1 rounded',
            gbf.riskLevel === 'critical' ? 'bg-red-500 text-white' : 'bg-current/20'
          )}>
            {riskLabels[gbf.riskLevel]}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-current/20 space-y-1.5 text-xs opacity-80">
          <div className="flex justify-between">
            <span>Critical Frequency:</span>
            <span className="font-mono">{formatFrequency(gbf.criticalFrequency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Headroom:</span>
            <span className="font-mono">{gbf.headroomDb.toFixed(1)} dB</span>
          </div>
          <div className="flex justify-between">
            <span>Limiting Factor:</span>
            <span className="text-right">{gbf.limitingFactor}</span>
          </div>
        </div>
      )}

      {/* Visual meter */}
      <div className="mt-3">
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              gbf.riskLevel === 'safe' && 'bg-green-500',
              gbf.riskLevel === 'caution' && 'bg-yellow-500',
              gbf.riskLevel === 'danger' && 'bg-orange-500',
              gbf.riskLevel === 'critical' && 'bg-red-500',
            )}
            style={{ width: `${Math.min(100, (gbf.gbfDb / 20) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] mt-1 opacity-50">
          <span>0 dB</span>
          <span>+20 dB</span>
        </div>
      </div>
    </div>
  )
}

/**
 * GBFHeaderChip - Compact 4-line stacked box for the header bar.
 * Line 1: "Gain Before"
 * Line 2: "Feedback"
 * Line 3: "+20.0 dB"
 * Line 4: "SAFE" (color-coded)
 */
export function GBFHeaderChip({
  spectrum,
  advisories,
  feedbackThresholdDb,
}: Pick<GBFEstimatorProps, 'spectrum' | 'advisories' | 'feedbackThresholdDb'>) {
  const gbf = useMemo(
    () => calculateGBF(spectrum, advisories, feedbackThresholdDb),
    [spectrum, advisories, feedbackThresholdDb]
  )

  const borderColors = {
    safe:     'border-green-500/40',
    caution:  'border-yellow-500/40',
    danger:   'border-orange-500/40',
    critical: 'border-red-500/50',
  }

  const statusColors = {
    safe:     'text-green-400',
    caution:  'text-yellow-400',
    danger:   'text-orange-400',
    critical: 'text-red-400 animate-pulse',
  }

  return (
    <div
      className={cn(
        'hidden landscape:flex flex-col items-center justify-center px-3 py-1 rounded border bg-card/80',
        borderColors[gbf.riskLevel]
      )}
      title={`Gain Before Feedback — ${gbf.limitingFactor}`}
    >
      <span className="text-[8px] text-muted-foreground font-medium leading-tight">Gain Before</span>
      <span className="text-[8px] text-muted-foreground font-medium leading-tight">Feedback</span>
      <span className="text-[11px] font-mono font-bold leading-tight">+{gbf.gbfDb.toFixed(1)} dB</span>
      <span className={cn('text-[9px] font-bold uppercase leading-tight', statusColors[gbf.riskLevel])}>
        {gbf.riskLevel}
      </span>
    </div>
  )
}
