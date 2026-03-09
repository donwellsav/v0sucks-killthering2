/**
 * Compression Detection & Spectral Flatness
 *
 * AmplitudeHistoryBuffer tracks peak/RMS history for crest factor analysis.
 * calculateSpectralFlatness measures how "tonal" a spectral peak is.
 */

import {
  SPECTRAL_FLATNESS_SETTINGS,
  COMPRESSION_SETTINGS,
} from './constants'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpectralFlatnessResult {
  flatness: number
  kurtosis: number
  feedbackScore: number
  isFeedbackLikely: boolean
}

export interface CompressionResult {
  isCompressed: boolean
  estimatedRatio: number
  crestFactor: number
  dynamicRange: number
  thresholdMultiplier: number
}

// ── Constants ────────────────────────────────────────────────────────────────

export const SPECTRAL_CONSTANTS = {
  PURE_TONE_FLATNESS: SPECTRAL_FLATNESS_SETTINGS.PURE_TONE,
  MUSIC_FLATNESS: SPECTRAL_FLATNESS_SETTINGS.MUSIC,
  HIGH_KURTOSIS: SPECTRAL_FLATNESS_SETTINGS.HIGH_KURTOSIS,
  ANALYSIS_BANDWIDTH_BINS: SPECTRAL_FLATNESS_SETTINGS.ANALYSIS_BANDWIDTH,
} as const

export const COMPRESSION_CONSTANTS = {
  NORMAL_CREST_FACTOR: COMPRESSION_SETTINGS.NORMAL_CREST_FACTOR,
  COMPRESSED_CREST_FACTOR: COMPRESSION_SETTINGS.COMPRESSED_CREST_FACTOR,
  MIN_DYNAMIC_RANGE: COMPRESSION_SETTINGS.MIN_DYNAMIC_RANGE,
  COMPRESSED_DYNAMIC_RANGE: COMPRESSION_SETTINGS.COMPRESSED_DYNAMIC_RANGE,
  ANALYSIS_WINDOW_MS: 500,
} as const

// ── Spectral Flatness + Kurtosis ─────────────────────────────────────────────

export function calculateSpectralFlatness(
  spectrum: Float32Array,
  peakBin: number,
  bandwidth?: number
): SpectralFlatnessResult {
  const bw = bandwidth ?? 5
  const startBin = Math.max(0, peakBin - bw)
  const endBin   = Math.min(spectrum.length - 1, peakBin + bw)
  const region: number[] = []

  for (let i = startBin; i <= endBin; i++) {
    const linear = Math.pow(10, spectrum[i] / 10)
    if (linear > 0) region.push(linear)
  }

  if (region.length === 0) {
    return { flatness: 1, kurtosis: 0, feedbackScore: 0, isFeedbackLikely: false }
  }

  const logSum        = region.reduce((sum, x) => sum + Math.log(x), 0)
  const geometricMean = Math.exp(logSum / region.length)
  const arithmeticMean = region.reduce((a, b) => a + b, 0) / region.length
  const flatness      = arithmeticMean > 0 ? geometricMean / arithmeticMean : 1

  const mean    = arithmeticMean
  const m2      = region.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / region.length
  const m4      = region.reduce((sum, x) => sum + Math.pow(x - mean, 4), 0) / region.length
  const kurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : 0

  const flatnessScore  = 1 - Math.min(flatness / SPECTRAL_CONSTANTS.MUSIC_FLATNESS, 1)
  const kurtosisScore  = Math.min(Math.max(kurtosis, 0) / SPECTRAL_CONSTANTS.HIGH_KURTOSIS, 1)
  const feedbackScore  = flatnessScore * 0.6 + kurtosisScore * 0.4
  const isFeedbackLikely = flatness < SPECTRAL_CONSTANTS.PURE_TONE_FLATNESS &&
                           kurtosis > SPECTRAL_CONSTANTS.HIGH_KURTOSIS / 2

  return { flatness, kurtosis, feedbackScore, isFeedbackLikely }
}

// ── Amplitude History Buffer (v3) ────────────────────────────────────────────

/**
 * AmplitudeHistoryBuffer v3.
 *
 * Uses Float64Array circular buffers (writePos + count) to avoid the
 * push/shift allocation pattern that caused the stale Turbopack parse error
 * in v1. Peak and RMS are stored separately for true dynamic range measurement.
 */
export class AmplitudeHistoryBuffer {
  private readonly peakHistory: Float64Array
  private readonly rmsHistory: Float64Array
  private writePos: number = 0
  private count: number = 0
  private readonly maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize     = maxSize
    this.peakHistory = new Float64Array(maxSize)
    this.rmsHistory  = new Float64Array(maxSize)
  }

  addSample(peakDb: number, rmsDb: number): void {
    this.peakHistory[this.writePos] = peakDb
    this.rmsHistory[this.writePos]  = rmsDb
    this.writePos = (this.writePos + 1) % this.maxSize
    if (this.count < this.maxSize) this.count++
  }

  detectCompression(): CompressionResult {
    if (this.count < 10) {
      return {
        isCompressed: false,
        estimatedRatio: 1,
        crestFactor: COMPRESSION_CONSTANTS.NORMAL_CREST_FACTOR,
        dynamicRange: COMPRESSION_CONSTANTS.MIN_DYNAMIC_RANGE,
        thresholdMultiplier: 1,
      }
    }

    let maxPeak  = -Infinity
    let minRms   =  Infinity
    let crestSum = 0

    for (let i = 0; i < this.count; i++) {
      const p = this.peakHistory[i]
      const r = this.rmsHistory[i]
      if (p > maxPeak) maxPeak = p
      if (r < minRms)  minRms  = r
      crestSum += (p - r)
    }

    const dynamicRange   = maxPeak - minRms
    const crestFactor    = crestSum / this.count
    const normalCrest    = COMPRESSION_CONSTANTS.NORMAL_CREST_FACTOR
    const estimatedRatio = normalCrest / Math.max(crestFactor, 1)

    const isCompressed =
      crestFactor  < COMPRESSION_CONSTANTS.COMPRESSED_CREST_FACTOR ||
      dynamicRange < COMPRESSION_CONSTANTS.COMPRESSED_DYNAMIC_RANGE

    const thresholdMultiplier = isCompressed
      ? Math.min(1 + (estimatedRatio - 1) * 0.25, 1.5)
      : 1

    return { isCompressed, estimatedRatio, crestFactor, dynamicRange, thresholdMultiplier }
  }

  reset(): void {
    this.writePos = 0
    this.count    = 0
    this.peakHistory.fill(0)
    this.rmsHistory.fill(0)
  }
}
