// DSP Worker Manager - Manages Web Worker for offloaded DSP processing
// Falls back to main thread if workers are not supported

export interface WorkerConfig {
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

export interface DetectedPeakResult {
  binIndex: number
  frequencyHz: number
  amplitudeDb: number
  prominenceDb: number
  interpolatedFreqHz: number
  interpolatedAmpDb: number
}

export interface AnalysisResult {
  type: 'analysis'
  peaks: DetectedPeakResult[]
  noiseFloorDb: number
  timestamp: number
  processingTimeMs: number
}

type AnalysisCallback = (result: AnalysisResult) => void

export class DSPWorkerManager {
  private worker: Worker | null = null
  private isReady: boolean = false
  private pendingCallback: AnalysisCallback | null = null
  private config: WorkerConfig
  private useWorker: boolean = true

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = {
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
      ...config,
    }
  }

  async initialize(): Promise<boolean> {
    // Check if workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('[DSPWorkerManager] Web Workers not supported, falling back to main thread')
      this.useWorker = false
      return false
    }

    try {
      // Create worker from blob URL for Next.js compatibility
      const workerCode = `
        // Inline worker code for Next.js compatibility
        const A_WEIGHTING = { C1: 20.598997, C2: 107.65265, C3: 737.86223, C4: 12194.217, OFFSET: 2.0, MIN_DB: -100 };
        let config = { fftSize: 8192, sampleRate: 48000, minHz: 200, maxHz: 8000, prominenceDb: 12, neighborhoodBins: 8, relativeThresholdDb: 18, thresholdDb: -40, aWeightingEnabled: false, inputGainDb: 0 };
        let power = null, prefix = null, aWeightingTable = null, noiseSamples = null;
        
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
        
        function allocateBuffers(n) {
          power = new Float32Array(n);
          prefix = new Float64Array(n + 1);
          aWeightingTable = new Float32Array(n);
          noiseSamples = new Float32Array(Math.min(160, n));
          computeAWeightingTable(n);
        }
        
        function aWeightingDb(fHz) {
          if (fHz <= 0) return A_WEIGHTING.MIN_DB;
          const f2 = fHz * fHz;
          const { C1, C2, C3, C4, OFFSET } = A_WEIGHTING;
          const num = C4*C4 * (f2 * f2);
          const den = (f2 + C1*C1) * (f2 + C4*C4) * Math.sqrt((f2 + C2*C2) * (f2 + C3*C3));
          const ra = num / den;
          if (ra <= 0 || !Number.isFinite(ra)) return A_WEIGHTING.MIN_DB;
          return OFFSET + 20 * Math.log10(ra);
        }
        
        function computeAWeightingTable(n) {
          if (!aWeightingTable) return;
          const hzPerBin = config.sampleRate / config.fftSize;
          for (let i = 0; i < n; i++) {
            let w = aWeightingDb(i * hzPerBin);
            if (!Number.isFinite(w)) w = A_WEIGHTING.MIN_DB;
            aWeightingTable[i] = w;
          }
        }
        
        function quadraticInterpolation(left, center, right) {
          const denom = left - 2 * center + right;
          if (Math.abs(denom) < 1e-10) return { delta: 0, peak: center };
          const delta = 0.5 * (left - right) / denom;
          const peak = center - 0.25 * (left - right) * delta;
          return { delta: clamp(delta, -0.5, 0.5), peak };
        }
        
        function medianInPlace(arr) {
          const n = arr.length;
          if (n === 0) return 0;
          const sorted = Array.from(arr).sort((a, b) => a - b);
          const mid = Math.floor(n / 2);
          return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        }
        
        function analyze(freqData, timestamp) {
          const startTime = performance.now();
          const n = freqData.length;
          if (!power || power.length !== n) allocateBuffers(n);
          
          const LN10_OVER_10 = Math.LN10 / 10;
          const useAW = config.aWeightingEnabled && !!aWeightingTable;
          const inputGain = config.inputGainDb || 0;
          
          prefix[0] = 0;
          for (let i = 0; i < n; i++) {
            let db = freqData[i];
            if (!Number.isFinite(db)) db = -100;
            db += inputGain;
            db = clamp(db, -100, 0);
            if (useAW && aWeightingTable) db += aWeightingTable[i];
            db = clamp(db, -100, 0);
            freqData[i] = db;
            const p = Math.exp(db * LN10_OVER_10);
            power[i] = p;
            prefix[i + 1] = prefix[i] + p;
          }
          
          const hzPerBin = config.sampleRate / config.fftSize;
          const startBin = Math.max(1, Math.round(config.minHz / hzPerBin));
          const endBin = Math.min(n - 1, Math.round(config.maxHz / hzPerBin));
          const range = endBin - startBin + 1;
          const sampleCount = Math.min(noiseSamples.length, range);
          const step = range / sampleCount;
          
          for (let i = 0; i < sampleCount; i++) {
            const idx = startBin + Math.floor(i * step);
            noiseSamples[i] = freqData[clamp(idx, startBin, endBin)];
          }
          const noiseFloorDb = medianInPlace(noiseSamples.subarray(0, sampleCount));
          const effectiveThresholdDb = Math.max(config.thresholdDb, noiseFloorDb + config.relativeThresholdDb);
          
          const peaks = [];
          const nb = config.neighborhoodBins;
          
          for (let i = startBin + nb; i <= endBin - nb; i++) {
            const peakDb = freqData[i];
            const leftDb = freqData[i - 1];
            const rightDb = freqData[i + 1];
            
            const isLocalMax = peakDb >= leftDb && peakDb >= rightDb && (peakDb > leftDb || peakDb > rightDb);
            if (!isLocalMax || peakDb < effectiveThresholdDb) continue;
            
            let totalPower = prefix[i + nb + 1] - prefix[i - nb];
            totalPower -= power[i - 2] + power[i - 1] + power[i] + power[i + 1] + power[i + 2];
            const count = 2 * nb - 4;
            if (totalPower < 0) totalPower = 0;
            const avgPower = count > 0 ? totalPower / count : 0;
            const avgDb = avgPower > 0 ? 10 * Math.log10(avgPower) : -100;
            const prominence = peakDb - avgDb;
            
            if (prominence < config.prominenceDb) continue;
            
            const { delta, peak: trueAmpDb } = quadraticInterpolation(leftDb, peakDb, rightDb);
            const trueFreqHz = (i + delta) * hzPerBin;
            
            peaks.push({
              binIndex: i,
              frequencyHz: i * hzPerBin,
              amplitudeDb: peakDb,
              prominenceDb: prominence,
              interpolatedFreqHz: trueFreqHz,
              interpolatedAmpDb: trueAmpDb,
            });
          }
          
          return { type: 'analysis', peaks, noiseFloorDb, timestamp, processingTimeMs: performance.now() - startTime };
        }
        
        self.onmessage = (event) => {
          const msg = event.data;
          if (msg.type === 'config') {
            Object.assign(config, msg.config);
            if (msg.config.fftSize || msg.config.sampleRate) {
              allocateBuffers(config.fftSize / 2);
            }
            return;
          }
          if (msg.type === 'analyze') {
            if (msg.config) Object.assign(config, msg.config);
            const result = analyze(msg.freqData, msg.timestamp);
            self.postMessage(result);
          }
        };
        self.postMessage({ type: 'ready' });
      `

      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      this.worker = new Worker(url)

      return new Promise((resolve) => {
        this.worker!.onmessage = (event) => {
          if (event.data.type === 'ready') {
            this.isReady = true
            // Send initial config
            this.worker!.postMessage({ type: 'config', config: this.config })
            resolve(true)
          } else if (event.data.type === 'analysis' && this.pendingCallback) {
            this.pendingCallback(event.data as AnalysisResult)
            this.pendingCallback = null
          }
        }

        this.worker!.onerror = (err) => {
          console.error('[DSPWorkerManager] Worker error:', err)
          this.useWorker = false
          resolve(false)
        }
      })
    } catch (err) {
      console.warn('[DSPWorkerManager] Failed to create worker:', err)
      this.useWorker = false
      return false
    }
  }

  updateConfig(config: Partial<WorkerConfig>): void {
    Object.assign(this.config, config)
    if (this.worker && this.isReady) {
      this.worker.postMessage({ type: 'config', config })
    }
  }

  analyze(freqData: Float32Array, timestamp: number, callback: AnalysisCallback): void {
    if (!this.useWorker || !this.worker || !this.isReady) {
      // Fallback: would need main-thread analysis (for now just skip)
      return
    }

    this.pendingCallback = callback
    this.worker.postMessage(
      { type: 'analyze', freqData, timestamp, config: this.config },
      [freqData.buffer] // Transfer ownership for zero-copy
    )
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.isReady = false
  }

  get isWorkerReady(): boolean {
    return this.isReady && this.useWorker
  }
}
