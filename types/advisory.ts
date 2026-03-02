// KillTheRing2 Types - Full type definitions for the feedback detection system
// Enhanced with advanced algorithm types from DAFx-16, DBX, and KU Leuven research

export type ThresholdMode = 'absolute' | 'relative' | 'hybrid'

// ============================================================================
// ADVANCED ALGORITHM TYPES (from advancedDetection.ts)
// ============================================================================

/** Algorithm selection mode */
export type AlgorithmMode = 'auto' | 'msd' | 'phase' | 'combined' | 'all'

/** Detected content type for adaptive thresholds */
export type ContentType = 'speech' | 'music' | 'compressed' | 'unknown'

/** MSD (Magnitude Slope Deviation) algorithm result */
export interface MSDResult {
  msd: number
  feedbackScore: number
  secondDerivative: number
  isFeedbackLikely: boolean
  framesAnalyzed: number
}

/** Phase coherence analysis result */
export interface PhaseCoherenceResult {
  coherence: number
  feedbackScore: number
  meanPhaseDelta: number
  phaseDeltaStd: number
  isFeedbackLikely: boolean
}

/** Spectral flatness and kurtosis result */
export interface SpectralFlatnessResult {
  flatness: number
  kurtosis: number
  feedbackScore: number
  isFeedbackLikely: boolean
}

/** Comb filter pattern detection result */
export interface CombPatternResult {
  hasPattern: boolean
  fundamentalSpacing: number | null
  estimatedPathLength: number | null
  matchingPeaks: number
  predictedFrequencies: number[]
  confidence: number
}

/** Compression detection result */
export interface CompressionResult {
  isCompressed: boolean
  estimatedRatio: number
  crestFactor: number
  dynamicRange: number
  thresholdMultiplier: number
}

/** Combined algorithm scores */
export interface AlgorithmScores {
  msd: MSDResult | null
  phase: PhaseCoherenceResult | null
  spectral: SpectralFlatnessResult | null
  comb: CombPatternResult | null
  compression: CompressionResult | null
}

/** Fused detection verdict */
export type FusionVerdict = 'FEEDBACK' | 'POSSIBLE_FEEDBACK' | 'NOT_FEEDBACK' | 'UNCERTAIN'

/** Fused detection result from all algorithms */
export interface FusedDetectionResult {
  feedbackProbability: number
  confidence: number
  contributingAlgorithms: string[]
  algorithmScores: AlgorithmScores
  verdict: FusionVerdict
  reasons: string[]
}

/** Algorithm fusion configuration */
export interface FusionConfig {
  mode: AlgorithmMode
  customWeights?: {
    msd?: number
    phase?: number
    spectral?: number
    comb?: number
    existing?: number
  }
  msdMinFrames: number
  phaseThreshold: number
  enableCompressionDetection: boolean
  feedbackThreshold: number
}
// Unified operation mode type - use 'vocalRing' everywhere (not 'vocalRingAssist')
export type OperationMode = 'feedbackHunt' | 'vocalRing' | 'musicAware' | 'aggressive' | 'calibration'
export type Preset = 'surgical' | 'heavy'
export type SeverityLevel = 'RUNAWAY' | 'GROWING' | 'RESONANCE' | 'POSSIBLE_RING' | 'WHISTLE' | 'INSTRUMENT'
export type Severity = 'runaway' | 'growing' | 'resonance' | 'ring' | 'whistle' | 'instrument' | 'unknown'
export type Classification = 'runaway' | 'growing' | 'resonance' | 'ring' | 'whistle' | 'instrument' | 'unknown'
export type IssueLabel = 'ACOUSTIC_FEEDBACK' | 'WHISTLE' | 'INSTRUMENT' | 'POSSIBLE_RING'
export type PEQType = 'bell' | 'notch' | 'highShelf' | 'lowShelf' | 'HPF' | 'LPF'
export type ShelfType = 'highShelf' | 'lowShelf' | 'HPF' | 'LPF'

export interface AnalysisConfig {
  fftSize: number
  minHz: number
  maxHz: number
  analysisIntervalMs: number
  sustainMs: number
  clearMs: number
  thresholdMode: ThresholdMode
  thresholdDb: number
  relativeThresholdDb: number
  prominenceDb: number
  neighborhoodBins: number
  maxIssues: number
  ignoreWhistle: boolean
  preset: Preset
  mode: OperationMode
  aWeightingEnabled: boolean
  // Room acoustics for Schroeder frequency calculation
  roomRT60?: number
  roomVolume?: number
  // Confidence threshold for filtering
  confidenceThreshold?: number
  // Noise floor settings
  noiseFloorEnabled: boolean
  noiseFloorSampleCount: number
  noiseFloorAttackMs: number
  noiseFloorReleaseMs: number
  // Input gain (software boost/cut applied to spectrum)
  inputGainDb: number
}

export interface DetectedPeak {
  binIndex: number
  trueFrequencyHz: number
  trueAmplitudeDb: number
  prominenceDb: number
  sustainedMs: number
  harmonicOfHz: number | null
  isSubHarmonicRoot?: boolean // True when this peak is the root of a harmonic series already active
  timestamp: number
  noiseFloorDb: number | null
  effectiveThresholdDb: number
}

export interface TrackFeatures {
  stabilityCentsStd: number
  meanQ: number
  minQ: number
  meanVelocityDbPerSec: number
  maxVelocityDbPerSec: number
  persistenceMs: number
  harmonicityScore: number
  modulationScore: number
  noiseSidebandScore: number
}

export interface TrackHistoryEntry {
  time: number
  freqHz: number
  ampDb: number
  prominenceDb: number
  qEstimate: number
}

export interface Track {
  id: string
  binIndex: number
  trueFrequencyHz: number
  trueAmplitudeDb: number
  prominenceDb: number
  onsetTime: number
  onsetDb: number
  lastUpdateTime: number
  history: TrackHistoryEntry[]
  features: TrackFeatures
  qEstimate: number
  bandwidthHz: number
  velocityDbPerSec: number
  harmonicOfHz: number | null
  isSubHarmonicRoot: boolean // True when this track is the fundamental of a partial series
  isActive: boolean
}

export interface ClassificationResult {
  pFeedback: number
  pWhistle: number
  pInstrument: number
  pUnknown: number
  label: IssueLabel
  severity: SeverityLevel
  confidence: number
  reasons: string[]
  // Enhanced fields from acoustic analysis
  modalOverlapFactor?: number // M = 1/Q (isolated < 0.03, coupled < 0.1, diffuse > 0.33)
  cumulativeGrowthDb?: number // Total dB growth since onset
  frequencyBand?: 'LOW' | 'MID' | 'HIGH' // Which frequency band this falls into
  confidenceLabel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' // Human-readable confidence
}

export interface PitchInfo {
  note: string
  octave: number
  cents: number
  midi: number
}

export interface GEQRecommendation {
  bandHz: number
  bandIndex: number
  suggestedDb: number
}

export interface PEQRecommendation {
  type: PEQType
  hz: number
  q: number
  gainDb: number
}

export interface ShelfRecommendation {
  type: ShelfType
  hz: number
  gainDb: number
  reason: string
}

export interface EQAdvisory {
  geq: GEQRecommendation
  peq: PEQRecommendation
  shelves: ShelfRecommendation[]
  pitch: PitchInfo
}

export interface Advisory {
  id: string
  trackId: string
  timestamp: number
  label: IssueLabel
  severity: SeverityLevel
  confidence: number
  why: string[]
  trueFrequencyHz: number
  trueAmplitudeDb: number
  prominenceDb: number
  qEstimate: number
  bandwidthHz: number
  velocityDbPerSec: number
  stabilityCentsStd: number
  harmonicityScore: number
  modulationScore: number
  advisory: EQAdvisory
  // Feedback prediction fields
  isRunaway?: boolean
  predictedTimeToClipMs?: number
  // Enhanced detection fields (from textbook research)
  modalOverlapFactor?: number // M = π / Q (isolated < 0.3, overlapping ≈ 1, diffuse > 3)
  cumulativeGrowthDb?: number // Total dB growth since onset
  frequencyBand?: 'LOW' | 'MID' | 'HIGH' // Which frequency band this falls into
  schroederFrequency?: number // Calculated Schroeder frequency for reference
}

export interface SpectrumData {
  freqDb: Float32Array
  power: Float32Array
  noiseFloorDb: number | null
  effectiveThresholdDb: number
  sampleRate: number
  fftSize: number
  timestamp: number
  peak: number // Peak level in dB for metering
  // Advanced algorithm state (from DAFx-16, DBX, KU Leuven research)
  algorithmMode?: AlgorithmMode
  contentType?: ContentType
  msdFrameCount?: number
  isCompressed?: boolean
  compressionRatio?: number
}

export interface AnalyzerState {
  isRunning: boolean
  hasPermission: boolean
  error: string | null
  noiseFloorDb: number | null
  spectrum: SpectrumData | null
  tracks: Track[]
  advisories: Advisory[]
}

// Worker message types
export interface WorkerAnalysisMessage {
  type: 'analysis'
  spectrum: SpectrumData
  peaks: DetectedPeak[]
}

export interface WorkerConfigMessage {
  type: 'config'
  config: Partial<AnalysisConfig>
}

export interface WorkerStartMessage {
  type: 'start'
}

export interface WorkerStopMessage {
  type: 'stop'
}

export type WorkerIncomingMessage = WorkerConfigMessage | WorkerStartMessage | WorkerStopMessage

export interface WorkerOutgoingMessage {
  type: 'analysis' | 'error' | 'ready'
  data?: unknown
  error?: string
}

// TrackedPeak - represents a tracked frequency peak
export interface TrackedPeak {
  id: string
  frequency: number
  amplitude: number
  prominenceDb: number
  qEstimate: number
  bandwidthHz: number
  classification: Classification
  severity: Severity
  onsetTime: number
  lastUpdateTime: number
  active: boolean
  history: Array<{
    time: number
    frequency: number
    amplitude: number
  }>
  features: {
    stabilityCentsStd: number
    harmonicityScore: number
    modulationScore: number
    velocityDbPerSec: number
  }
}

// DetectorSettings - primary settings interface for the analyzer
export interface DetectorSettings {
  mode: OperationMode
  fftSize: 4096 | 8192 | 16384
  smoothingTimeConstant: number
  minFrequency: number
  maxFrequency: number
  feedbackThresholdDb: number
  ringThresholdDb: number
  growthRateThreshold: number
  holdTimeMs: number
  noiseFloorDecay: number
  peakMergeCents: number
  maxDisplayedIssues: number
  eqPreset: 'surgical' | 'heavy'
  musicAware: boolean
  autoMusicAware: boolean // Auto-switch to music-aware mode based on signal level
  autoMusicAwareHysteresisDb: number // dB above noise floor to trigger music-aware mode
  inputGainDb: number // Software gain applied to analysis (-40 to +40 dB)
  graphFontSize: number // Font size for canvas graph labels (8-26px, default 15px)
  harmonicToleranceCents: number // Cents window for harmonic/sub-harmonic matching (25–100, default 50)
  showTooltips: boolean // Show/hide all help tooltips throughout the UI
  aWeightingEnabled: boolean // Apply A-weighting curve to analysis (per IEC 61672-1)
  // Confidence and filtering
  confidenceThreshold: number // Minimum confidence to display (0.40-0.95, default 0.40)
  // Room acoustics for Schroeder frequency calculation
  roomRT60: number // Reverberation time in seconds (0.3-3.0, default 0.7)
  roomVolume: number // Room volume in m³ (50-5000, default 250)
  roomPreset: 'small' | 'medium' | 'large' | 'custom' // Quick room size preset
  
  // ==================== ADVANCED ALGORITHM SETTINGS ====================
  // Based on DAFx-16, DBX, and KU Leuven research papers
  
  /** Algorithm mode: auto, msd, phase, combined, or all */
  algorithmMode: AlgorithmMode
  
  /** MSD (Magnitude Slope Deviation) minimum frames for analysis (7-50) */
  msdMinFrames: number
  
  /** Phase coherence threshold (0.4-0.95, higher = stricter) */
  phaseCoherenceThreshold: number
  
  /** Enable compression detection for adaptive thresholds */
  enableCompressionDetection: boolean
  
  /** Enable comb filter pattern detection */
  enableCombPatternDetection: boolean
  
  /** Feedback probability threshold for positive detection (0.4-0.9) */
  fusionFeedbackThreshold: number
  
  /** Show algorithm scores in UI */
  showAlgorithmScores: boolean
  
  /** Show phase coherence display */
  showPhaseDisplay: boolean
}

// Default configuration - optimized for Corporate/Conference PA with Vocal Focus (200Hz-8kHz)
export const DEFAULT_CONFIG: AnalysisConfig = {
  fftSize: 8192,
  minHz: 200, // Vocal-focused lower bound
  maxHz: 8000, // Vocal-focused upper bound - where most speech feedback occurs
  analysisIntervalMs: 20, // Faster analysis for quicker detection
  sustainMs: 250, // Faster confirmation for speech dynamics
  clearMs: 400, // Faster clearing for responsive display
  thresholdMode: 'hybrid',
  thresholdDb: -40, // More sensitive absolute threshold
  relativeThresholdDb: 18, // Slightly more sensitive relative threshold
  prominenceDb: 12, // Lower prominence for catching subtle peaks
  neighborhoodBins: 8, // ±2 exclusion means effective 6 each side
  maxIssues: 12, // Show more issues for comprehensive tuning
  ignoreWhistle: true,
  preset: 'surgical',
  mode: 'feedbackHunt', // Matches DEFAULT_SETTINGS.mode for consistency
  aWeightingEnabled: false,
  noiseFloorEnabled: true,
  noiseFloorSampleCount: 160, // Faster noise floor sampling
  noiseFloorAttackMs: 200, // Faster attack for dynamic environments
  noiseFloorReleaseMs: 1000, // Faster release
  inputGainDb: 15, // Default input gain (adjustable -40 to +40 dB)
}
