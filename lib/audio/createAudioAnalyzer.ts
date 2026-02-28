// KillTheRing2 Audio Analyzer - Manages Web Audio API setup and analysis pipeline

import { FeedbackDetector } from '@/lib/dsp/feedbackDetector'
import { TrackManager } from '@/lib/dsp/trackManager'
import { classifyTrack, shouldReportIssue } from '@/lib/dsp/classifier'
import { generateEQAdvisory } from '@/lib/dsp/eqAdvisor'
import { generateId } from '@/lib/utils/mathHelpers'
import type { 
  Advisory, 
  DetectedPeak,
  SpectrumData,
  TrackedPeak,
  Track,
  DetectorSettings,
} from '@/types/advisory'
import { DEFAULT_SETTINGS } from '@/lib/dsp/constants'

export interface AudioAnalyzerCallbacks {
  onSpectrum?: (data: SpectrumData) => void
  onAdvisory?: (advisory: Advisory) => void
  onAdvisoryCleared?: (advisoryId: string) => void
  onTracksUpdate?: (tracks: TrackedPeak[]) => void
  onError?: (error: Error) => void
  onStateChange?: (isRunning: boolean) => void
}

export interface AudioAnalyzerState {
  isRunning: boolean
  hasPermission: boolean
  error: string | null
  noiseFloorDb: number | null
  sampleRate: number
  fftSize: number
  effectiveThresholdDb: number
}

export class AudioAnalyzer {
  private settings: DetectorSettings
  private callbacks: AudioAnalyzerCallbacks
  private detector: FeedbackDetector
  private trackManager: TrackManager
  
  private advisories: Map<string, Advisory> = new Map()
  private trackToAdvisoryId: Map<string, string> = new Map()
  
  private rafId: number = 0
  private lastSpectrumTime: number = 0
  private spectrumIntervalMs: number = 33 // ~30fps for spectrum display

  private _isRunning: boolean = false
  private _hasPermission: boolean = false
  private _error: string | null = null

  constructor(
    settings: Partial<DetectorSettings> = {},
    callbacks: AudioAnalyzerCallbacks = {}
  ) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings }
    this.callbacks = callbacks

    this.trackManager = new TrackManager()

    this.detector = new FeedbackDetector(this.settings, {
      onPeakDetected: this.handlePeakDetected.bind(this),
      onPeakCleared: this.handlePeakCleared.bind(this),
    })

    this.spectrumLoop = this.spectrumLoop.bind(this)
  }

  // ==================== Public API ====================

  async start(): Promise<void> {
    if (this._isRunning) return

    try {
      await this.detector.start()
      this._isRunning = true
      this._hasPermission = true
      this._error = null

      // Start spectrum display loop
      this.lastSpectrumTime = 0
      this.rafId = requestAnimationFrame(this.spectrumLoop)

      this.callbacks.onStateChange?.(true)
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to start analyzer'
      this._hasPermission = false
      this.callbacks.onError?.(err instanceof Error ? err : new Error(this._error))
      throw err
    }
  }

  stop(options: { releaseMic?: boolean } = {}): void {
    this._isRunning = false

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }

    this.detector.stop(options)
    this.trackManager.clear()
    this.advisories.clear()
    this.trackToAdvisoryId.clear()

    this.callbacks.onStateChange?.(false)
  }

  updateSettings(settings: Partial<DetectorSettings>): void {
    Object.assign(this.settings, settings)
    this.detector.updateSettings(settings)
  }

  getState(): AudioAnalyzerState {
    const detectorState = this.detector.getState()
    return {
      isRunning: this._isRunning,
      hasPermission: this._hasPermission,
      error: this._error,
      noiseFloorDb: detectorState.noiseFloorDb,
      sampleRate: detectorState.sampleRate,
      fftSize: detectorState.fftSize,
      effectiveThresholdDb: detectorState.effectiveThresholdDb,
    }
  }

  getActiveTracks(): TrackedPeak[] {
    return this.trackManager.getActiveTracks()
  }

  getAdvisories(): Advisory[] {
    return Array.from(this.advisories.values())
      .sort((a, b) => {
        // Sort by urgency (severity), then by amplitude
        const urgencyA = this.getSeverityUrgency(a.severity)
        const urgencyB = this.getSeverityUrgency(b.severity)
        if (urgencyA !== urgencyB) return urgencyB - urgencyA
        return b.trueAmplitudeDb - a.trueAmplitudeDb
      })
      .slice(0, this.settings.maxDisplayedIssues)
  }

  getSpectrum(): Float32Array | null {
    return this.detector.getSpectrum()
  }

  // ==================== Private Methods ====================

  private handlePeakDetected(peak: DetectedPeak): void {
    // Process peak through track manager
    const track = this.trackManager.processPeak(peak)

    // Classify the track
    const classification = classifyTrack(track, this.settings)

    // Check if we should report this issue
    if (!shouldReportIssue(classification, this.settings)) {
      // Remove existing advisory if it exists
      const existingAdvisoryId = this.trackToAdvisoryId.get(track.id)
      if (existingAdvisoryId) {
        this.advisories.delete(existingAdvisoryId)
        this.trackToAdvisoryId.delete(track.id)
        this.callbacks.onAdvisoryCleared?.(existingAdvisoryId)
      }
      return
    }

    // Generate EQ recommendations
    const spectrum = this.detector.getSpectrum()
    const state = this.detector.getState()
    const eqAdvisory = generateEQAdvisory(
      track,
      classification.severity,
      this.settings.eqPreset,
      spectrum ?? undefined,
      state.sampleRate,
      state.fftSize
    )

    // Check if this frequency is in an existing issue's range
    // Avoid multiple issues in the same frequency band
    if (this.isInFrequencyRange(track.trueFrequencyHz)) {
      return
    }

    // Check if this frequency is a harmonic of an existing lower frequency issue
    // If so, skip it - the fundamental is the real problem
    if (this.isHarmonicOfExisting(track.trueFrequencyHz)) {
      return
    }

    // Create or update advisory
    const existingAdvisoryId = this.trackToAdvisoryId.get(track.id)
    const advisoryId = existingAdvisoryId ?? generateId()

    // track is a raw Track object with trueFrequencyHz, not TrackedPeak with frequency
    const advisory: Advisory = {
      id: advisoryId,
      trackId: track.id,
      timestamp: peak.timestamp,
      label: classification.label,
      severity: classification.severity,
      confidence: classification.confidence,
      why: classification.reasons,
      trueFrequencyHz: track.trueFrequencyHz,
      trueAmplitudeDb: track.trueAmplitudeDb,
      prominenceDb: track.prominenceDb,
      qEstimate: track.qEstimate,
      bandwidthHz: track.bandwidthHz,
      velocityDbPerSec: track.velocityDbPerSec,
      stabilityCentsStd: track.features.stabilityCentsStd,
      harmonicityScore: track.features.harmonicityScore,
      modulationScore: track.features.modulationScore,
      advisory: eqAdvisory,
    }

    this.advisories.set(advisoryId, advisory)
    if (!existingAdvisoryId) {
      this.trackToAdvisoryId.set(track.id, advisoryId)
    }

    this.callbacks.onAdvisory?.(advisory)

    // Notify tracks update
    this.callbacks.onTracksUpdate?.(this.trackManager.getActiveTracks())
  }

  private handlePeakCleared(peak: { binIndex: number; frequencyHz: number; timestamp: number }): void {
    this.trackManager.clearTrack(peak.binIndex, peak.timestamp)

    // Prune old tracks
    this.trackManager.pruneInactiveTracks(peak.timestamp)

    // Find and remove associated advisory
    // We need to find which track was at this bin
    for (const [trackId, advisoryId] of this.trackToAdvisoryId.entries()) {
      const advisory = this.advisories.get(advisoryId)
      if (advisory) {
        // Check if the advisory's frequency matches the cleared frequency
        const freqDiff = Math.abs(advisory.trueFrequencyHz - peak.frequencyHz)
        if (freqDiff < 10) { // Within 10 Hz tolerance
          this.advisories.delete(advisoryId)
          this.trackToAdvisoryId.delete(trackId)
          this.callbacks.onAdvisoryCleared?.(advisoryId)
          break
        }
      }
    }

    // Notify tracks update
    this.callbacks.onTracksUpdate?.(this.trackManager.getActiveTracks())
  }

  private spectrumLoop(timestamp: number): void {
    if (!this._isRunning) return

    // Throttle spectrum updates
    if (timestamp - this.lastSpectrumTime >= this.spectrumIntervalMs) {
      const spectrum = this.detector.getSpectrum()
      const state = this.detector.getState()

      if (spectrum) {
        // Calculate peak level for metering
        let peak = -100
        for (let i = 0; i < spectrum.length; i++) {
          if (spectrum[i] > peak) peak = spectrum[i]
        }

        const spectrumData: SpectrumData = {
          freqDb: spectrum,
          power: new Float32Array(0), // Not needed for display
          noiseFloorDb: state.noiseFloorDb,
          effectiveThresholdDb: state.effectiveThresholdDb,
          sampleRate: state.sampleRate,
          fftSize: state.fftSize,
          timestamp,
          peak,
        }

        this.callbacks.onSpectrum?.(spectrumData)
      }

      this.lastSpectrumTime = timestamp
    }

    this.rafId = requestAnimationFrame(this.spectrumLoop)
  }

  private getSeverityUrgency(severity: string): number {
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

  /**
   * Check if a frequency is a harmonic (2x, 3x, 4x, etc.) of an existing lower advisory
   * Uses 3% tolerance for harmonic matching
   */
  private isHarmonicOfExisting(freqHz: number): boolean {
    // Check if frequency is a harmonic of an existing issue
    for (const advisory of this.advisories.values()) {
      const ratio = freqHz / advisory.trueFrequencyHz
      // Check if it's a harmonic (within 2% tolerance)
      if (Math.abs(ratio - Math.round(ratio)) < 0.02 && ratio > 1) {
        return true
      }
    }
    return false
  }

  private isInFrequencyRange(freqHz: number, rangeHz: number = 100): boolean {
    // Check if frequency is within existing issue's bandwidth + margin
    for (const advisory of this.advisories.values()) {
      const freqDiff = Math.abs(freqHz - advisory.trueFrequencyHz)
      const bandwidth = Math.max(advisory.bandwidthHz * 1.5, rangeHz) // At least 100 Hz or 1.5x bandwidth
      if (freqDiff < bandwidth) {
        return true
      }
    }
    return false
  }
      }
    }

    return false
  }
}

/**
 * Factory function for creating an audio analyzer
 */
export function createAudioAnalyzer(
  settings?: Partial<DetectorSettings>,
  callbacks?: AudioAnalyzerCallbacks
): AudioAnalyzer {
  return new AudioAnalyzer(settings, callbacks)
}
