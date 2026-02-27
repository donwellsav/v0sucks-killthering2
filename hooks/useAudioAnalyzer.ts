// KillTheRing2 React Hook - Manages audio analyzer lifecycle

import { useState, useEffect, useCallback, useRef } from 'react'
import { AudioAnalyzer, createAudioAnalyzer } from '@/lib/audio/createAudioAnalyzer'
import type { 
  AnalysisConfig, 
  Advisory, 
  Track, 
  SpectrumData,
  OperatingMode,
  Preset 
} from '@/types/advisory'
import { DEFAULT_CONFIG } from '@/types/advisory'

export interface UseAudioAnalyzerState {
  isRunning: boolean
  hasPermission: boolean
  error: string | null
  noiseFloorDb: number | null
  sampleRate: number
  fftSize: number
  spectrum: SpectrumData | null
  tracks: Track[]
  advisories: Advisory[]
}

export interface UseAudioAnalyzerReturn extends UseAudioAnalyzerState {
  start: () => Promise<void>
  stop: () => void
  updateConfig: (config: Partial<AnalysisConfig>) => void
  setMode: (mode: OperatingMode) => void
  setPreset: (preset: Preset) => void
  setIgnoreWhistle: (ignore: boolean) => void
  config: AnalysisConfig
}

export function useAudioAnalyzer(
  initialConfig: Partial<AnalysisConfig> = {}
): UseAudioAnalyzerReturn {
  const [config, setConfig] = useState<AnalysisConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  }))

  const [state, setState] = useState<UseAudioAnalyzerState>({
    isRunning: false,
    hasPermission: false,
    error: null,
    noiseFloorDb: null,
    sampleRate: 48000,
    fftSize: config.fftSize,
    spectrum: null,
    tracks: [],
    advisories: [],
  })

  const analyzerRef = useRef<AudioAnalyzer | null>(null)

  // Initialize analyzer
  useEffect(() => {
    const analyzer = createAudioAnalyzer(config, {
      onSpectrum: (data) => {
        setState(prev => ({ ...prev, spectrum: data }))
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
              .slice(0, config.maxIssues),
          }
        })
      },
      onAdvisoryCleared: (advisoryId) => {
        setState(prev => ({
          ...prev,
          advisories: prev.advisories.filter(a => a.id !== advisoryId),
        }))
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

  // Update config when it changes
  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.updateConfig(config)
    }
  }, [config])

  const start = useCallback(async () => {
    if (!analyzerRef.current) return
    
    try {
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
    setState(prev => ({
      ...prev,
      isRunning: false,
      advisories: [],
      tracks: [],
    }))
  }, [])

  const updateConfig = useCallback((newConfig: Partial<AnalysisConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  const setMode = useCallback((mode: OperatingMode) => {
    setConfig(prev => ({ ...prev, mode }))
    if (analyzerRef.current) {
      analyzerRef.current.setMode(mode)
    }
  }, [])

  const setPreset = useCallback((preset: Preset) => {
    setConfig(prev => ({ ...prev, preset }))
    if (analyzerRef.current) {
      analyzerRef.current.setPreset(preset)
    }
  }, [])

  const setIgnoreWhistle = useCallback((ignore: boolean) => {
    setConfig(prev => ({ ...prev, ignoreWhistle: ignore }))
    if (analyzerRef.current) {
      analyzerRef.current.setIgnoreWhistle(ignore)
    }
  }, [])

  return {
    ...state,
    config,
    start,
    stop,
    updateConfig,
    setMode,
    setPreset,
    setIgnoreWhistle,
  }
}

function getSeverityUrgency(severity: string): number {
  switch (severity) {
    case 'RUNAWAY': return 5
    case 'GROWING': return 4
    case 'RESONANCE': return 3
    case 'POSSIBLE_RING': return 2
    case 'WHISTLE': return 1
    case 'INSTRUMENT': return 1
    default: return 0
  }
}
