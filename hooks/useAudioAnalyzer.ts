// KillTheRing2 React Hook - Manages audio analyzer lifecycle

import { useState, useEffect, useCallback, useRef } from 'react'
import { AudioAnalyzer, createAudioAnalyzer } from '@/lib/audio/createAudioAnalyzer'
import type { 
  Advisory, 
  SpectrumData,
  TrackedPeak,
  DetectorSettings,
} from '@/types/advisory'
import { DEFAULT_SETTINGS } from '@/lib/dsp/constants'

export interface UseAudioAnalyzerState {
  isRunning: boolean
  hasPermission: boolean
  error: string | null
  noiseFloorDb: number | null
  sampleRate: number
  fftSize: number
  spectrum: SpectrumData | null
  tracks: TrackedPeak[]
  advisories: Advisory[]
}

export interface UseAudioAnalyzerReturn extends UseAudioAnalyzerState {
  start: () => Promise<void>
  stop: () => void
  updateSettings: (settings: Partial<DetectorSettings>) => void
  resetSettings: () => void
  settings: DetectorSettings
}

export function useAudioAnalyzer(
  initialSettings: Partial<DetectorSettings> = {}
): UseAudioAnalyzerReturn {
  const [settings, setSettings] = useState<DetectorSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  }))

  const [state, setState] = useState<UseAudioAnalyzerState>({
    isRunning: false,
    hasPermission: false,
    error: null,
    noiseFloorDb: null,
    sampleRate: 48000,
    fftSize: settings.fftSize,
    spectrum: null,
    tracks: [],
    advisories: [],
  })

  const analyzerRef = useRef<AudioAnalyzer | null>(null)
  const settingsRef = useRef(settings)
  
  // Keep settings ref in sync
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Initialize analyzer
  useEffect(() => {
    const analyzer = createAudioAnalyzer(settings, {
      onSpectrum: (data) => {
        setState(prev => ({ 
          ...prev, 
          spectrum: data,
          noiseFloorDb: data.noiseFloorDb,
        }))
      },
      onAdvisory: (advisory) => {
        setState(prev => {
          const existing = prev.advisories.findIndex(a => a.id === advisory.id)
          const newAdvisories = [...prev.advisories]
          if (existing >= 0) {
            newAdvisories[existing] = advisory
          } else {
            newAdvisories.push(advisory)
          }
          // Sort by urgency and limit
          return {
            ...prev,
            advisories: newAdvisories
              .sort((a, b) => {
                const urgencyA = getSeverityUrgency(a.severity)
                const urgencyB = getSeverityUrgency(b.severity)
                if (urgencyA !== urgencyB) return urgencyB - urgencyA
                return b.trueAmplitudeDb - a.trueAmplitudeDb
              })
              .slice(0, settingsRef.current.maxDisplayedIssues),
          }
        })
      },
      onAdvisoryCleared: (_advisoryId) => {
        // Do NOT remove advisories during analysis - keep them visible
        // so the engineer can see and address the issues
        // Advisories are only cleared on new analysis start
      },
      onTracksUpdate: (tracks) => {
        setState(prev => ({ ...prev, tracks }))
      },
      onError: (error) => {
        setState(prev => ({
          ...prev,
          error: error.message,
          isRunning: false,
        }))
      },
      onStateChange: (isRunning) => {
        setState(prev => ({ ...prev, isRunning }))
      },
    })

    analyzerRef.current = analyzer

    return () => {
      analyzer.stop({ releaseMic: true })
    }
  }, []) // Only create once

  // Update settings when they change
  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.updateSettings(settings)
      setState(prev => ({ ...prev, fftSize: settings.fftSize }))
    }
  }, [settings])

  const start = useCallback(async () => {
    if (!analyzerRef.current) return
    
    try {
      // Clear previous advisories when starting fresh analysis
      setState(prev => ({ ...prev, advisories: [], tracks: [] }))
      
      await analyzerRef.current.start()
      const analyzerState = analyzerRef.current.getState()
      setState(prev => ({
        ...prev,
        isRunning: true,
        hasPermission: analyzerState.hasPermission,
        error: null,
        noiseFloorDb: analyzerState.noiseFloorDb,
        sampleRate: analyzerState.sampleRate,
        fftSize: analyzerState.fftSize,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start',
        isRunning: false,
        hasPermission: false,
      }))
    }
  }, [])

  const stop = useCallback(() => {
    if (!analyzerRef.current) return
    analyzerRef.current.stop({ releaseMic: false })
    // Keep advisories visible until next start - only clear running state
    setState(prev => ({
      ...prev,
      isRunning: false,
      tracks: [],
    }))
  }, [])

  const updateSettings = useCallback((newSettings: Partial<DetectorSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return {
    ...state,
    settings,
    start,
    stop,
    updateSettings,
    resetSettings,
  }
}

function getSeverityUrgency(severity: string): number {
  switch (severity) {
    case 'runaway': return 5
    case 'growing': return 4
    case 'resonance': return 3
    case 'ring': return 2
    case 'whistle': return 1
    case 'instrument': return 1
    default: return 0
  }
}
