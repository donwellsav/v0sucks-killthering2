/**
 * MSDPool Unit Tests
 *
 * Tests the consolidated MSDPool class that replaces both the inline MSD
 * implementation in feedbackDetector.ts and MSDHistoryBuffer in msdAnalysis.ts.
 *
 * Covers: slot allocation, LRU eviction, ring buffer wrap-around, MSD formula,
 * growth rate, min frames gating, multi-bin isolation, release, and reset.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MSDPool } from '../msdPool'
import { MSD_SETTINGS } from '../constants'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Compute expected MSD by hand for a sequence of dB values. */
function expectedMsd(values: number[]): number {
  if (values.length < 3) return Infinity
  let sumSq = 0
  for (let i = 2; i < values.length; i++) {
    const d2 = values[i] - 2 * values[i - 1] + values[i - 2]
    sumSq += d2 * d2
  }
  return sumSq / (values.length - 2)
}

/** Compute expected growth rate for a sequence of dB values. */
function expectedGrowthRate(values: number[]): number {
  if (values.length < 2) return 0
  let sum = 0
  for (let i = 1; i < values.length; i++) {
    sum += values[i] - values[i - 1]
  }
  return sum / (values.length - 1)
}

/** Feed a sequence of values to a single bin. */
function feedBin(pool: MSDPool, binIndex: number, values: number[]): void {
  for (const v of values) {
    pool.write(binIndex, v)
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MSDPool', () => {
  let pool: MSDPool

  beforeEach(() => {
    pool = new MSDPool()
  })

  // ── Constructor ────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default pool size and history size', () => {
      expect(pool.activeSlotCount).toBe(0)
    })

    it('creates with custom dimensions', () => {
      const custom = new MSDPool(16, 8)
      expect(custom.activeSlotCount).toBe(0)
    })

    it('throws on non-power-of-2 history size', () => {
      expect(() => new MSDPool(256, 50)).toThrow('power of 2')
    })
  })

  // ── Write + getMSD ─────────────────────────────────────────────────────

  describe('linear ramp (feedback pattern)', () => {
    it('produces MSD ≈ 0 for perfectly linear dB growth', () => {
      // Linear ramp: constant first derivative → zero second derivative → MSD = 0
      const values = Array.from({ length: 20 }, (_, i) => -40 + i * 1.0)
      feedBin(pool, 100, values)

      const result = pool.getMSD(100, 3)
      expect(result.msd).toBeCloseTo(0, 5)
      expect(result.growthRate).toBeCloseTo(1.0, 5)
      expect(result.frameCount).toBe(20)
    })
  })

  describe('constant magnitude (stable feedback)', () => {
    it('produces MSD ≈ 0 for constant dB', () => {
      const values = Array.from({ length: 15 }, () => -30)
      feedBin(pool, 200, values)

      const result = pool.getMSD(200, 3)
      expect(result.msd).toBeCloseTo(0, 10)
      expect(result.growthRate).toBeCloseTo(0, 10)
    })
  })

  describe('random fluctuations (music/speech)', () => {
    it('produces MSD >> 0 for random magnitudes', () => {
      // Seeded pseudo-random for reproducibility
      const values: number[] = []
      let seed = 12345
      for (let i = 0; i < 30; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        values.push(-40 + (seed % 20))
      }
      feedBin(pool, 300, values)

      const result = pool.getMSD(300, 3)
      expect(result.msd).toBeGreaterThan(1.0) // Music: high MSD
    })
  })

  describe('numerical accuracy', () => {
    it('matches hand-computed MSD for known sequence', () => {
      const values = [-30, -28, -27, -25, -24, -20, -18, -15, -13, -10]
      feedBin(pool, 500, values)

      const result = pool.getMSD(500, 3)
      const expected = expectedMsd(values)
      expect(result.msd).toBeCloseTo(expected, 5)
    })

    it('matches hand-computed growth rate', () => {
      const values = [-30, -28, -27, -25, -24, -20, -18, -15, -13, -10]
      feedBin(pool, 600, values)

      const result = pool.getMSD(600, 3)
      const expected = expectedGrowthRate(values)
      expect(result.growthRate).toBeCloseTo(expected, 5)
    })

    it('handles sinusoidal modulation (non-zero MSD)', () => {
      // Sine wave oscillation: second derivative is non-zero
      const values = Array.from({ length: 20 }, (_, i) => -30 + 5 * Math.sin(i * 0.5))
      feedBin(pool, 700, values)

      const result = pool.getMSD(700, 3)
      const expected = expectedMsd(values)
      expect(result.msd).toBeCloseTo(expected, 4)
      expect(result.msd).toBeGreaterThan(0.01)
    })
  })

  // ── Min frames gating ──────────────────────────────────────────────────

  describe('min frames gating', () => {
    it('returns msd = -1 when below minFrames', () => {
      feedBin(pool, 100, [-30, -29, -28])  // 3 frames
      const result = pool.getMSD(100, 7)    // Need 7
      expect(result.msd).toBe(-1)
      expect(result.frameCount).toBe(0) // NO_RESULT sentinel
    })

    it('returns valid MSD once minFrames reached', () => {
      const values = Array.from({ length: 7 }, (_, i) => -30 + i)
      feedBin(pool, 100, values)
      const result = pool.getMSD(100, 7)
      expect(result.msd).toBeGreaterThanOrEqual(0)
      expect(result.frameCount).toBe(7)
    })

    it('uses content-adaptive minFrames correctly', () => {
      feedBin(pool, 100, Array.from({ length: 10 }, (_, i) => -30 + i))

      // Speech: 7 frames → should work at 10 frames
      expect(pool.getMSD(100, MSD_SETTINGS.MIN_FRAMES_SPEECH).msd).toBeGreaterThanOrEqual(0)

      // Music: 13 frames → should fail at 10 frames
      expect(pool.getMSD(100, MSD_SETTINGS.MIN_FRAMES_MUSIC).msd).toBe(-1)
    })
  })

  // ── No slot ────────────────────────────────────────────────────────────

  describe('no slot', () => {
    it('returns msd = -1 for untracked bin', () => {
      const result = pool.getMSD(9999, 3)
      expect(result.msd).toBe(-1)
    })
  })

  // ── Ring buffer wrap-around ────────────────────────────────────────────

  describe('ring buffer wrap-around', () => {
    it('wraps correctly after historySize frames', () => {
      // Write more than historySize (64) frames
      const allValues = Array.from({ length: 80 }, (_, i) => -40 + i * 0.5)
      feedBin(pool, 100, allValues)

      // Only the last 64 values should be in the buffer
      const last64 = allValues.slice(-64)
      const expected = expectedMsd(last64)

      const result = pool.getMSD(100, 3)
      expect(result.frameCount).toBe(64) // Capped at historySize
      expect(result.msd).toBeCloseTo(expected, 4)
    })
  })

  // ── Multi-bin isolation ────────────────────────────────────────────────

  describe('multi-bin isolation', () => {
    it('bins do not interfere with each other', () => {
      // Bin 100: constant (MSD ≈ 0)
      feedBin(pool, 100, Array.from({ length: 15 }, () => -30))

      // Bin 200: random (MSD >> 0)
      let seed = 42
      const randomValues: number[] = []
      for (let i = 0; i < 15; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        randomValues.push(-40 + (seed % 20))
      }
      feedBin(pool, 200, randomValues)

      const r100 = pool.getMSD(100, 3)
      const r200 = pool.getMSD(200, 3)

      expect(r100.msd).toBeCloseTo(0, 5)
      expect(r200.msd).toBeGreaterThan(0.5)
    })
  })

  // ── Slot allocation and LRU eviction ───────────────────────────────────

  describe('slot allocation', () => {
    it('tracks activeSlotCount', () => {
      pool.write(10, -30)
      pool.write(20, -30)
      pool.write(30, -30)
      expect(pool.activeSlotCount).toBe(3)
    })

    it('has() returns correct state', () => {
      expect(pool.has(10)).toBe(false)
      pool.write(10, -30)
      expect(pool.has(10)).toBe(true)
    })
  })

  describe('LRU eviction', () => {
    it('evicts oldest slot when pool is full', () => {
      const small = new MSDPool(4, 8)

      // Fill all 4 slots
      small.write(10, -30)
      small.write(20, -30)
      small.write(30, -30)
      small.write(40, -30)
      expect(small.activeSlotCount).toBe(4)

      // Write a 5th bin → evicts oldest (bin 10)
      small.write(50, -30)
      expect(small.activeSlotCount).toBe(4)
      expect(small.has(10)).toBe(false) // Evicted
      expect(small.has(50)).toBe(true)  // New
    })

    it('evicts least recently written slot', () => {
      const small = new MSDPool(3, 8)

      small.write(10, -30)
      small.write(20, -30)
      small.write(30, -30)

      // Touch bin 10 again (most recent)
      small.write(10, -25)

      // Add new bin → evicts bin 20 (oldest untouched)
      small.write(40, -30)
      expect(small.has(10)).toBe(true)  // Was touched
      expect(small.has(20)).toBe(false) // Evicted (oldest)
      expect(small.has(30)).toBe(true)
      expect(small.has(40)).toBe(true)
    })
  })

  // ── Release ────────────────────────────────────────────────────────────

  describe('release', () => {
    it('frees a slot back to the pool', () => {
      pool.write(100, -30)
      expect(pool.has(100)).toBe(true)
      expect(pool.activeSlotCount).toBe(1)

      pool.release(100)
      expect(pool.has(100)).toBe(false)
      expect(pool.activeSlotCount).toBe(0)
    })

    it('released slot history is cleared', () => {
      feedBin(pool, 100, Array.from({ length: 10 }, (_, i) => -30 + i))
      pool.release(100)

      // Re-write to same bin — should start fresh
      feedBin(pool, 100, [-30, -30, -30])
      expect(pool.getFrameCount(100)).toBe(3)
    })

    it('release of untracked bin is a no-op', () => {
      pool.release(9999) // Should not throw
      expect(pool.activeSlotCount).toBe(0)
    })
  })

  // ── getFrameCount ──────────────────────────────────────────────────────

  describe('getFrameCount', () => {
    it('returns 0 for untracked bin', () => {
      expect(pool.getFrameCount(100)).toBe(0)
    })

    it('tracks frame count correctly', () => {
      pool.write(100, -30)
      expect(pool.getFrameCount(100)).toBe(1)
      pool.write(100, -29)
      expect(pool.getFrameCount(100)).toBe(2)
    })

    it('caps at historySize', () => {
      for (let i = 0; i < 100; i++) {
        pool.write(100, -30 + i * 0.1)
      }
      expect(pool.getFrameCount(100)).toBe(MSD_SETTINGS.HISTORY_SIZE)
    })
  })

  // ── Reset ──────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all slots and mappings', () => {
      feedBin(pool, 100, [-30, -29, -28])
      feedBin(pool, 200, [-25, -24, -23])
      expect(pool.activeSlotCount).toBe(2)

      pool.reset()
      expect(pool.activeSlotCount).toBe(0)
      expect(pool.has(100)).toBe(false)
      expect(pool.has(200)).toBe(false)
      expect(pool.getMSD(100, 3).msd).toBe(-1)
    })

    it('allows reuse after reset', () => {
      feedBin(pool, 100, Array.from({ length: 10 }, () => -30))
      pool.reset()

      feedBin(pool, 100, Array.from({ length: 10 }, (_, i) => -30 + i))
      const result = pool.getMSD(100, 3)
      expect(result.msd).toBeGreaterThanOrEqual(0)
      expect(result.frameCount).toBe(10)
    })
  })

  // ── feedbackScore compatibility ────────────────────────────────────────

  describe('feedbackScore computation (caller responsibility)', () => {
    it('raw MSD can be converted to feedbackScore matching MSDHistoryBuffer', () => {
      // Verify callers can compute feedbackScore = exp(-msd / 0.1)
      const values = Array.from({ length: 15 }, () => -30) // Constant → MSD ≈ 0
      feedBin(pool, 100, values)

      const raw = pool.getMSD(100, 3)
      const feedbackScore = Math.exp(-raw.msd / 0.1)
      expect(feedbackScore).toBeCloseTo(1.0, 5) // MSD ≈ 0 → score ≈ 1
    })
  })
})
