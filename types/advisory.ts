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
}

export interface SpectrumData {
  freqDb: Float32Array
  power: Float32Array
  noiseFloorDb: number | null
  effectiveThresholdDb: number
  sampleRate: number
  fftSize: number
  timestamp: number
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
  inputGainDb: number // Software gain applied to analysis (-12 to +24 dB)
}

// Default configuration
export const DEFAULT_CONFIG: AnalysisConfig = {
  fftSize: 8192,
  minHz: 60,
  maxHz: 16000,
  analysisIntervalMs: 25,
  sustainMs: 300,
  clearMs: 500,
  thresholdMode: 'hybrid',
  thresholdDb: -35,
  relativeThresholdDb: 20,
  prominenceDb: 15,
  neighborhoodBins: 8, // ±2 exclusion means effective 6 each side
  maxIssues: 10,
  ignoreWhistle: true,
  preset: 'surgical',
  mode: 'feedbackHunt',
  aWeightingEnabled: false,
  noiseFloorEnabled: true,
  noiseFloorSampleCount: 192,
  noiseFloorAttackMs: 250,
  noiseFloorReleaseMs: 1200,
  inputGainDb: 0,
}
