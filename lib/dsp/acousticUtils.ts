/**
 * Acoustic Utilities for Kill The Ring
 * Based on "Sound Insulation" by Carl Hopkins (2007)
 * 
 * These utilities implement key acoustic formulas for improved feedback detection:
 * - Schroeder frequency calculation (room mode analysis)
 * - Modal overlap factor (isolated vs diffuse modes)
 * - Frequency band classification
 * - Cumulative growth tracking
 * - Formant/vibrato detection for voice discrimination
 */

import {
  SCHROEDER_CONSTANTS,
  FREQUENCY_BANDS,
  MODAL_OVERLAP,
  CUMULATIVE_GROWTH,
  VOCAL_FORMANTS,
  VIBRATO_DETECTION,
} from './constants'

// ============================================================================
// SCHROEDER FREQUENCY
// ============================================================================

/**
 * Calculate Schroeder frequency for a room
 * From textbook Equation 1.111: f_S = 2000 * sqrt(T/V)
 * 
 * Below this frequency, individual room modes dominate and statistical
 * analysis breaks down. Feedback detection needs different handling.
 * 
 * @param rt60 - Reverberation time in seconds (typical: 0.5-2.0)
 * @param volume - Room volume in cubic meters (typical: 100-2000)
 * @returns Schroeder cut-off frequency in Hz
 */
export function calculateSchroederFrequency(rt60: number, volume: number): number {
  // Validate inputs
  if (rt60 <= 0 || volume <= 0) {
    return SCHROEDER_CONSTANTS.DEFAULT_FREQUENCY
  }
  
  // f_S = 2000 * sqrt(T/V)
  const fs = SCHROEDER_CONSTANTS.COEFFICIENT * Math.sqrt(rt60 / volume)
  
  // Clamp to reasonable range (50Hz - 500Hz)
  return Math.max(50, Math.min(500, fs))
}

/**
 * Get frequency band for a given frequency
 * Uses Schroeder frequency to set the LOW/MID boundary
 * 
 * @param frequencyHz - Frequency to classify
 * @param schroederHz - Schroeder frequency (LOW/MID boundary)
 * @returns Band classification and multipliers
 */
export function getFrequencyBand(
  frequencyHz: number,
  schroederHz: number = SCHROEDER_CONSTANTS.DEFAULT_FREQUENCY
): {
  band: 'LOW' | 'MID' | 'HIGH'
  prominenceMultiplier: number
  sustainMultiplier: number
  qThresholdMultiplier: number
  description: string
} {
  // Use Schroeder frequency as LOW/MID boundary
  const lowMidBoundary = Math.max(schroederHz, FREQUENCY_BANDS.LOW.maxHz)
  
  if (frequencyHz < lowMidBoundary) {
    return {
      band: 'LOW',
      ...FREQUENCY_BANDS.LOW,
    }
  } else if (frequencyHz < FREQUENCY_BANDS.MID.maxHz) {
    return {
      band: 'MID',
      ...FREQUENCY_BANDS.MID,
    }
  } else {
    return {
      band: 'HIGH',
      ...FREQUENCY_BANDS.HIGH,
    }
  }
}

// ============================================================================
// MODAL OVERLAP FACTOR
// ============================================================================

/**
 * Calculate modal overlap factor from Q value
 * From textbook Section 1.2.6.7: For a single resonance, M ≈ π / Q
 * 
 * Interpretation:
 * - M << 1 (< 0.3): Isolated mode with deep troughs between peaks
 *   → More likely to be feedback (sustained single frequency)
 * - M ≈ 1: Overlapping modes, smoother response
 *   → Could be feedback or room resonance
 * - M >> 1 (> 3): Diffuse field behavior
 *   → Unlikely to be feedback (noise-like)
 * 
 * @param qFactor - Q factor of the resonance
 * @returns Modal overlap factor M
 */
export function calculateModalOverlap(qFactor: number): number {
  if (qFactor <= 0) return Infinity
  return Math.PI / qFactor
}

/**
 * Classify modal overlap as isolated, coupled, or diffuse
 */
export function classifyModalOverlap(modalOverlap: number): {
  classification: 'ISOLATED' | 'COUPLED' | 'DIFFUSE'
  feedbackProbabilityBoost: number
  description: string
} {
  if (modalOverlap < MODAL_OVERLAP.ISOLATED) {
    return {
      classification: 'ISOLATED',
      feedbackProbabilityBoost: 0.15, // Boost feedback probability
      description: 'Isolated mode - high feedback risk',
    }
  } else if (modalOverlap < MODAL_OVERLAP.COUPLED) {
    return {
      classification: 'COUPLED',
      feedbackProbabilityBoost: 0.05, // Slight boost
      description: 'Coupled modes - moderate risk',
    }
  } else {
    return {
      classification: 'DIFFUSE',
      feedbackProbabilityBoost: -0.10, // Reduce feedback probability
      description: 'Diffuse field - low feedback risk',
    }
  }
}

// ============================================================================
// CUMULATIVE GROWTH TRACKING
// ============================================================================

/**
 * Calculate cumulative growth from track history
 * Detects slow-building feedback that may not trigger velocity thresholds
 * 
 * @param onsetDb - Amplitude at track onset
 * @param currentDb - Current amplitude
 * @param durationMs - Time since onset
 * @returns Growth analysis
 */
export function analyzeCumulativeGrowth(
  onsetDb: number,
  currentDb: number,
  durationMs: number
): {
  totalGrowthDb: number
  averageGrowthRateDbPerSec: number
  severity: 'NONE' | 'BUILDING' | 'GROWING' | 'RUNAWAY'
  shouldAlert: boolean
} {
  const totalGrowthDb = currentDb - onsetDb
  
  // Calculate average growth rate
  const durationSec = Math.max(durationMs / 1000, 0.1) // Avoid division by zero
  const averageGrowthRateDbPerSec = totalGrowthDb / durationSec
  
  // Only consider cumulative growth if duration is within valid range
  if (durationMs < CUMULATIVE_GROWTH.MIN_DURATION_MS || 
      durationMs > CUMULATIVE_GROWTH.MAX_DURATION_MS) {
    return {
      totalGrowthDb,
      averageGrowthRateDbPerSec,
      severity: 'NONE',
      shouldAlert: false,
    }
  }
  
  // Determine severity based on cumulative growth
  let severity: 'NONE' | 'BUILDING' | 'GROWING' | 'RUNAWAY' = 'NONE'
  let shouldAlert = false
  
  if (totalGrowthDb >= CUMULATIVE_GROWTH.RUNAWAY_THRESHOLD_DB) {
    severity = 'RUNAWAY'
    shouldAlert = true
  } else if (totalGrowthDb >= CUMULATIVE_GROWTH.ALERT_THRESHOLD_DB) {
    severity = 'GROWING'
    shouldAlert = true
  } else if (totalGrowthDb >= CUMULATIVE_GROWTH.WARNING_THRESHOLD_DB) {
    severity = 'BUILDING'
    shouldAlert = true
  }
  
  return {
    totalGrowthDb,
    averageGrowthRateDbPerSec,
    severity,
    shouldAlert,
  }
}

// ============================================================================
// VOCAL/WHISTLE DISCRIMINATION
// ============================================================================

/**
 * Check if a set of peaks matches vocal formant pattern
 * Voice has characteristic formant structure that feedback lacks
 * 
 * @param peakFrequencies - Array of detected peak frequencies
 * @returns Formant analysis result
 */
export function analyzeFormantStructure(peakFrequencies: number[]): {
  hasFormantStructure: boolean
  formantCount: number
  voiceProbability: number
  detectedFormants: { formant: string; frequency: number }[]
} {
  const detectedFormants: { formant: string; frequency: number }[] = []
  
  // Check for F1 (first formant)
  const f1Match = peakFrequencies.find(f => 
    f >= VOCAL_FORMANTS.F1_CENTER - VOCAL_FORMANTS.F1_RANGE &&
    f <= VOCAL_FORMANTS.F1_CENTER + VOCAL_FORMANTS.F1_RANGE
  )
  if (f1Match) {
    detectedFormants.push({ formant: 'F1', frequency: f1Match })
  }
  
  // Check for F2 (second formant)
  const f2Match = peakFrequencies.find(f => 
    f >= VOCAL_FORMANTS.F2_CENTER - VOCAL_FORMANTS.F2_RANGE &&
    f <= VOCAL_FORMANTS.F2_CENTER + VOCAL_FORMANTS.F2_RANGE
  )
  if (f2Match) {
    detectedFormants.push({ formant: 'F2', frequency: f2Match })
  }
  
  // Check for F3 (third formant)
  const f3Match = peakFrequencies.find(f => 
    f >= VOCAL_FORMANTS.F3_CENTER - VOCAL_FORMANTS.F3_RANGE &&
    f <= VOCAL_FORMANTS.F3_CENTER + VOCAL_FORMANTS.F3_RANGE
  )
  if (f3Match) {
    detectedFormants.push({ formant: 'F3', frequency: f3Match })
  }
  
  const formantCount = detectedFormants.length
  const hasFormantStructure = formantCount >= VOCAL_FORMANTS.MIN_FORMANTS_FOR_VOICE
  
  // Calculate voice probability based on formant matches
  // More formants = higher probability of voice
  const voiceProbability = Math.min(formantCount / 3, 1) * 0.5 // Max 50% boost from formants
  
  return {
    hasFormantStructure,
    formantCount,
    voiceProbability,
    detectedFormants,
  }
}

/**
 * Analyze frequency stability for vibrato detection
 * Whistle has characteristic 4-8 Hz vibrato; feedback is rock-steady
 * 
 * @param frequencyHistory - Array of {time, frequency} measurements
 * @returns Vibrato analysis
 */
export function analyzeVibrato(
  frequencyHistory: Array<{ time: number; frequency: number }>
): {
  hasVibrato: boolean
  vibratoRateHz: number | null
  vibratoDepthCents: number | null
  whistleProbability: number
} {
  if (frequencyHistory.length < 10) {
    return {
      hasVibrato: false,
      vibratoRateHz: null,
      vibratoDepthCents: null,
      whistleProbability: 0,
    }
  }
  
  // Calculate frequency deviation over recent history
  const recentHistory = frequencyHistory.slice(-20) // Last 20 samples
  const frequencies = recentHistory.map(h => h.frequency)
  const meanFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length
  
  // Calculate standard deviation
  const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - meanFreq, 2), 0) / frequencies.length
  const stdDev = Math.sqrt(variance)
  
  // Convert to cents: cents = 1200 * log2(f1/f2)
  const depthCents = 1200 * Math.log2((meanFreq + stdDev) / (meanFreq - stdDev || meanFreq))
  
  // Estimate vibrato rate from zero crossings of deviation
  const deviations = frequencies.map(f => f - meanFreq)
  let zeroCrossings = 0
  for (let i = 1; i < deviations.length; i++) {
    if (deviations[i] * deviations[i - 1] < 0) {
      zeroCrossings++
    }
  }
  
  // Time span of history
  const timeSpanMs = recentHistory[recentHistory.length - 1].time - recentHistory[0].time
  const timeSpanSec = timeSpanMs / 1000
  
  // Vibrato rate ≈ zero crossings / (2 * time span)
  const vibratoRateHz = timeSpanSec > 0 ? zeroCrossings / (2 * timeSpanSec) : 0
  
  // Check if this matches whistle vibrato characteristics
  const isVibratoRate = vibratoRateHz >= VIBRATO_DETECTION.MIN_RATE_HZ && 
                        vibratoRateHz <= VIBRATO_DETECTION.MAX_RATE_HZ
  const isVibratoDepth = depthCents >= VIBRATO_DETECTION.MIN_DEPTH_CENTS && 
                         depthCents <= VIBRATO_DETECTION.MAX_DEPTH_CENTS
  
  const hasVibrato = isVibratoRate && isVibratoDepth
  
  // Calculate whistle probability
  let whistleProbability = 0
  if (hasVibrato) {
    // Strong vibrato in the right range = likely whistle
    whistleProbability = 0.3
    // Wider vibrato = more likely whistle
    if (depthCents > 50) whistleProbability += 0.1
    if (depthCents > 80) whistleProbability += 0.1
  }
  
  return {
    hasVibrato,
    vibratoRateHz: hasVibrato ? vibratoRateHz : null,
    vibratoDepthCents: hasVibrato ? depthCents : null,
    whistleProbability,
  }
}

// ============================================================================
// CONFIDENCE CALIBRATION
// ============================================================================

/**
 * Calculate calibrated confidence score
 * Combines multiple factors into a well-calibrated confidence percentage
 * 
 * @param pFeedback - Raw feedback probability
 * @param pWhistle - Raw whistle probability  
 * @param pInstrument - Raw instrument probability
 * @param modalOverlapBoost - Boost from modal overlap analysis
 * @param cumulativeGrowthSeverity - Severity from cumulative growth
 * @returns Calibrated confidence (0-1)
 */
export function calculateCalibratedConfidence(
  pFeedback: number,
  pWhistle: number,
  pInstrument: number,
  modalOverlapBoost: number = 0,
  cumulativeGrowthSeverity: 'NONE' | 'BUILDING' | 'GROWING' | 'RUNAWAY' = 'NONE'
): {
  confidence: number
  adjustedPFeedback: number
  confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
} {
  // Start with the highest probability
  let confidence = Math.max(pFeedback, pWhistle, pInstrument)
  let adjustedPFeedback = pFeedback
  
  // Apply modal overlap boost to feedback probability
  adjustedPFeedback = Math.min(1, pFeedback + modalOverlapBoost)
  
  // Apply cumulative growth boost
  switch (cumulativeGrowthSeverity) {
    case 'RUNAWAY':
      adjustedPFeedback = Math.max(adjustedPFeedback, 0.85)
      confidence = Math.max(confidence, 0.85)
      break
    case 'GROWING':
      adjustedPFeedback = Math.min(1, adjustedPFeedback + 0.15)
      confidence = Math.max(confidence, adjustedPFeedback)
      break
    case 'BUILDING':
      adjustedPFeedback = Math.min(1, adjustedPFeedback + 0.08)
      confidence = Math.max(confidence, adjustedPFeedback)
      break
  }
  
  // Determine confidence label
  let confidenceLabel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  if (confidence >= 0.85) {
    confidenceLabel = 'VERY_HIGH'
  } else if (confidence >= 0.70) {
    confidenceLabel = 'HIGH'
  } else if (confidence >= 0.55) {
    confidenceLabel = 'MEDIUM'
  } else {
    confidenceLabel = 'LOW'
  }
  
  return {
    confidence,
    adjustedPFeedback,
    confidenceLabel,
  }
}

/**
 * Apply frequency-dependent threshold multipliers
 * Adjusts detection thresholds based on frequency band
 * 
 * @param baseThreshold - Base threshold value
 * @param frequencyHz - Frequency being analyzed
 * @param schroederHz - Schroeder frequency
 * @param thresholdType - Which type of threshold to adjust
 * @returns Adjusted threshold
 */
export function applyFrequencyDependentThreshold(
  baseThreshold: number,
  frequencyHz: number,
  schroederHz: number,
  thresholdType: 'prominence' | 'sustain' | 'q'
): number {
  const band = getFrequencyBand(frequencyHz, schroederHz)
  
  switch (thresholdType) {
    case 'prominence':
      return baseThreshold * band.prominenceMultiplier
    case 'sustain':
      return baseThreshold * band.sustainMultiplier
    case 'q':
      return baseThreshold * band.qThresholdMultiplier
    default:
      return baseThreshold
  }
}
