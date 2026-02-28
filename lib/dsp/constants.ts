// Kill The Ring Constants - ISO bands, note frequencies, and configuration

// Standard ISO 31-band graphic EQ center frequencies (1/3 octave)
export const ISO_31_BANDS: readonly number[] = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000,
  20000
] as const

// A4 = 440 Hz reference
export const A4_HZ = 440
export const A4_MIDI = 69

// Note names for pitch display
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

// Cents per semitone
export const CENTS_PER_SEMITONE = 100
export const SEMITONES_PER_OCTAVE = 12
export const CENTS_PER_OCTAVE = 1200

// Mathematical constants (precomputed for performance)
export const LN10_OVER_10 = Math.LN10 / 10 // For dB to power conversion
export const LOG10_E = Math.LOG10E // For power to dB conversion
export const TWO_PI = Math.PI * 2

// A-weighting constants (IEC/CD 1672)
export const A_WEIGHTING = {
  C1: 20.6,
  C2: 107.7,
  C3: 737.9,
  C4: 12200,
  OFFSET: 2.0, // dB offset for A-weighting formula
  MIN_DB: -120, // Clamp for frequencies near 0 Hz
} as const

// FFT size options
export const FFT_SIZE_OPTIONS = [2048, 4096, 8192, 16384, 32768] as const

// Severity thresholds - tuned for PA system feedback detection
export const SEVERITY_THRESHOLDS = {
  RUNAWAY_VELOCITY: 8, // dB/sec growth rate for runaway (lower = catch faster)
  GROWING_VELOCITY: 2, // dB/sec for growing (more sensitive)
  HIGH_Q: 40, // Q value indicating narrow resonance (lower = catch more)
  PERSISTENCE_MS: 400, // ms for resonance classification (faster detection)
} as const

// Classification weights - optimized for PA feedback detection
export const CLASSIFIER_WEIGHTS = {
  // Stationarity (low pitch variation = feedback) - increased weight
  STABILITY_FEEDBACK: 0.30,
  STABILITY_THRESHOLD_CENTS: 12, // tighter threshold for feedback detection
  
  // Harmonicity (coherent harmonics = instrument)
  HARMONICITY_INSTRUMENT: 0.25,
  HARMONICITY_THRESHOLD: 0.65, // higher threshold = less false instrument classification
  
  // Modulation (vibrato = whistle)
  MODULATION_WHISTLE: 0.20,
  MODULATION_THRESHOLD: 0.45, // slightly higher threshold
  
  // Sideband noise (breath = whistle)
  SIDEBAND_WHISTLE: 0.10,
  SIDEBAND_THRESHOLD: 0.35, // slightly higher threshold
  
  // Runaway growth (high velocity = feedback) - increased weight
  GROWTH_FEEDBACK: 0.25,
  GROWTH_THRESHOLD: 4, // lower threshold = catch feedback growth earlier
  
  // Classification thresholds - more conservative for PA use
  CLASSIFICATION_THRESHOLD: 0.45, // lower = more likely to flag as potential issue
  WHISTLE_THRESHOLD: 0.65, // higher = less false whistle classification
  INSTRUMENT_THRESHOLD: 0.60, // higher = less false instrument classification
} as const

// EQ recommendation presets
export const EQ_PRESETS = {
  surgical: {
    defaultQ: 8,
    runawayQ: 16,
    maxCut: -18,
    moderateCut: -9,
    lightCut: -4,
  },
  heavy: {
    defaultQ: 4,
    runawayQ: 8,
    maxCut: -12,
    moderateCut: -6,
    lightCut: -3,
  },
} as const

// Vocal ring assist mode settings
export const VOCAL_RING_SETTINGS = {
  BASELINE_EMA_ALPHA: 0.02, // Slow LTAS baseline adaptation
  RING_THRESHOLD_DB: 5, // dB above baseline for ring candidate
  RING_PERSISTENCE_MS: 200, // ms for ring confirmation
  VOICE_FREQ_LOW: 150, // Hz - voice presence detection
  VOICE_FREQ_HIGH: 4000, // Hz
  SUGGESTED_CUT_MIN: -2, // dB
  SUGGESTED_CUT_MAX: -6, // dB
} as const

// Spectral trend monitor settings
export const SPECTRAL_TRENDS = {
  LOW_RUMBLE_THRESHOLD_HZ: 80,
  LOW_RUMBLE_EXCESS_DB: 6,
  MUD_FREQ_LOW: 200,
  MUD_FREQ_HIGH: 400,
  MUD_EXCESS_DB: 4,
  HARSH_FREQ_LOW: 6000,
  HARSH_FREQ_HIGH: 10000,
  HARSH_EXCESS_DB: 5,
} as const

// Track history settings
export const TRACK_SETTINGS = {
  HISTORY_SIZE: 128, // Ring buffer size for track history
  ASSOCIATION_TOLERANCE_CENTS: 50, // Max cents difference to associate peak to track
  MAX_TRACKS: 64, // Maximum simultaneous tracks
  TRACK_TIMEOUT_MS: 1000, // Remove track after this inactive time
} as const

// Canvas rendering settings
export const CANVAS_SETTINGS = {
  RTA_DB_MIN: -100,
  RTA_DB_MAX: 0,
  RTA_FREQ_MIN: 20,
  RTA_FREQ_MAX: 20000,
  WATERFALL_HISTORY_FRAMES: 256,
  GEQ_BAR_WIDTH_RATIO: 0.8, // Bar width as ratio of band spacing
} as const

// Operation mode presets - optimized for PA system feedback detection
export const OPERATION_MODES = {
  feedbackHunt: {
    // Default PA mode - balanced sensitivity for catching feedback early
    feedbackThreshold: 10, // Lower threshold for earlier detection
    ringThreshold: 5, // Catch resonances before they become problematic
    growthRateThreshold: 2, // Faster response to growing feedback
    musicAware: false,
  },
  vocalRing: {
    feedbackThreshold: 8,
    ringThreshold: 4,
    growthRateThreshold: 1.5,
    musicAware: false,
  },
  musicAware: {
    // Use during live performance to reduce false positives
    feedbackThreshold: 14,
    ringThreshold: 8,
    growthRateThreshold: 3,
    musicAware: true,
  },
  aggressive: {
    // Maximum sensitivity for system tuning/ring-out
    feedbackThreshold: 6,
    ringThreshold: 3,
    growthRateThreshold: 1,
    musicAware: false,
  },
  calibration: {
    // Ultra-sensitive for initial system setup
    feedbackThreshold: 4,
    ringThreshold: 2,
    growthRateThreshold: 0.5,
    musicAware: false,
  },
} as const

// Default settings for the analyzer - optimized for PA feedback detection
export const DEFAULT_SETTINGS = {
  mode: 'feedbackHunt' as const,
  fftSize: 8192 as const,
  smoothingTimeConstant: 0.7, // Slightly less smoothing for faster response
  minFrequency: 60,
  maxFrequency: 16000,
  feedbackThresholdDb: 10, // Lower default for better PA detection
  ringThresholdDb: 5, // Catch resonances earlier
  growthRateThreshold: 2, // Faster detection of growing feedback
  holdTimeMs: 2500, // Slightly longer hold for reference during EQ adjustments
  noiseFloorDecay: 0.99, // Faster noise floor adaptation
  peakMergeCents: 50,
  maxDisplayedIssues: 10, // Show more issues for comprehensive system tuning
  eqPreset: 'surgical' as const,
  musicAware: false,
  inputGainDb: 15, // Higher default gain for better signal capture
}

// Color palette for visualizations
export const VIZ_COLORS = {
  RUNAWAY: '#ef4444', // red-500
  GROWING: '#f97316', // orange-500
  RESONANCE: '#eab308', // yellow-500
  POSSIBLE_RING: '#a855f7', // purple-500
  WHISTLE: '#06b6d4', // cyan-500
  INSTRUMENT: '#22c55e', // green-500
  NOISE_FLOOR: '#6b7280', // gray-500
  THRESHOLD: '#3b82f6', // blue-500
  SPECTRUM: '#10b981', // emerald-500
  PEAK_MARKER: '#f59e0b', // amber-500
} as const
