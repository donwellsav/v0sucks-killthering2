'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { SpectrumData, Advisory } from '@/types/advisory'

interface RecordedFrame {
  timestamp: number
  spectrum: {
    freqDb: number[]
    noiseFloorDb: number | null
    effectiveThresholdDb: number
    peak: number
  }
  advisories: {
    id: string
    frequency: number
    amplitude: number
    severity: string
  }[]
}

interface SessionRecording {
  id: string
  name: string
  startTime: number
  endTime: number
  duration: number
  frames: RecordedFrame[]
  settings: Record<string, unknown>
}

export interface SessionRecorderContentProps {
  spectrum: SpectrumData | null
  advisories: Advisory[]
  isRunning: boolean
  settings: Record<string, unknown>
  onPlaybackFrame?: (frame: RecordedFrame) => void
}

const MAX_RECORDING_DURATION = 5 * 60 * 1000
const RECORDING_INTERVAL = 100

export function SessionRecorderContent({
  spectrum,
  advisories,
  isRunning,
  settings,
  onPlaybackFrame,
}: SessionRecorderContentProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<SessionRecording[]>([])
  const [currentRecording, setCurrentRecording] = useState<SessionRecording | null>(null)
  const [playbackRecording, setPlaybackRecording] = useState<SessionRecording | null>(null)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const recordingRef = useRef<SessionRecording | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const startRecording = useCallback(() => {
    if (!isRunning) return
    const rec: SessionRecording = {
      id: crypto.randomUUID(),
      name: `Recording ${recordings.length + 1}`,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      frames: [],
      settings: { ...settings },
    }
    recordingRef.current = rec
    setCurrentRecording(rec)
    setIsRecording(true)

    recordingIntervalRef.current = setInterval(() => {
      if (!recordingRef.current || !spectrum) return
      if (Date.now() - recordingRef.current.startTime > MAX_RECORDING_DURATION) {
        stopRecording()
        return
      }
      recordingRef.current.frames.push({
        timestamp: Date.now(),
        spectrum: {
          freqDb: Array.from(spectrum.freqDb ?? []),
          noiseFloorDb: spectrum.noiseFloorDb,
          effectiveThresholdDb: spectrum.effectiveThresholdDb,
          peak: spectrum.peak,
        },
        advisories: advisories.map(a => ({
          id: a.id,
          frequency: a.trueFrequencyHz,
          amplitude: a.trueAmplitudeDb,
          severity: a.severity,
        })),
      })
      setCurrentRecording({ ...recordingRef.current })
    }, RECORDING_INTERVAL)
  }, [isRunning, spectrum, advisories, settings, recordings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    const rec = recordingRef.current
    rec.endTime = Date.now()
    rec.duration = rec.endTime - rec.startTime
    setRecordings(prev => [...prev, rec])
    setCurrentRecording(null)
    setIsRecording(false)
    recordingRef.current = null
  }, [])

  const loadForPlayback = useCallback((rec: SessionRecording) => {
    setPlaybackRecording(rec)
    setPlaybackIndex(0)
    setIsPlaying(false)
  }, [])

  const startPlayback = useCallback(() => {
    if (!playbackRecording) return
    setIsPlaying(true)
    playbackIntervalRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        const next = prev + 1
        if (next >= playbackRecording.frames.length) {
          setIsPlaying(false)
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
          return playbackRecording.frames.length - 1
        }
        if (onPlaybackFrame) onPlaybackFrame(playbackRecording.frames[next])
        return next
      })
    }, RECORDING_INTERVAL / playbackSpeed)
  }, [playbackRecording, playbackSpeed, onPlaybackFrame])

  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
  }, [])

  const seekTo = useCallback((index: number) => {
    if (!playbackRecording) return
    const i = Math.max(0, Math.min(index, playbackRecording.frames.length - 1))
    setPlaybackIndex(i)
    if (onPlaybackFrame) onPlaybackFrame(playbackRecording.frames[i])
  }, [playbackRecording, onPlaybackFrame])

  const exportRecording = useCallback((rec: SessionRecording) => {
    const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rec.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id))
    if (playbackRecording?.id === id) {
      setPlaybackRecording(null)
      setIsPlaying(false)
    }
  }, [playbackRecording])

  useEffect(() => () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
  }, [])

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
          <span className="text-xs text-destructive font-medium">
            Recording — {formatDuration((currentRecording?.frames.length ?? 0) * RECORDING_INTERVAL)}
          </span>
        </div>
      )}

      {/* Record / Stop */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Records spectrum + detections for later review. Max 5 minutes.
        </p>
        <Button
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          className="w-full h-9"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isRunning && !isRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        {!isRunning && !isRecording && (
          <p className="text-[10px] text-muted-foreground text-center">Start analysis to enable recording</p>
        )}
      </div>

      {/* Saved recordings */}
      {recordings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Saved Recordings</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {recordings.map(rec => (
              <div
                key={rec.id}
                className={cn(
                  'p-2 rounded border text-xs flex items-center justify-between gap-2',
                  playbackRecording?.id === rec.id ? 'border-primary bg-primary/10' : 'border-border'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{rec.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {formatDuration(rec.duration)} · {rec.frames.length} frames
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[9px]" onClick={() => loadForPlayback(rec)}>Load</Button>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[9px]" onClick={() => exportRecording(rec)}>Export</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] text-destructive" onClick={() => deleteRecording(rec.id)}>Del</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playback controls */}
      {playbackRecording && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium truncate">{playbackRecording.name}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[10px]" onClick={() => setPlaybackRecording(null)}>✕</Button>
          </div>
          <div className="space-y-1">
            <Slider
              value={[playbackIndex]}
              onValueChange={([v]) => seekTo(v)}
              min={0}
              max={Math.max(0, playbackRecording.frames.length - 1)}
              step={1}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatDuration(playbackIndex * RECORDING_INTERVAL)}</span>
              <span>{formatDuration(playbackRecording.duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 flex-1" onClick={isPlaying ? pausePlayback : startPlayback}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <select
              value={playbackSpeed}
              onChange={e => setPlaybackSpeed(Number(e.target.value))}
              className="h-7 px-2 text-xs bg-background border border-border rounded"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
