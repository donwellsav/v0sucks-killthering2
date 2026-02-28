// DSP Web Worker for offloading heavy spectrum analysis
// This worker receives raw frequency data and performs peak detection + classification

import { clamp } from '@/lib/utils/mathHelpers'

// Worker message types
interface WorkerConfig {
  fftSize: number
  sampleRate: number
  minHz: number
  maxHz: number
  prominenceDb: number
  neighborhoodBins: number
  relativeThresholdDb: number
  thresholdDb: number
  aWeightingEnabled: boolean
  inputGainDb: number
}

interface AnalyzeMessage {
  type: 'analyze'
  freqData: Float32Array
  timestamp: number
  config: WorkerConfig
}

interface ConfigMessage {
  type: 'config'
  config: Partial<WorkerConfig>
}

type WorkerInMessage = AnalyzeMessage | ConfigMessage

interface DetectedPeakResult {
  binIndex: number
  frequencyHz: number
  amplitudeDb: number
  prominenceDb: number
  interpolatedFreqHz: number
  interpolatedAmpDb: number
}

interface AnalysisResult {
  type: 'analysis'
  peaks: DetectedPeakResult[]
  noiseFloorDb: number
  timestamp: number
  processingTimeMs: number
}

// A-weighting constants
const A_WEIGHTING = {
  C1: 20.598997,
  C2: 107.65265,
  C3: 737.86223,
  C4: 12194.217,
  OFFSET: 2.0,
  MIN_DB: -100,
}

// Worker state
let config: WorkerConfig = {
  fftSize: 8192,
  sampleRate: 48000,
  minHz: 200,
  maxHz: 8000,
  prominenceDb: 12,
  neighborhoodBins: 8,
  relativeThresholdDb: 18,
  thresholdDb: -40,
  aWeightingEnabled: false,
  inputGainDb: 0,
}

// Preallocated buffers
let power: Float32Array | null = null
let prefix: Float64Array | null = null
let aWeightingTable: Float32Array | null = null
let noiseSamples: Float32Array | null = null

function allocateBuffers(n: number): void {
  power = new Float32Array(n)
  prefix = new Float64Array(n + 1)
  aWeightingTable = new Float32Array(n)
  noiseSamples = new Float32Array(Math.min(160, n))
  computeAWeightingTable(n)
}

function aWeightingDb(fHz: number): number {
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

function computeAWeightingTable(n: number): void {
  if (!aWeightingTable) return
  const hzPerBin = config.sampleRate / config.fftSize
  for (let i = 0; i < n; i++) {
    const f = i * hzPerBin
    let w = aWeightingDb(f)
    if (!Number.isFinite(w)) w = A_WEIGHTING.MIN_DB
    aWeightingTable[i] = w
  }
}

function quadraticInterpolation(left: number, center: number, right: number): { delta: number; peak: number } {
  const denom = left - 2 * center + right
  if (Math.abs(denom) < 1e-10) return { delta: 0, peak: center }
  const delta = 0.5 * (left - right) / denom
  const peak = center - 0.25 * (left - right) * delta
  return { delta: clamp(delta, -0.5, 0.5), peak }
}

function medianInPlace(arr: Float32Array): number {
  const n = arr.length
  if (n === 0) return 0
  const sorted = Array.from(arr).sort((a, b) => a - b)
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function analyze(freqData: Float32Array, timestamp: number): AnalysisResult {
  const startTime = performance.now()
  const n = freqData.length

  // Ensure buffers are allocated
  if (!power || power.length !== n) {
    allocateBuffers(n)
  }

  const LN10_OVER_10 = Math.LN10 / 10
  const useAWeighting = config.aWeightingEnabled && !!aWeightingTable
  const inputGain = config.inputGainDb ?? 0

  // Build power + prefix sums
  prefix![0] = 0
  for (let i = 0; i < n; i++) {
    let db = freqData[i]
    if (!Number.isFinite(db)) db = -100
    db += inputGain
    db = clamp(db, -100, 0)
    if (useAWeighting && aWeightingTable) db += aWeightingTable[i]
    db = clamp(db, -100, 0)
    freqData[i] = db
    const p = Math.exp(db * LN10_OVER_10)
    power![i] = p
    prefix![i + 1] = prefix![i] + p
  }

  // Estimate noise floor via median sampling
  const hzPerBin = config.sampleRate / config.fftSize
  const startBin = Math.max(1, Math.round(config.minHz / hzPerBin))
  const endBin = Math.min(n - 1, Math.round(config.maxHz / hzPerBin))
  const range = endBin - startBin + 1
  const sampleCount = Math.min(noiseSamples!.length, range)
  const step = range / sampleCount

  for (let i = 0; i < sampleCount; i++) {
    const idx = startBin + Math.floor(i * step)
    noiseSamples![i] = freqData[clamp(idx, startBin, endBin)]
  }
  const noiseFloorDb = medianInPlace(noiseSamples!.subarray(0, sampleCount))
  const effectiveThresholdDb = Math.max(config.thresholdDb, noiseFloorDb + config.relativeThresholdDb)

  // Peak detection
  const peaks: DetectedPeakResult[] = []
  const nb = config.neighborhoodBins

  for (let i = startBin + nb; i <= endBin - nb; i++) {
    const peakDb = freqData[i]
    const leftDb = freqData[i - 1]
    const rightDb = freqData[i + 1]

    // Local max check
    const isLocalMax = peakDb >= leftDb && peakDb >= rightDb && (peakDb > leftDb || peakDb > rightDb)
    if (!isLocalMax || peakDb < effectiveThresholdDb) continue

    // Prominence check
    let totalPower = prefix![i + nb + 1] - prefix![i - nb]
    totalPower -= power![i - 2] + power![i - 1] + power![i] + power![i + 1] + power![i + 2]
    const count = 2 * nb - 4
    if (totalPower < 0) totalPower = 0
    const avgPower = count > 0 ? totalPower / count : 0
    const avgDb = avgPower > 0 ? 10 * Math.log10(avgPower) : -100
    const prominence = peakDb - avgDb

    if (prominence < config.prominenceDb) continue

    // Quadratic interpolation for true peak
    const { delta, peak: trueAmpDb } = quadraticInterpolation(leftDb, peakDb, rightDb)
    const trueFreqHz = (i + delta) * hzPerBin

    peaks.push({
      binIndex: i,
      frequencyHz: i * hzPerBin,
      amplitudeDb: peakDb,
      prominenceDb: prominence,
      interpolatedFreqHz: trueFreqHz,
      interpolatedAmpDb: trueAmpDb,
    })
  }

  const processingTimeMs = performance.now() - startTime

  return {
    type: 'analysis',
    peaks,
    noiseFloorDb,
    timestamp,
    processingTimeMs,
  }
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data

  if (msg.type === 'config') {
    Object.assign(config, msg.config)
    if (msg.config.fftSize || msg.config.sampleRate) {
      const n = config.fftSize / 2
      allocateBuffers(n)
    }
    return
  }

  if (msg.type === 'analyze') {
    // Update config if provided
    if (msg.config) {
      Object.assign(config, msg.config)
    }

    const result = analyze(msg.freqData, msg.timestamp)
    self.postMessage(result)
  }
}

// Signal ready
self.postMessage({ type: 'ready' })
