// KillTheRing2 Audio Analyzer - Manages Web Audio API setup and analysis pipeline

import { FeedbackDetector } from '@/lib/dsp/feedbackDetector'
import { TrackManager } from '@/lib/dsp/trackManager'
import { classifyTrack, shouldReportIssue } from '@/lib/dsp/classifier'
import { generateEQAdvisory } from '@/lib/dsp/eqAdvisor'
import { generateId } from '@/lib/utils/mathHelpers'
import type { 
  AnalysisConfig, 
  Track, 
  Advisory, 
  DetectedPeak,
  SpectrumData,
  OperatingMode,
  Preset
} from '@/types/advisory'
import { DEFAULT_CONFIG } from '@/types/advisory'

export interface AudioAnalyzerCallbacks {
  onSpectrum?: (data: SpectrumData) => void
  onAdvisory?: (advisory: Advisory) => void
  onAdvisoryCleared?: (advisoryId: string) => void
  onTracksUpdate?: (tracks: Track[]) => void
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
}

export class AudioAnalyzer {
  private config: AnalysisConfig
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
    config: Partial<AnalysisConfig> = {},
    callbacks: AudioAnalyzerCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.callbacks = callbacks

    this.trackManager = new TrackManager()

    this.detector = new FeedbackDetector(this.config, {
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

  updateConfig(config: Partial<AnalysisConfig>): void {
    Object.assign(this.config, config)
    this.detector.updateConfig(config)
  }

  setMode(mode: OperatingMode): void {
    this.config.mode = mode
  }

  setPreset(preset: Preset): void {
    this.config.preset = preset
  }

  setIgnoreWhistle(ignore: boolean): void {
    this.config.ignoreWhistle = ignore
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
    }
  }

  getActiveTracks(): Track[] {
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
      .slice(0, this.config.maxIssues)
  }

  getSpectrum(): Float32Array | null {
    return this.detector.getSpectrum()
  }

  // ==================== Private Methods ====================

  private handlePeakDetected(peak: DetectedPeak): void {
    // Process peak through track manager
    const track = this.trackManager.processPeak(peak as DetectedPeak & { qEstimate?: number; bandwidthHz?: number })

    // Classify the track
    const classification = classifyTrack(track)

    // Check if we should report this issue
    if (!shouldReportIssue(classification, this.config.mode, this.config.ignoreWhistle)) {
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
      this.config.preset,
      spectrum ?? undefined,
      state.sampleRate,
      state.fftSize
    )

    // Create or update advisory
    const existingAdvisoryId = this.trackToAdvisoryId.get(track.id)
    const advisoryId = existingAdvisoryId ?? generateId()

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
        const spectrumData: SpectrumData = {
          freqDb: spectrum,
          power: new Float32Array(0), // Not needed for display
          noiseFloorDb: state.noiseFloorDb,
          effectiveThresholdDb: state.effectiveThresholdDb,
          sampleRate: state.sampleRate,
          fftSize: state.fftSize,
          timestamp,
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
}

/**
 * Factory function for creating an audio analyzer
 */
export function createAudioAnalyzer(
  config?: Partial<AnalysisConfig>,
  callbacks?: AudioAnalyzerCallbacks
): AudioAnalyzer {
  return new AudioAnalyzer(config, callbacks)
}
