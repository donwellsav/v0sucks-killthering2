// KillTheRing2 Types - Full type definitions for the feedback detection system

export type ThresholdMode = 'absolute' | 'relative' | 'hybrid'
export type OperatingMode = 'feedbackHunt' | 'vocalRingAssist' | 'musicAware' | 'aggressive' | 'calibration'
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
  mode: OperatingMode
  aWeightingEnabled: boolean
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
  mode: 'aggressive', // Aggressive by default for maximum detection
  aWeightingEnabled: false,
  noiseFloorEnabled: true,
  noiseFloorSampleCount: 160, // Faster noise floor sampling
  noiseFloorAttackMs: 200, // Faster attack for dynamic environments
  noiseFloorReleaseMs: 1000, // Faster release
  inputGainDb: 12, // Default gain for speech systems (adjustable -40 to +40 dB)
}
