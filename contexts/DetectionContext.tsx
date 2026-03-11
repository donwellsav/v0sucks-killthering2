'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'
import type { Advisory } from '@/types/advisory'
import type { EarlyWarning } from '@/hooks/useAudioAnalyzer'

// ── Context value ───────────────────────────────────────────────────────────

interface DetectionContextValue {
  // State
  advisories: Advisory[]
  activeAdvisoryCount: number
  earlyWarning: EarlyWarning | null
  dismissedIds: Set<string>
  rtaClearedIds: Set<string>
  geqClearedIds: Set<string>
  hasActiveRTAMarkers: boolean
  hasActiveGEQBars: boolean
  falsePositiveIds: ReadonlySet<string> | undefined

  // Actions
  onDismiss: (id: string) => void
  onClearAll: () => void
  onClearResolved: () => void
  onClearRTA: () => void
  onClearGEQ: () => void
  onFalsePositive: ((advisoryId: string) => void) | undefined
}

const DetectionContext = createContext<DetectionContextValue | null>(null)

// ── Provider props ──────────────────────────────────────────────────────────

interface DetectionProviderProps {
  advisories: Advisory[]
  earlyWarning: EarlyWarning | null
  onFalsePositive: ((advisoryId: string) => void) | undefined
  falsePositiveIds: ReadonlySet<string> | undefined
  children: ReactNode
}

// ── Provider ────────────────────────────────────────────────────────────────

export function DetectionProvider({
  advisories,
  earlyWarning,
  onFalsePositive,
  falsePositiveIds,
  children,
}: DetectionProviderProps) {
  // ── Derived state ───────────────────────────────────────────────────────

  const activeAdvisoryCount = useMemo(
    () => advisories.filter(a => !a.resolved).length,
    [advisories],
  )

  // ── Dismissed advisory IDs ──────────────────────────────────────────────

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const onDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
  }, [])

  const onClearAll = useCallback(() => {
    setDismissedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  const onClearResolved = useCallback(() => {
    setDismissedIds(prev => {
      const next = new Set(prev)
      advisories.forEach(a => { if (a.resolved) next.add(a.id) })
      return next
    })
  }, [advisories])

  // ── GEQ-specific cleared IDs ────────────────────────────────────────────

  const [geqClearedIds, setGeqClearedIds] = useState<Set<string>>(new Set())

  const onClearGEQ = useCallback(() => {
    setGeqClearedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  const hasActiveGEQBars = useMemo(
    () => advisories.some(a => !geqClearedIds.has(a.id) && a.advisory?.geq),
    [advisories, geqClearedIds],
  )

  // ── RTA-specific cleared IDs ────────────────────────────────────────────

  const [rtaClearedIds, setRtaClearedIds] = useState<Set<string>>(new Set())

  const onClearRTA = useCallback(() => {
    setRtaClearedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  const hasActiveRTAMarkers = useMemo(
    () => advisories.some(a => !rtaClearedIds.has(a.id)),
    [advisories, rtaClearedIds],
  )

  // ── Auto-expire stale IDs when advisories leave the live list ───────────

  useEffect(() => {
    if (dismissedIds.size === 0 && geqClearedIds.size === 0 && rtaClearedIds.size === 0) return
    const liveIds = new Set(advisories.map(a => a.id))

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: prune stale IDs when advisories change
    setDismissedIds(prev => {
      const next = new Set<string>()
      prev.forEach(id => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
    setGeqClearedIds(prev => {
      const next = new Set<string>()
      prev.forEach(id => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
    setRtaClearedIds(prev => {
      const next = new Set<string>()
      prev.forEach(id => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
  }, [advisories, dismissedIds.size, geqClearedIds.size, rtaClearedIds.size])

  // ── Memoized value ──────────────────────────────────────────────────────

  const value = useMemo<DetectionContextValue>(() => ({
    advisories,
    activeAdvisoryCount,
    earlyWarning,
    dismissedIds,
    rtaClearedIds,
    geqClearedIds,
    hasActiveRTAMarkers,
    hasActiveGEQBars,
    falsePositiveIds,
    onDismiss,
    onClearAll,
    onClearResolved,
    onClearRTA,
    onClearGEQ,
    onFalsePositive,
  }), [
    advisories,
    activeAdvisoryCount,
    earlyWarning,
    dismissedIds,
    rtaClearedIds,
    geqClearedIds,
    hasActiveRTAMarkers,
    hasActiveGEQBars,
    falsePositiveIds,
    onDismiss,
    onClearAll,
    onClearResolved,
    onClearRTA,
    onClearGEQ,
    onFalsePositive,
  ])

  return (
    <DetectionContext.Provider value={value}>
      {children}
    </DetectionContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useDetection(): DetectionContextValue {
  const ctx = useContext(DetectionContext)
  if (!ctx) throw new Error('useDetection must be used within <DetectionProvider>')
  return ctx
}
