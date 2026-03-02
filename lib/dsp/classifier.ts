// KillTheRing2 Classifier - Distinguishes feedback vs whistle vs instrument

import { CLASSIFIER_WEIGHTS, SEVERITY_THRESHOLDS } from './constants'
import type { Track, ClassificationResult, SeverityLevel, IssueLabel, TrackedPeak, DetectorSettings } from '@/types/advisory'

// Type union for track input
type TrackInput = Track | TrackedPeak

// Helper to normalize input to common interface
function normalizeTrackInput(input: TrackInput) {
  // Check if it's a TrackedPeak (has 'frequency' field) or Track (has 'trueFrequencyHz')
  if ('trueFrequencyHz' in input) {
    return {
      velocityDbPerSec: input.velocityDbPerSec,
      stabilityCentsStd: input.features.stabilityCentsStd,
      harmonicityScore: input.features.harmonicityScore,
      modulationScore: input.features.modulationScore,
      noiseSidebandScore: input.features.noiseSidebandScore,
      maxVelocityDbPerSec: input.features.maxVelocityDbPerSec,
      minQ: input.features.minQ,
      persistenceMs: input.features.persistenceMs,
    }
  }
  // TrackedPeak
  return {
    velocityDbPerSec: input.features.velocityDbPerSec,
    stabilityCentsStd: input.features.stabilityCentsStd,
    harmonicityScore: input.features.harmonicityScore,
    modulationScore: input.features.modulationScore,
    noiseSidebandScore: 0, // TrackedPeak doesn't have this
    maxVelocityDbPerSec: Math.abs(input.features.velocityDbPerSec),
    minQ: input.qEstimate,
    persistenceMs: input.lastUpdateTime - input.onsetTime,
  }
}

/**
 * Classify a track as feedback, whistle, or instrument
 * Uses weighted scoring model based on extracted features
 */
export function classifyTrack(track: TrackInput, settings?: DetectorSettings): ClassificationResult {
  const features = normalizeTrackInput(track)
  const reasons: string[] = []

  // Initialize probabilities
  let pFeedback = 0.33
  let pWhistle = 0.33
  let pInstrument = 0.33

  // ==================== Feature Analysis ====================

  // 1. Stationarity (low pitch variation = feedback)
  const stabilityScore = features.stabilityCentsStd < CLASSIFIER_WEIGHTS.STABILITY_THRESHOLD_CENTS ? 1 : 0
  if (stabilityScore > 0) {
    pFeedback += CLASSIFIER_WEIGHTS.STABILITY_FEEDBACK * stabilityScore
    reasons.push(`Pitch stability: ${features.stabilityCentsStd.toFixed(1)} cents std dev`)
  } else {
    // High variation suggests whistle or instrument
    pWhistle += 0.1
    pInstrument += 0.1
  }

  // 2. Harmonicity (coherent harmonics = instrument)
  if (features.harmonicityScore > CLASSIFIER_WEIGHTS.HARMONICITY_THRESHOLD) {
    pInstrument += CLASSIFIER_WEIGHTS.HARMONICITY_INSTRUMENT * features.harmonicityScore
    reasons.push(`Harmonic structure detected: ${(features.harmonicityScore * 100).toFixed(0)}%`)
  }

  // 3. Modulation (vibrato = whistle)
  if (features.modulationScore > CLASSIFIER_WEIGHTS.MODULATION_THRESHOLD) {
    pWhistle += CLASSIFIER_WEIGHTS.MODULATION_WHISTLE * features.modulationScore
    reasons.push(`Vibrato/modulation: ${(features.modulationScore * 100).toFixed(0)}%`)
  }

  // 4. Sideband noise (breath = whistle)
  if (features.noiseSidebandScore > CLASSIFIER_WEIGHTS.SIDEBAND_THRESHOLD) {
    pWhistle += CLASSIFIER_WEIGHTS.SIDEBAND_WHISTLE * features.noiseSidebandScore
    reasons.push(`Breath noise detected: ${(features.noiseSidebandScore * 100).toFixed(0)}%`)
  }

  // 5. Runaway growth (high velocity = feedback)
  if (features.maxVelocityDbPerSec > CLASSIFIER_WEIGHTS.GROWTH_THRESHOLD) {
    const growthFactor = Math.min(features.maxVelocityDbPerSec / 20, 1)
    pFeedback += CLASSIFIER_WEIGHTS.GROWTH_FEEDBACK * growthFactor
    reasons.push(`Rapid growth: ${features.maxVelocityDbPerSec.toFixed(1)} dB/sec`)
  }

  // 6. Q factor (very narrow = feedback)
  if (features.minQ > SEVERITY_THRESHOLDS.HIGH_Q) {
    pFeedback += 0.15
    reasons.push(`Narrow Q: ${features.minQ.toFixed(1)}`)
  }

  // 7. Persistence without modulation
  if (features.persistenceMs > 1000 && features.modulationScore < 0.2) {
    pFeedback += 0.1
    reasons.push(`Sustained without modulation: ${(features.persistenceMs / 1000).toFixed(1)}s`)
  }

  // ==================== Normalization ====================

  const total = pFeedback + pWhistle + pInstrument
  if (total > 0) {
    pFeedback /= total
    pWhistle /= total
    pInstrument /= total
  }

  // Calculate unknown probability
  const confidence = Math.max(pFeedback, pWhistle, pInstrument)
  const pUnknown = 1 - confidence

  // ==================== Classification ====================

  let label: IssueLabel
  let severity: SeverityLevel

  // Determine severity based on velocity and other factors
  if (features.maxVelocityDbPerSec >= SEVERITY_THRESHOLDS.RUNAWAY_VELOCITY) {
    severity = 'RUNAWAY'
    pFeedback = Math.max(pFeedback, 0.7) // Runaway almost always feedback
  } else if (features.maxVelocityDbPerSec >= SEVERITY_THRESHOLDS.GROWING_VELOCITY) {
    severity = 'GROWING'
  } else if (features.minQ > SEVERITY_THRESHOLDS.HIGH_Q) {
    severity = 'RESONANCE'
  } else if (features.persistenceMs < SEVERITY_THRESHOLDS.PERSISTENCE_MS) {
    severity = 'POSSIBLE_RING'
  } else {
    severity = 'RESONANCE'
  }

  // Determine label
  if (pWhistle >= CLASSIFIER_WEIGHTS.WHISTLE_THRESHOLD && pWhistle > pFeedback) {
    label = 'WHISTLE'
    severity = 'WHISTLE'
  } else if (pInstrument >= CLASSIFIER_WEIGHTS.INSTRUMENT_THRESHOLD && pInstrument > pFeedback) {
    label = 'INSTRUMENT'
    severity = 'INSTRUMENT'
  } else if (severity === 'POSSIBLE_RING') {
    label = 'POSSIBLE_RING'
  } else {
    label = 'ACOUSTIC_FEEDBACK'
  }

  // Override: Runaway is always feedback
  if (severity === 'RUNAWAY') {
    label = 'ACOUSTIC_FEEDBACK'
  }

  return {
    pFeedback,
    pWhistle,
    pInstrument,
    pUnknown,
    label,
    severity,
    confidence,
    reasons,
  }
}

/**
 * Determine if an issue should be reported based on mode and classification
 */
export function shouldReportIssue(
  classification: ClassificationResult,
  settings: DetectorSettings
): boolean {
  const mode = settings.mode
  const ignoreWhistle = !settings.musicAware // If music aware, don't filter whistles
  const { label, severity } = classification

  // Always report runaway regardless of mode
  if (severity === 'RUNAWAY') {
    return true
  }

  // Handle whistle filtering
  if (label === 'WHISTLE' && ignoreWhistle) {
    return false
  }

  // Mode-specific filtering
  switch (mode) {
    case 'feedbackHunt':
      // Report feedback and possible rings, not instruments
      return label !== 'INSTRUMENT'

    case 'vocalRing':
      // Report all issues including possible rings
      return true

    case 'musicAware':
      // Skip instruments unless severity is RUNAWAY
      if (label === 'INSTRUMENT') {
        return severity === 'RUNAWAY'
      }
      return true

    case 'aggressive':
      // Report everything
      return true

    case 'calibration':
      // Report everything including instruments
      return true

    default:
      return label === 'ACOUSTIC_FEEDBACK' || label === 'POSSIBLE_RING'
  }
}

/**
 * Get display text for severity level
 */
export function getSeverityText(severity: SeverityLevel): string {
  switch (severity) {
    case 'RUNAWAY': return 'RUNAWAY'
    case 'GROWING': return 'Growing'
    case 'RESONANCE': return 'Resonance'
    case 'POSSIBLE_RING': return 'Ring'
    case 'WHISTLE': return 'Whistle'
    case 'INSTRUMENT': return 'Instrument'
    default: return 'Unknown'
  }
}

/**
 * Get urgency level (1-5) for severity
 */
export function getSeverityUrgency(severity: SeverityLevel): number {
  switch (severity) {
    case 'RUNAWAY': return 5
    case 'GROWING': return 4
    case 'RESONANCE': return 3
    case 'POSSIBLE_RING': return 2
    case 'WHISTLE': return 1
    case 'INSTRUMENT': return 1
    default: return 0
  }
}
