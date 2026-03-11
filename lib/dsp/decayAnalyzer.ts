/**
 * decayAnalyzer.ts — Frequency decay analysis
 *
 * Tracks recently cleared peaks to analyze their decay signature.
 * Room modes decay exponentially (following RT60); feedback drops instantly
 * (Hopkins §1.2.6.3).  This distinction helps suppress room-mode re-triggers.
 *
 * Extracted from dspWorker.ts (Batch 4) for maintainability.
 * Pure computational logic — no worker messaging.
 */

import { findNearestGEQBand } from './eqAdvisor'
import { MEMORY_LIMITS } from './constants'

interface DecayEntry {
  lastAmplitudeDb: number
  clearTime: number
  frequencyHz: number
}

const DECAY_ANALYSIS_WINDOW_MS = 500

export class DecayAnalyzer {
  private recentDecays = new Map<number, DecayEntry>()

  /** Record a cleared peak's last known amplitude for decay analysis. */
  recordDecay(binIndex: number, lastAmplitudeDb: number, clearTime: number, frequencyHz: number): void {
    this.recentDecays.set(binIndex, { lastAmplitudeDb, clearTime, frequencyHz })
  }

  /**
   * Analyze recent decays against the expected RT60 curve.
   *
   * Returns GEQ band indices that show room-mode-like exponential decay
   * (should be added to band cooldown to suppress re-triggering).
   */
  analyzeDecays(
    spectrum: Float32Array,
    rt60: number,
    now: number,
  ): Array<{ bandIndex: number; timestamp: number }> {
    const cooldowns: Array<{ bandIndex: number; timestamp: number }> = []
    const expiredBins: number[] = []

    for (const [dBin, decay] of this.recentDecays) {
      const elapsed = now - decay.clearTime
      if (elapsed > DECAY_ANALYSIS_WINDOW_MS) {
        expiredBins.push(dBin)
        continue
      }
      if (dBin < spectrum.length) {
        const currentDb = spectrum[dBin]
        if (currentDb > -100) {
          const elapsedSec = elapsed / 1000
          if (elapsedSec > 0.05) {
            const actualDecayRate = (decay.lastAmplitudeDb - currentDb) / elapsedSec
            const expectedDecayRate = 60 / rt60
            if (actualDecayRate > 0 && actualDecayRate < expectedDecayRate * 1.5) {
              const { bandIndex: geqBandIdx } = findNearestGEQBand(decay.frequencyHz)
              cooldowns.push({ bandIndex: geqBandIdx, timestamp: now })
            }
          }
        }
      }
    }

    for (const bin of expiredBins) {
      this.recentDecays.delete(bin)
    }

    return cooldowns
  }

  /** Prune entries past the TTL threshold. */
  pruneExpired(now: number): void {
    for (const [dBin, decay] of this.recentDecays) {
      if (now - decay.clearTime > MEMORY_LIMITS.DECAY_HISTORY_TTL_MS) {
        this.recentDecays.delete(dBin)
      }
    }
  }

  reset(): void {
    this.recentDecays.clear()
  }
}
