'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type RefObject,
} from 'react'
import type { SpectrumData } from '@/types/advisory'

// ── Context value ───────────────────────────────────────────────────────────

interface AudioStateContextValue {
  // Engine state (from useAudioAnalyzer)
  isRunning: boolean
  isStarting: boolean
  error: string | null

  // Gain metering (derived from spectrumStatus)
  inputLevel: number
  isAutoGain: boolean
  autoGainDb: number | undefined
  autoGainLocked: boolean

  // Spectrum data ref
  spectrumRef: RefObject<SpectrumData | null>

  // Freeze (managed by parent, distributed via context)
  isFrozen: boolean
  toggleFreeze: () => void

  // Actions
  start: () => void
  stop: () => void
}

const AudioStateContext = createContext<AudioStateContextValue | null>(null)

// ── Provider props ──────────────────────────────────────────────────────────

interface AudioStateProviderProps {
  isRunning: boolean
  isStarting: boolean
  error: string | null
  inputLevel: number
  isAutoGain: boolean
  autoGainDb: number | undefined
  autoGainLocked: boolean
  spectrumRef: RefObject<SpectrumData | null>
  isFrozen: boolean
  toggleFreeze: () => void
  start: () => void
  stop: () => void
  children: ReactNode
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AudioStateProvider({
  isRunning,
  isStarting,
  error,
  inputLevel,
  isAutoGain,
  autoGainDb,
  autoGainLocked,
  spectrumRef,
  isFrozen,
  toggleFreeze,
  start,
  stop,
  children,
}: AudioStateProviderProps) {
  // ── Memoized value ──────────────────────────────────────────────────────

  const value = useMemo<AudioStateContextValue>(() => ({
    isRunning,
    isStarting,
    error,
    inputLevel,
    isAutoGain,
    autoGainDb,
    autoGainLocked,
    spectrumRef,
    isFrozen,
    toggleFreeze,
    start,
    stop,
  }), [
    isRunning,
    isStarting,
    error,
    inputLevel,
    isAutoGain,
    autoGainDb,
    autoGainLocked,
    spectrumRef,
    isFrozen,
    toggleFreeze,
    start,
    stop,
  ])

  return (
    <AudioStateContext.Provider value={value}>
      {children}
    </AudioStateContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAudioState(): AudioStateContextValue {
  const ctx = useContext(AudioStateContext)
  if (!ctx) throw new Error('useAudioState must be used within <AudioStateProvider>')
  return ctx
}
