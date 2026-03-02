'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Advisory } from '@/types/advisory'

export interface FeedbackHistoryEntry {
  /** Number of times feedback was detected at this frequency */
  count: number
  /** Timestamp of last detection */
  lastSeen: number
  /** Highest severity seen at this frequency */
  maxSeverity: 'low' | 'medium' | 'high' | 'critical'
  /** MSD values over time for trend analysis */
  msdHistory: { timestamp: number; value: number }[]
}

export interface MSDDataPoint {
  timestamp: number
  frequency: number
  msdValue: number
  isFeedback: boolean
}

interface UseFeedbackHistoryOptions {
  /** Maximum age in ms before entries are cleaned up (default 5 minutes) */
  maxAge?: number
  /** Frequency bin tolerance in Hz for grouping nearby frequencies */
  frequencyTolerance?: number
  /** Maximum MSD history length per frequency */
  maxMsdHistoryLength?: number
}

const DEFAULT_OPTIONS: Required<UseFeedbackHistoryOptions> = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  frequencyTolerance: 10, // 10 Hz
  maxMsdHistoryLength: 100,
}

const SEVERITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 }

/**
 * Tracks feedback detection history for heatmap and trend visualization.
 * Groups nearby frequencies and tracks detection counts, severities, and MSD trends.
 */
export function useFeedbackHistory(
  advisories: Advisory[],
  options: UseFeedbackHistoryOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [feedbackHistory, setFeedbackHistory] = useState<Map<number, FeedbackHistoryEntry>>(new Map())
  const [msdHistory, setMsdHistory] = useState<Map<number, MSDDataPoint[]>>(new Map())
  
  const seenIdsRef = useRef<Set<string>>(new Set())
  const lastCleanupRef = useRef<number>(0)

  // Find the closest existing frequency within tolerance
  const findNearestFrequency = useCallback((freq: number, existingFreqs: number[]): number | null => {
    for (const existing of existingFreqs) {
      if (Math.abs(existing - freq) <= opts.frequencyTolerance) {
        return existing
      }
    }
    return null
  }, [opts.frequencyTolerance])

  // Update history when advisories change
  useEffect(() => {
    if (advisories.length === 0) return

    const now = Date.now()
    const updates = new Map(feedbackHistory)
    const msdUpdates = new Map(msdHistory)
    const existingFreqs = Array.from(updates.keys())

    for (const advisory of advisories) {
      // Skip if we've already processed this advisory
      if (seenIdsRef.current.has(advisory.id)) continue
      seenIdsRef.current.add(advisory.id)

      const freq = advisory.trueFrequencyHz
      const severity = advisory.severity as FeedbackHistoryEntry['maxSeverity']
      
      // Find or create frequency bin
      let binFreq = findNearestFrequency(freq, existingFreqs)
      if (binFreq === null) {
        binFreq = Math.round(freq)
        existingFreqs.push(binFreq)
      }

      // Update feedback history
      const existing = updates.get(binFreq)
      if (existing) {
        existing.count += 1
        existing.lastSeen = now
        if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[existing.maxSeverity]) {
          existing.maxSeverity = severity
        }
      } else {
        updates.set(binFreq, {
          count: 1,
          lastSeen: now,
          maxSeverity: severity,
          msdHistory: [],
        })
      }

      // Update MSD history if available
      if (advisory.algorithmScores?.msd) {
        const msdValue = advisory.algorithmScores.msd.value ?? 0
        const msdPoint: MSDDataPoint = {
          timestamp: now,
          frequency: binFreq,
          msdValue,
          isFeedback: advisory.algorithmScores.msd.isFeedbackLikely ?? false,
        }

        const existingMsd = msdUpdates.get(binFreq) ?? []
        existingMsd.push(msdPoint)
        
        // Trim to max length
        while (existingMsd.length > opts.maxMsdHistoryLength) {
          existingMsd.shift()
        }
        
        msdUpdates.set(binFreq, existingMsd)
      }
    }

    setFeedbackHistory(updates)
    setMsdHistory(msdUpdates)

    // Cleanup old entries periodically (every 30 seconds)
    if (now - lastCleanupRef.current > 30000) {
      lastCleanupRef.current = now
      
      // Clean up old feedback history
      for (const [freq, entry] of updates) {
        if (now - entry.lastSeen > opts.maxAge) {
          updates.delete(freq)
          msdUpdates.delete(freq)
        }
      }

      // Clean up seen IDs that are no longer in advisories
      const currentIds = new Set(advisories.map(a => a.id))
      for (const id of seenIdsRef.current) {
        if (!currentIds.has(id)) {
          seenIdsRef.current.delete(id)
        }
      }
    }
  }, [advisories, feedbackHistory, msdHistory, findNearestFrequency, opts.maxAge, opts.maxMsdHistoryLength])

  // Clear all history
  const clearHistory = useCallback(() => {
    setFeedbackHistory(new Map())
    setMsdHistory(new Map())
    seenIdsRef.current.clear()
  }, [])

  // Get top N problem frequencies
  const getTopProblemFrequencies = useCallback((n: number = 5): { frequency: number; count: number; severity: string }[] => {
    return Array.from(feedbackHistory.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, n)
      .map(([freq, entry]) => ({
        frequency: freq,
        count: entry.count,
        severity: entry.maxSeverity,
      }))
  }, [feedbackHistory])

  // Export history as JSON
  const exportHistory = useCallback(() => {
    return {
      feedbackHistory: Object.fromEntries(feedbackHistory),
      msdHistory: Object.fromEntries(
        Array.from(msdHistory.entries()).map(([freq, points]) => [freq, points])
      ),
      exportedAt: new Date().toISOString(),
    }
  }, [feedbackHistory, msdHistory])

  return {
    /** Map of frequency -> FeedbackHistoryEntry */
    feedbackHistory,
    /** Map of frequency -> MSDDataPoint[] for trend visualization */
    msdHistory,
    /** Clear all history */
    clearHistory,
    /** Get top N most frequently triggered frequencies */
    getTopProblemFrequencies,
    /** Export history as JSON */
    exportHistory,
    /** Total number of tracked frequencies */
    trackedCount: feedbackHistory.size,
  }
}
