// KillTheRing2 Feedback Detector - Core DSP engine for peak detection
// Adapted from FeedbackDetector.js with TypeScript and enhancements
// Enhanced with MSD, Phase Coherence, Spectral Flatness, and Comb Filter algorithms

import { A_WEIGHTING, LN10_OVER_10, HARMONIC_SETTINGS } from './constants'
import {
  MSDHistoryBuffer,
  PhaseHistoryBuffer,
  AmplitudeHistoryBuffer,
  calculateSpectralFlatness,
  detectCombPattern,
  fuseAlgorithmResults,
  detectContentType,
  type MSDResult,
  type PhaseCoherenceResult,
  type SpectralFlatnessResult,
  type CombPatternResult,
  type CompressionResult,
  type AlgorithmScores,
  type FusedDetectionResult,
  type AlgorithmMode,
  type ContentType,
  type FusionConfig,
  DEFAULT_FUSION_CONFIG,
  MSD_CONSTANTS,
} from './advancedDetection'
import { 
  medianInPlace, 
  buildPrefixSum, 
  quadraticInterpolation,
  clamp,
  isValidFftSize,
  generateId 
} from '@/lib/utils/mathHelpers'
import type { DetectedPeak, AnalysisConfig, DetectorSettings } from '@/types/advisory'
import { DEFAULT_CONFIG } from '@/types/advisory'

export interface FeedbackDetectorCallbacks {
  onPeakDetected?: (peak: DetectedPeak) => void
  onPeakCleared?: (peak: { binIndex: number; frequencyHz: number; timestamp: number }) => void
  /** Called with advanced algorithm scores for each detected peak */
  onAlgorithmScores?: (scores: { binIndex: number; frequencyHz: number; scores: AlgorithmScores; fusion: FusedDetectionResult }) => void
  /** Called when content type is detected (speech/music/compressed) */
  onContentTypeDetected?: (contentType: ContentType) => void
  /** Called when comb filter pattern is detected */
  onCombPatternDetected?: (pattern: CombPatternResult) => void
}

export interface FeedbackDetectorState {
  isRunning: boolean
  noiseFloorDb: number | null
  effectiveThresholdDb: number
  sampleRate: number
  fftSize: number
  /** Advanced algorithm configuration */
  algorithmMode: AlgorithmMode
  /** Current detected content type */
  contentType: ContentType
  /** Number of frames in MSD history buffer */
  msdFrameCount: number
  /** Whether compression is detected */
  isCompressed: boolean
  /** Estimated compression ratio */
  compressionRatio: number
}

export class FeedbackDetector {
  // Configuration
  private config: AnalysisConfig
  private callbacks: FeedbackDetectorCallbacks

  // Web Audio
  private audioContext: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null

  // Preallocated buffers
  private freqDb: Float32Array | null = null
  private power: Float32Array | null = null
  private prefix: Float64Array | null = null
  private holdMs: Float32Array | null = null
  private deadMs: Float32Array | null = null
  private active: Uint8Array | null = null
  private activeHz: Float32Array | null = null
  private activeBins: Uint32Array | null = null
  private activeBinPos: Int32Array | null = null
  private activeCount: number = 0

  // A-weighting lookup
  private aWeightingTable: Float32Array | null = null
  private aWeightingMinDb: number = 0
  private aWeightingMaxDb: number = 0

  // Analysis bounds
  private startBin: number = 1
  private endBin: number = 0
  private effectiveNb: number = 2

  // Noise floor
  private noiseFloorDb: number | null = null
  private noiseSampleIdx: Uint32Array | null = null
  private noiseSamples: Float32Array | null = null

  // Timing
  private isRunning: boolean = false
  private rafId: number = 0
  private lastRafTs: number = 0
  private lastAnalysisTs: number = 0
  private maxAnalysisGapMs: number = 120

  // Analysis bounds
  private analysisMinDb: number = -100
  private analysisMaxDb: number = 0

  // Harmonic detection — runtime override (set via updateSettings)
  private harmonicToleranceCents: number = HARMONIC_SETTINGS.TOLERANCE_CENTS

  // Smoothing time constant for AnalyserNode (0-1, default 0.6)
  private smoothingTimeConstant: number = 0.6

  // Ring/growth detection thresholds (mapped from DetectorSettings)
  private ringThresholdDb: number = -10
  private growthRateThreshold: number = 1.5

  // ==================== Advanced Detection Buffers ====================
  // MSD (Magnitude Slope Deviation) - from DAFx-16 paper
  private msdBuffer: MSDHistoryBuffer | null = null
  
  // Phase coherence tracking
  private phaseBuffer: PhaseHistoryBuffer | null = null
  private lastPhaseData: Float32Array | null = null
  
  // Compression detection
  private amplitudeBuffer: AmplitudeHistoryBuffer | null = null
  private compressionResult: CompressionResult | null = null
  
  // Content type detection
  private detectedContentType: ContentType = 'unknown'
  private contentTypeConfidence: number = 0
  
  // Algorithm configuration
  private algorithmMode: AlgorithmMode = 'combined'
  private fusionConfig: FusionConfig = { ...DEFAULT_FUSION_CONFIG }
  private msdMinFrames: number = MSD_CONSTANTS.MIN_FRAMES_SPEECH
  
  // Comb filter pattern tracking
  private recentPeakFrequencies: number[] = []
  private lastCombPattern: CombPatternResult | null = null
  
  // Peak-level algorithm scores cache
  private peakAlgorithmScores: Map<number, AlgorithmScores> = new Map()

  constructor(config: Partial<AnalysisConfig> = {}, callbacks: FeedbackDetectorCallbacks = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.callbacks = callbacks
    this.maxAnalysisGapMs = Math.max(2 * this.config.analysisIntervalMs, 120)
    this.rafLoop = this.rafLoop.bind(this)
  }

  // ==================== Public API ====================

  async start(options: { stream?: MediaStream; audioContext?: AudioContext } = {}): Promise<void> {
    if (this.isRunning) return

    // Initialize AudioContext
    if (!this.audioContext) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx && !options.audioContext) {
        throw new Error('Web Audio API not supported')
      }
      this.audioContext = options.audioContext || new Ctx()
    }

    // Get microphone stream
    if (options.stream) {
      this.stream = options.stream
    } else if (!this.stream) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported')
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      })
    }

    // Create analyser
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.minDecibels = -100
      this.analyser.maxDecibels = 0
    }
    // Always apply smoothingTimeConstant from settings (it may have changed)
    this.analyser.smoothingTimeConstant = this.smoothingTimeConstant

    // Set FFT size and allocate buffers
    this.setFftSize(this.config.fftSize)

    // Connect source (PASSIVE - no output routing)
    if (this.source) {
      try { this.source.disconnect() } catch {}
      this.source = null
    }
    this.source = this.audioContext.createMediaStreamSource(this.stream)
    this.source.connect(this.analyser)

    // Resume context if needed
    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume()
    }

    // Start analysis loop
    this.isRunning = true
    this.lastRafTs = 0
    this.lastAnalysisTs = 0
    this.rafId = requestAnimationFrame(this.rafLoop)
  }

  stop(options: { releaseMic?: boolean } = {}): void {
    this.isRunning = false

    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }

    this.lastRafTs = 0
    this.lastAnalysisTs = 0
    this.resetHistory()

    if (this.source) {
      try { this.source.disconnect() } catch {}
      this.source = null
    }

    if (options.releaseMic && this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
    }
  }

  // ==================== Configuration ====================

  setFftSize(fftSize: number): void {
    if (!isValidFftSize(fftSize)) {
      throw new Error('fftSize must be a power of two between 32 and 32768')
    }
    this.config.fftSize = fftSize

    if (this.analyser) {
      this.analyser.fftSize = fftSize
      this.allocateBuffers()
      this.resetHistory()
    }
  }

  updateConfig(config: Partial<AnalysisConfig>): void {
    const needsReset = 
      config.neighborhoodBins !== undefined ||
      config.minHz !== undefined ||
      config.maxHz !== undefined ||
      config.sustainMs !== undefined

    Object.assign(this.config, config)

    if (config.fftSize !== undefined) {
      this.setFftSize(config.fftSize)
    }

    if (config.analysisIntervalMs !== undefined) {
      this.maxAnalysisGapMs = Math.max(2 * this.config.analysisIntervalMs, 120)
    }

    if (needsReset) {
      this.recomputeDerivedIndices()
      this.resetHistory()
    }

    if (config.aWeightingEnabled !== undefined) {
      this.recomputeAnalysisDbBounds()
      this.noiseFloorDb = null
      this.resetHistory()
    }
  }

  /**
   * Updates settings from the UI DetectorSettings interface
   * Maps DetectorSettings to the internal AnalysisConfig
   */
  updateSettings(settings: Partial<DetectorSettings>): void {
    const mappedConfig: Partial<AnalysisConfig> = {}

    if (settings.fftSize !== undefined) {
      mappedConfig.fftSize = settings.fftSize
    }
    if (settings.minFrequency !== undefined) {
      mappedConfig.minHz = settings.minFrequency
    }
    if (settings.maxFrequency !== undefined) {
      mappedConfig.maxHz = settings.maxFrequency
    }
    if (settings.feedbackThresholdDb !== undefined) {
      mappedConfig.relativeThresholdDb = settings.feedbackThresholdDb
    }
    // NOTE: holdTimeMs is UI-side "how long to show advisory cards after peak clears"
    // clearMs is DSP-side "how long to wait before declaring a peak dead"
    // These are DIFFERENT concepts - holdTimeMs should NOT be mapped to clearMs
    // The UI handles holdTimeMs display logic in KillTheRing.tsx advisory rendering
    if (settings.eqPreset !== undefined) {
      mappedConfig.preset = settings.eqPreset
    }
    if (settings.mode !== undefined) {
      // Direct assignment - OperationMode now matches AnalysisConfig['mode']
      mappedConfig.mode = settings.mode
    }
    if (settings.inputGainDb !== undefined) {
      mappedConfig.inputGainDb = settings.inputGainDb
    }
    if (settings.harmonicToleranceCents !== undefined) {
      this.harmonicToleranceCents = settings.harmonicToleranceCents
    }

    // Smoothing time constant - apply directly to analyser if it exists
    if (settings.smoothingTimeConstant !== undefined) {
      this.smoothingTimeConstant = settings.smoothingTimeConstant
      if (this.analyser) {
        this.analyser.smoothingTimeConstant = settings.smoothingTimeConstant
      }
    }

    // Ring and growth thresholds - used in classification
    if (settings.ringThresholdDb !== undefined) {
      this.ringThresholdDb = settings.ringThresholdDb
    }
    if (settings.growthRateThreshold !== undefined) {
      this.growthRateThreshold = settings.growthRateThreshold
    }

    // A-weighting (IEC 61672-1) - applies perceptual loudness curve
    if (settings.aWeightingEnabled !== undefined) {
      mappedConfig.aWeightingEnabled = settings.aWeightingEnabled
    }

    // Room acoustics for Schroeder frequency calculation
    if (settings.roomRT60 !== undefined) {
      mappedConfig.roomRT60 = settings.roomRT60
    }
    if (settings.roomVolume !== undefined) {
      mappedConfig.roomVolume = settings.roomVolume
    }

    // Confidence threshold for filtering
    if (settings.confidenceThreshold !== undefined) {
      mappedConfig.confidenceThreshold = settings.confidenceThreshold
    }

    // ==================== Advanced Algorithm Settings ====================
    // Algorithm mode (auto, msd, phase, combined, all)
    if (settings.algorithmMode !== undefined) {
      this.setAlgorithmMode(settings.algorithmMode)
    }

    // MSD minimum frames for analysis
    if (settings.msdMinFrames !== undefined) {
      this.setMSDMinFrames(settings.msdMinFrames)
    }

    // Phase coherence threshold
    if (settings.phaseCoherenceThreshold !== undefined) {
      this.fusionConfig.phaseThreshold = settings.phaseCoherenceThreshold
    }

    // Compression detection
    if (settings.enableCompressionDetection !== undefined) {
      this.fusionConfig.enableCompressionDetection = settings.enableCompressionDetection
    }

    // Fusion feedback threshold
    if (settings.fusionFeedbackThreshold !== undefined) {
      this.fusionConfig.feedbackThreshold = settings.fusionFeedbackThreshold
    }

    if (Object.keys(mappedConfig).length > 0) {
      this.updateConfig(mappedConfig)
    }
  }

  // ==================== Getters ====================

  getState(): FeedbackDetectorState {
    return {
      isRunning: this.isRunning,
      noiseFloorDb: this.noiseFloorDb,
      effectiveThresholdDb: this.computeEffectiveThresholdDb(),
      sampleRate: this.audioContext?.sampleRate ?? 48000,
      fftSize: this.config.fftSize,
      // Advanced algorithm state
      algorithmMode: this.algorithmMode,
      contentType: this.detectedContentType,
      msdFrameCount: this.msdBuffer?.getFrameCount() ?? 0,
      isCompressed: this.compressionResult?.isCompressed ?? false,
      compressionRatio: this.compressionResult?.estimatedRatio ?? 1,
    }
  }

  getSpectrum(): Float32Array | null {
    return this.freqDb
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 48000
  }

  binToFrequency(binIndex: number): number {
    const sr = this.getSampleRate()
    return (binIndex * sr) / this.config.fftSize
  }

  frequencyToBin(hz: number): number {
    const sr = this.getSampleRate()
    return Math.round((hz * this.config.fftSize) / sr)
  }

  // ==================== Internal Methods ====================

  private allocateBuffers(): void {
    if (!this.analyser) return
    
    const n = this.analyser.frequencyBinCount
    
    this.freqDb = new Float32Array(n)
    this.power = new Float32Array(n)
    this.prefix = new Float64Array(n + 1)
    this.holdMs = new Float32Array(n)
    this.deadMs = new Float32Array(n)
    this.active = new Uint8Array(n)
    this.activeHz = new Float32Array(n)
    this.activeBins = new Uint32Array(n)
    this.activeBinPos = new Int32Array(n)
    this.activeBinPos.fill(-1)
    this.activeCount = 0
    
    // Build A-weighting table
    this.aWeightingTable = new Float32Array(n)
    this.computeAWeightingTable()
    this.recomputeAnalysisDbBounds()
    
    this.noiseFloorDb = null
    this.recomputeDerivedIndices()
    
    // ==================== Advanced Detection Buffers ====================
    // MSD history buffer - stores dB magnitude for second derivative analysis
    this.msdBuffer = new MSDHistoryBuffer(n, this.msdMinFrames * 2)
    
    // Phase history buffer - stores phase data for coherence analysis
    this.phaseBuffer = new PhaseHistoryBuffer(n, 10)
    this.lastPhaseData = new Float32Array(n)
    
    // Amplitude buffer for compression detection
    this.amplitudeBuffer = new AmplitudeHistoryBuffer(100)
    
    // Clear peak algorithm scores cache
    this.peakAlgorithmScores.clear()
    this.recentPeakFrequencies = []
  }

  private resetHistory(): void {
    if (this.holdMs) this.holdMs.fill(0)
    if (this.deadMs) this.deadMs.fill(0)
    if (this.active) this.active.fill(0)
    if (this.activeHz) this.activeHz.fill(0)
    if (this.activeBinPos) this.activeBinPos.fill(-1)
    this.activeCount = 0
    
    // Reset advanced detection buffers
    this.msdBuffer?.reset()
    this.phaseBuffer?.reset()
    this.amplitudeBuffer?.reset()
    this.peakAlgorithmScores.clear()
    this.recentPeakFrequencies = []
    this.detectedContentType = 'unknown'
    this.contentTypeConfidence = 0
    this.compressionResult = null
    this.lastCombPattern = null
  }

  private computeAWeightingTable(): void {
    const table = this.aWeightingTable
    if (!table) return

    const sr = this.getSampleRate()
    const fft = this.config.fftSize
    const hzPerBin = sr / fft

    let min = Infinity
    let max = -Infinity

    for (let i = 0; i < table.length; i++) {
      const f = i * hzPerBin
      let w = this.aWeightingDb(f)
      if (!Number.isFinite(w)) w = A_WEIGHTING.MIN_DB
      table[i] = w
      if (w < min) min = w
      if (w > max) max = w
    }

    this.aWeightingMinDb = Number.isFinite(min) ? min : 0
    this.aWeightingMaxDb = Number.isFinite(max) ? max : 0
  }

  private aWeightingDb(fHz: number): number {
    if (fHz <= 0) return A_WEIGHTING.MIN_DB

    const f2 = fHz * fHz
    const { C1, C2, C3, C4, OFFSET } = A_WEIGHTING
    const c1_2 = C1 * C1
    const c2_2 = C2 * C2
    const c3_2 = C3 * C3
    const c4_2 = C4 * C4

    const num = c4_2 * (f2 * f2)
    const den = (f2 + c1_2) * (f2 + c4_2) * Math.sqrt((f2 + c2_2) * (f2 + c3_2))

    const ra = num / den
    if (ra <= 0 || !Number.isFinite(ra)) return A_WEIGHTING.MIN_DB

    return OFFSET + 20 * Math.log10(ra)
  }

  private recomputeAnalysisDbBounds(): void {
    if (this.config.aWeightingEnabled) {
      this.analysisMinDb = -100 + this.aWeightingMinDb
      this.analysisMaxDb = 0 + this.aWeightingMaxDb
    } else {
      this.analysisMinDb = -100
      this.analysisMaxDb = 0
    }
  }

  private recomputeDerivedIndices(): void {
    const n = this.freqDb?.length ?? 0
    if (!n) return

    const sr = this.getSampleRate()
    const fft = this.config.fftSize
    const hzToBin = (hz: number) => Math.round((hz * fft) / sr)

    let start = hzToBin(this.config.minHz)
    let end = hzToBin(this.config.maxHz)

    start = clamp(start, 0, n - 1)
    end = clamp(end, 0, n - 1)
    if (end < start) [start, end] = [end, start]

    // Clamp neighborhood bins
    const nbMax = Math.floor((n - 3) / 2)
    const nb = Math.max(2, Math.min(this.config.neighborhoodBins, nbMax))
    this.effectiveNb = nb

    // Ensure room for full neighborhoods with ±1 exclusion
    start = Math.max(start, nb)
    end = Math.min(end, n - 1 - nb)

    if (end < start) {
      this.startBin = 1
      this.endBin = 0
      this.noiseSampleIdx = new Uint32Array(0)
      this.noiseSamples = new Float32Array(0)
      return
    }

    this.startBin = start
    this.endBin = end

    // Precompute noise floor sample indices
    const range = end - start + 1
    const desired = Math.min(this.config.noiseFloorSampleCount, range)

    this.noiseSampleIdx = new Uint32Array(desired)
    this.noiseSamples = new Float32Array(desired)

    if (desired === 1) {
      this.noiseSampleIdx[0] = start
      return
    }

    const step = (range - 1) / (desired - 1)
    for (let i = 0; i < desired; i++) {
      const idx = start + Math.round(i * step)
      this.noiseSampleIdx[i] = clamp(idx, start, end)
    }
  }

  private rafLoop(timestamp: number): void {
    if (!this.isRunning) return

    const rafDt = this.lastRafTs === 0 ? 0 : timestamp - this.lastRafTs
    this.lastRafTs = timestamp

    // Guard against throttling (background tab)
    if (rafDt > this.maxAnalysisGapMs) {
      this.resetHistory()
      this.lastAnalysisTs = timestamp
    }

    if (this.lastAnalysisTs === 0) {
      this.lastAnalysisTs = timestamp
    }

    const since = timestamp - this.lastAnalysisTs
    if (since >= this.config.analysisIntervalMs) {
      this.analyze(timestamp, since)
      this.lastAnalysisTs = timestamp
    }

    this.rafId = requestAnimationFrame(this.rafLoop)
  }

  private analyze(now: number, dt: number): void {
    const analyser = this.analyser
    const ctx = this.audioContext
    if (!analyser || !this.freqDb || !this.power || !this.prefix || !this.holdMs || !this.active) return
    if (!ctx || ctx.state !== 'running') return

    // Read spectrum
    analyser.getFloatFrequencyData(this.freqDb)

    const freqDb = this.freqDb
    const power = this.power
    const prefix = this.prefix
    const n = freqDb.length

    const useAWeighting = this.config.aWeightingEnabled && !!this.aWeightingTable
    const aTable = this.aWeightingTable
    const inputGain = this.config.inputGainDb ?? 0

    // Build power + prefix sums
    prefix[0] = 0
    for (let i = 0; i < n; i++) {
      let db = freqDb[i]

      if (!Number.isFinite(db)) db = -100
      
      // Apply software input gain
      db += inputGain
      
      db = clamp(db, -100, 0)

      // Apply A-weighting if enabled
      if (useAWeighting && aTable) db += aTable[i]
      db = clamp(db, this.analysisMinDb, this.analysisMaxDb)

      freqDb[i] = db
      const p = Math.exp(db * LN10_OVER_10)
      power[i] = p
      prefix[i + 1] = prefix[i] + p
    }

  // Update noise floor
    if (this.config.noiseFloorEnabled) {
      this.updateNoiseFloorDb(dt)
    }
    
    // ==================== Advanced Detection Processing ====================
    // Update MSD history buffer with current frame
    if (this.msdBuffer) {
      this.msdBuffer.addFrame(freqDb)
    }
    
    // Update amplitude buffer for compression detection
    if (this.amplitudeBuffer) {
      // Calculate peak and RMS for this frame
      let peakLinear = 0
      let sumSquares = 0
      for (let i = 0; i < n; i++) {
        const linear = power[i]
        if (linear > peakLinear) peakLinear = linear
        sumSquares += linear * linear
      }
      const rmsLinear = Math.sqrt(sumSquares / n)
      const peakDb = peakLinear > 0 ? 10 * Math.log10(peakLinear) : -100
      const rmsDb = rmsLinear > 0 ? 10 * Math.log10(rmsLinear) : -100
      this.amplitudeBuffer.addSample(peakDb, rmsDb)
      
      // Update compression detection periodically
      if (this.msdBuffer && this.msdBuffer.getFrameCount() % 10 === 0) {
        this.compressionResult = this.amplitudeBuffer.detectCompression()
        
        // Detect content type
        const avgFlatness = this.calculateGlobalSpectralFlatness(freqDb)
        const crestFactor = this.compressionResult.crestFactor
        this.detectedContentType = detectContentType(freqDb, crestFactor, avgFlatness)
        
        // Notify content type change
        if (this.callbacks.onContentTypeDetected) {
          this.callbacks.onContentTypeDetected(this.detectedContentType)
        }
      }
    }
    
    const effectiveThresholdDb = this.computeEffectiveThresholdDb()
    const nb = this.effectiveNb
    const start = this.startBin
    const end = this.endBin
    if (end < start) return

    const hold = this.holdMs
    const dead = this.deadMs
    const active = this.active
    if (!hold || !dead || !active) return

    for (let i = start; i <= end; i++) {
      const peakDb = freqDb[i]
      const leftDb = freqDb[i - 1]
      const rightDb = freqDb[i + 1]

      // Local max check
      const isLocalMax = peakDb >= leftDb && peakDb >= rightDb && (peakDb > leftDb || peakDb > rightDb)
      let valid = isLocalMax && peakDb >= effectiveThresholdDb
      let prominence = -Infinity

      if (valid) {
        // ±2 bin Blackman exclusion for neighborhood averaging
        const startNb = i - nb
        const endNbExcl = i + nb + 1

        // totalPower = sum(range) - power[i-2] - power[i-1] - power[i] - power[i+1] - power[i+2]
        // For ±2 exclusion as per spec
        let totalPower = prefix[endNbExcl] - prefix[startNb]
        totalPower -= power[i - 2] + power[i - 1] + power[i] + power[i + 1] + power[i + 2]
        
        // count = (2*nb+1) - 5 = 2*nb - 4
        const count = 2 * nb - 4
        if (totalPower < 0) totalPower = 0

        const avgPower = count > 0 ? totalPower / count : 0
        const avgDb = avgPower > 0 ? 10 * Math.log10(avgPower) : this.analysisMinDb

        prominence = peakDb - avgDb
        if (prominence < this.config.prominenceDb) valid = false
      }

      if (valid) {
        hold[i] += dt
        dead[i] = 0

        if (hold[i] >= this.config.sustainMs && active[i] === 0) {
          // Quadratic interpolation for true peak
          const { delta, peak: trueAmplitudeDb } = quadraticInterpolation(leftDb, peakDb, rightDb)
          
          const sr = ctx.sampleRate
          const fft = analyser.fftSize
          const hzPerBin = sr / fft
          const trueFrequencyHz = (i + delta) * hzPerBin

          // ── Harmonic detection ─────────────────────────────────────────
          // Uses cents-based tolerance (musically uniform across the spectrum)
          // instead of a flat percentage, which is too coarse in the high range
          // and can miss harmonics in the low range.
          let harmonicRootHz: number | null = null
          let isSubHarmonicRoot = false

          if (this.activeBins && this.activeHz && this.activeCount > 0) {
            const maxHarmonic = HARMONIC_SETTINGS.MAX_HARMONIC
            const tolCents = this.harmonicToleranceCents

            // ── A: Overtone check ──────────────────────────────────────────
            // Is this new peak an overtone (2nd–8th) of any active root?
            for (let j = 0; j < this.activeCount; j++) {
              const rootBin = this.activeBins[j]
              const rootHz = this.activeHz[rootBin]
              if (rootHz <= 0 || rootHz >= trueFrequencyHz) continue

              const ratio = trueFrequencyHz / rootHz
              const k = Math.round(ratio)
              if (k < 2 || k > maxHarmonic) continue

              const expectedHz = rootHz * k
              // Convert frequency deviation to cents: 1200 * log2(actual/expected)
              const cents = Math.abs(1200 * Math.log2(trueFrequencyHz / expectedHz))
              if (cents <= tolCents) {
                // Prefer the lowest matching root (closest to fundamental)
                if (harmonicRootHz === null || rootHz < harmonicRootHz) {
                  harmonicRootHz = rootHz
                }
              }
            }

            // ── B: Sub-harmonic check ──────────────────────────────────────
            // Is this new peak the FUNDAMENTAL of a partial that is already
            // active? (e.g. the 2nd partial was detected first; now we see
            // the root appear below it.)
            if (HARMONIC_SETTINGS.CHECK_SUB_HARMONICS && harmonicRootHz === null) {
              for (let j = 0; j < this.activeCount; j++) {
                const partialBin = this.activeBins[j]
                const partialHz = this.activeHz[partialBin]
                if (partialHz <= 0 || partialHz <= trueFrequencyHz) continue

                const ratio = partialHz / trueFrequencyHz
                const k = Math.round(ratio)
                if (k < 2 || k > maxHarmonic) continue

                const expectedPartialHz = trueFrequencyHz * k
                const cents = Math.abs(1200 * Math.log2(partialHz / expectedPartialHz))
                if (cents <= tolCents) {
                  // This peak is the fundamental of a harmonic series already present.
                  // harmonicRootHz stays null (this IS the root) but we mark it so
                  // the classifier can boost harmonicity scoring appropriately.
                  harmonicRootHz = null // peak is the root, not an overtone
                  isSubHarmonicRoot = true
                  break
                }
              }
            }
          }

          // Mark active
          active[i] = 1
          if (this.activeHz) this.activeHz[i] = trueFrequencyHz
          if (this.activeBins && this.activeBinPos) {
            const pos = this.activeCount
            this.activeBins[pos] = i
            this.activeBinPos[i] = pos
            this.activeCount = pos + 1
          }

          // Q estimation via -3dB bandwidth
          const { qEstimate, bandwidthHz } = this.estimateQ(i, trueAmplitudeDb)

          const peak: DetectedPeak = {
            binIndex: i,
            trueFrequencyHz,
            trueAmplitudeDb: clamp(trueAmplitudeDb, this.analysisMinDb, this.analysisMaxDb),
            prominenceDb: prominence,
            sustainedMs: hold[i],
            harmonicOfHz: harmonicRootHz,
            isSubHarmonicRoot,
            timestamp: now,
            noiseFloorDb: this.noiseFloorDb,
            effectiveThresholdDb,
          }

          // Add Q to peak (extend type for internal use)
          ;(peak as DetectedPeak & { qEstimate: number; bandwidthHz: number }).qEstimate = qEstimate
          ;(peak as DetectedPeak & { qEstimate: number; bandwidthHz: number }).bandwidthHz = bandwidthHz

          // ==================== Advanced Algorithm Scoring ====================
          // Calculate algorithm scores for this peak
          const algorithmScores = this.calculateAlgorithmScores(i, trueFrequencyHz, freqDb)
          
          // Store for tracking
          this.peakAlgorithmScores.set(i, algorithmScores)
          
          // Track peak frequency for comb pattern detection
          this.recentPeakFrequencies.push(trueFrequencyHz)
          if (this.recentPeakFrequencies.length > 20) {
            this.recentPeakFrequencies.shift()
          }
          
          // Fuse algorithm results
          const existingScore = prominence / 20 // Normalize prominence to 0-1 range
          const fusion = fuseAlgorithmResults(
            algorithmScores,
            this.detectedContentType,
            existingScore,
            this.fusionConfig
          )
          
          // Attach fusion result to peak for downstream use
          ;(peak as DetectedPeak & { 
            qEstimate: number
            bandwidthHz: number
            algorithmScores: AlgorithmScores
            fusion: FusedDetectionResult
          }).algorithmScores = algorithmScores
          ;(peak as DetectedPeak & { 
            qEstimate: number
            bandwidthHz: number
            algorithmScores: AlgorithmScores
            fusion: FusedDetectionResult
          }).fusion = fusion

          // Notify algorithm scores callback
          if (this.callbacks.onAlgorithmScores) {
            this.callbacks.onAlgorithmScores({
              binIndex: i,
              frequencyHz: trueFrequencyHz,
              scores: algorithmScores,
              fusion,
            })
          }

          this.callbacks.onPeakDetected?.(peak)
        }
      } else {
        hold[i] = 0

        if (active[i] === 1) {
          dead[i] += dt

          if (dead[i] >= this.config.clearMs) {
            const clearedHz = this.activeHz?.[i] ?? this.binToFrequency(i)

            active[i] = 0
            dead[i] = 0

            // Remove from active list (swap-remove)
            if (this.activeBins && this.activeBinPos) {
              const pos = this.activeBinPos[i]
              if (pos >= 0) {
                const lastPos = this.activeCount - 1
                if (lastPos >= 0) {
                  const lastBin = this.activeBins[lastPos]
                  this.activeBins[pos] = lastBin
                  this.activeBinPos[lastBin] = pos
                  this.activeCount = lastPos
                }
                this.activeBinPos[i] = -1
              }
            }
            if (this.activeHz) this.activeHz[i] = 0

            this.callbacks.onPeakCleared?.({
              binIndex: i,
              frequencyHz: clearedHz,
              timestamp: now,
            })
          }
        } else {
          dead[i] = 0
        }
      }
    }
  }

  private estimateQ(binIndex: number, peakDb: number): { qEstimate: number; bandwidthHz: number } {
    // Find -3dB points around peak
    const freqDb = this.freqDb
    if (!freqDb) return { qEstimate: 10, bandwidthHz: 100 }

    const threshold = peakDb - 3
    const n = freqDb.length
    const sr = this.getSampleRate()
    const fft = this.config.fftSize
    const hzPerBin = sr / fft

    // Search left for -3dB crossing
    let leftBin = binIndex
    for (let i = binIndex - 1; i >= 0; i--) {
      if (freqDb[i] < threshold) {
        // Interpolate crossing point
        const t = (threshold - freqDb[i]) / (freqDb[i + 1] - freqDb[i])
        leftBin = i + t
        break
      }
    }

    // Search right for -3dB crossing
    let rightBin = binIndex
    for (let i = binIndex + 1; i < n; i++) {
      if (freqDb[i] < threshold) {
        // Interpolate crossing point
        const t = (threshold - freqDb[i - 1]) / (freqDb[i] - freqDb[i - 1])
        rightBin = i - 1 + t
        break
      }
    }

    const bandwidthBins = rightBin - leftBin
    const bandwidthHz = bandwidthBins * hzPerBin
    const centerHz = binIndex * hzPerBin
    
    // Q = center / bandwidth
    const qEstimate = bandwidthHz > 0 ? centerHz / bandwidthHz : 100

    return { qEstimate: clamp(qEstimate, 1, 500), bandwidthHz: Math.max(bandwidthHz, hzPerBin) }
  }

  private updateNoiseFloorDb(dt: number): void {
    const idx = this.noiseSampleIdx
    const samples = this.noiseSamples
    if (!idx || !samples || idx.length === 0 || !this.freqDb) return

    const freqDb = this.freqDb

    // Gather samples
    for (let i = 0; i < idx.length; i++) {
      let db = freqDb[idx[i]]
      if (!Number.isFinite(db)) db = this.analysisMinDb
      db = clamp(db, this.analysisMinDb, this.analysisMaxDb)
      samples[i] = db
    }

    // Median estimation
    const estimateDb = medianInPlace(samples)

    if (this.noiseFloorDb === null) {
      this.noiseFloorDb = estimateDb
      return
    }

    // EMA update
    const tau = estimateDb > this.noiseFloorDb 
      ? this.config.noiseFloorAttackMs 
      : this.config.noiseFloorReleaseMs
    const alpha = 1 - Math.exp(-dt / tau)
    this.noiseFloorDb = this.noiseFloorDb + alpha * (estimateDb - this.noiseFloorDb)
  }

  private computeEffectiveThresholdDb(): number {
    const absT = this.config.thresholdDb
    
    if (!this.config.noiseFloorEnabled || this.noiseFloorDb === null) {
      return absT
    }
    
    const relT = this.noiseFloorDb + this.config.relativeThresholdDb
    
    switch (this.config.thresholdMode) {
      case 'absolute': return absT
      case 'relative': return relT
      case 'hybrid': return Math.max(absT, relT)
      default: return Math.max(absT, relT)
    }
  }

  // ==================== Advanced Algorithm Methods ====================

  /**
   * Calculate all algorithm scores for a detected peak
   */
  private calculateAlgorithmScores(
    binIndex: number,
    frequencyHz: number,
    spectrum: Float32Array
  ): AlgorithmScores {
    const scores: AlgorithmScores = {
      msd: null,
      phase: null,
      spectral: null,
      comb: null,
      compression: this.compressionResult,
    }

    // MSD Analysis (if enough frames)
    if (this.msdBuffer && this.msdBuffer.getFrameCount() >= this.msdMinFrames) {
      scores.msd = this.msdBuffer.calculateMSD(binIndex, this.msdMinFrames)
    }

    // Phase Coherence Analysis (if we have phase data)
    if (this.phaseBuffer && this.phaseBuffer.getFrameCount() >= 5) {
      scores.phase = this.phaseBuffer.calculateCoherence(binIndex)
    }

    // Spectral Flatness around the peak
    scores.spectral = calculateSpectralFlatness(spectrum, binIndex, 10)

    // Comb Filter Pattern Detection (if enough peaks)
    if (this.recentPeakFrequencies.length >= 3) {
      const combResult = detectCombPattern(
        this.recentPeakFrequencies,
        this.getSampleRate()
      )
      scores.comb = combResult

      // Notify if pattern detected
      if (combResult.hasPattern && this.callbacks.onCombPatternDetected) {
        // Only notify if this is a new pattern or significantly different
        if (!this.lastCombPattern || 
            !this.lastCombPattern.hasPattern ||
            Math.abs((this.lastCombPattern.fundamentalSpacing ?? 0) - (combResult.fundamentalSpacing ?? 0)) > 5) {
          this.callbacks.onCombPatternDetected(combResult)
          this.lastCombPattern = combResult
        }
      }
    }

    return scores
  }

  /**
   * Calculate global spectral flatness for content type detection
   */
  private calculateGlobalSpectralFlatness(spectrum: Float32Array): number {
    const start = this.startBin
    const end = this.endBin
    if (end <= start) return 0.5

    // Convert from dB to linear power
    const region: number[] = []
    for (let i = start; i <= end; i++) {
      const linear = Math.pow(10, spectrum[i] / 10)
      if (linear > 0 && Number.isFinite(linear)) {
        region.push(linear)
      }
    }

    if (region.length === 0) return 0.5

    // Geometric mean (using log-sum for stability)
    const logSum = region.reduce((sum, x) => sum + Math.log(x), 0)
    const geometricMean = Math.exp(logSum / region.length)

    // Arithmetic mean
    const arithmeticMean = region.reduce((a, b) => a + b, 0) / region.length

    // Spectral flatness
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0.5
  }

  // ==================== Advanced Algorithm Configuration ====================

  /**
   * Set the algorithm mode
   */
  setAlgorithmMode(mode: AlgorithmMode): void {
    this.algorithmMode = mode
    this.fusionConfig.mode = mode
  }

  /**
   * Get current algorithm mode
   */
  getAlgorithmMode(): AlgorithmMode {
    return this.algorithmMode
  }

  /**
   * Set MSD minimum frames
   */
  setMSDMinFrames(frames: number): void {
    this.msdMinFrames = clamp(frames, MSD_CONSTANTS.MIN_FRAMES_SPEECH, MSD_CONSTANTS.MAX_FRAMES)
    this.fusionConfig.msdMinFrames = this.msdMinFrames
  }

  /**
   * Get current MSD frame count
   */
  getMSDFrameCount(): number {
    return this.msdBuffer?.getFrameCount() ?? 0
  }

  /**
   * Get detected content type
   */
  getContentType(): ContentType {
    return this.detectedContentType
  }

  /**
   * Get compression detection result
   */
  getCompressionResult(): CompressionResult | null {
    return this.compressionResult
  }

  /**
   * Get algorithm scores for a specific bin
   */
  getAlgorithmScoresForBin(binIndex: number): AlgorithmScores | undefined {
    return this.peakAlgorithmScores.get(binIndex)
  }

  /**
   * Get recent peak frequencies (for external comb pattern analysis)
   */
  getRecentPeakFrequencies(): number[] {
    return [...this.recentPeakFrequencies]
  }

  /**
   * Update fusion configuration
   */
  updateFusionConfig(config: Partial<FusionConfig>): void {
    this.fusionConfig = { ...this.fusionConfig, ...config }
  }

  /**
   * Get current fusion configuration
   */
  getFusionConfig(): FusionConfig {
    return { ...this.fusionConfig }
  }
}
