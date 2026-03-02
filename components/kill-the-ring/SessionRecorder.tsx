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

interface SessionRecorderProps {
  /** Current spectrum data */
  spectrum: SpectrumData | null
  /** Current advisories */
  advisories: Advisory[]
  /** Whether analysis is running */
  isRunning: boolean
  /** Current settings for metadata */
  settings: Record<string, unknown>
  /** Callback when a recording is loaded for playback */
  onPlaybackFrame?: (frame: RecordedFrame) => void
  className?: string
}

const MAX_RECORDING_DURATION = 5 * 60 * 1000 // 5 minutes max
const RECORDING_INTERVAL = 100 // Record every 100ms

export function SessionRecorder({
  spectrum,
  advisories,
  isRunning,
  settings,
  onPlaybackFrame,
  className,
}: SessionRecorderProps) {
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

  // Start recording
  const startRecording = useCallback(() => {
    if (!isRunning) return

    const newRecording: SessionRecording = {
      id: crypto.randomUUID(),
      name: `Recording ${recordings.length + 1}`,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      frames: [],
      settings: { ...settings },
    }

    recordingRef.current = newRecording
    setCurrentRecording(newRecording)
    setIsRecording(true)

    // Start recording interval
    recordingIntervalRef.current = setInterval(() => {
      if (!recordingRef.current || !spectrum) return

      // Check max duration
      const elapsed = Date.now() - recordingRef.current.startTime
      if (elapsed > MAX_RECORDING_DURATION) {
        stopRecording()
        return
      }

      // Record frame
      const frame: RecordedFrame = {
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
      }

      recordingRef.current.frames.push(frame)
      setCurrentRecording({ ...recordingRef.current })
    }, RECORDING_INTERVAL)
  }, [isRunning, spectrum, advisories, settings, recordings.length])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }

    const recording = recordingRef.current
    recording.endTime = Date.now()
    recording.duration = recording.endTime - recording.startTime

    setRecordings(prev => [...prev, recording])
    setCurrentRecording(null)
    setIsRecording(false)
    recordingRef.current = null
  }, [])

  // Load recording for playback
  const loadForPlayback = useCallback((recording: SessionRecording) => {
    setPlaybackRecording(recording)
    setPlaybackIndex(0)
    setIsPlaying(false)
  }, [])

  // Start playback
  const startPlayback = useCallback(() => {
    if (!playbackRecording || playbackRecording.frames.length === 0) return

    setIsPlaying(true)

    playbackIntervalRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        const next = prev + 1
        if (next >= playbackRecording.frames.length) {
          setIsPlaying(false)
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current)
            playbackIntervalRef.current = null
          }
          return playbackRecording.frames.length - 1
        }
        
        // Emit frame for visualization
        if (onPlaybackFrame) {
          onPlaybackFrame(playbackRecording.frames[next])
        }
        
        return next
      })
    }, RECORDING_INTERVAL / playbackSpeed)
  }, [playbackRecording, playbackSpeed, onPlaybackFrame])

  // Pause playback
  const pausePlayback = useCallback(() => {
    setIsPlaying(false)
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
  }, [])

  // Seek to position
  const seekTo = useCallback((index: number) => {
    if (!playbackRecording) return
    const clampedIndex = Math.max(0, Math.min(index, playbackRecording.frames.length - 1))
    setPlaybackIndex(clampedIndex)
    if (onPlaybackFrame) {
      onPlaybackFrame(playbackRecording.frames[clampedIndex])
    }
  }, [playbackRecording, onPlaybackFrame])

  // Export recording as JSON
  const exportRecording = useCallback((recording: SessionRecording) => {
    const blob = new Blob([JSON.stringify(recording, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recording.name.replace(/\s+/g, '_')}_${new Date(recording.startTime).toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Delete recording
  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id))
    if (playbackRecording?.id === id) {
      setPlaybackRecording(null)
      setPlaybackIndex(0)
      setIsPlaying(false)
    }
  }, [playbackRecording])

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
    }
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Session Recording
      </div>

      {/* Recording controls */}
      <div className="flex gap-2">
        <Button
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          className="flex-1 h-8"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isRunning && !isRecording}
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
              Stop ({formatDuration(currentRecording?.frames.length ? currentRecording.frames.length * RECORDING_INTERVAL : 0)})
            </>
          ) : (
            'Start Recording'
          )}
        </Button>
      </div>

      {/* Recording limit info */}
      {isRecording && (
        <div className="text-[9px] text-muted-foreground text-center">
          Max duration: {formatDuration(MAX_RECORDING_DURATION)}
        </div>
      )}

      {/* Saved recordings list */}
      {recordings.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground">Saved Recordings</div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className={cn(
                  'p-2 rounded border text-xs flex items-center justify-between gap-2',
                  playbackRecording?.id === recording.id ? 'border-primary bg-primary/10' : 'border-border'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{recording.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {formatDuration(recording.duration)} | {recording.frames.length} frames
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-[9px]"
                    onClick={() => loadForPlayback(recording)}
                    title="Load for playback"
                  >
                    P
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-[9px]"
                    onClick={() => exportRecording(recording)}
                    title="Export JSON"
                  >
                    E
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-[9px] text-destructive"
                    onClick={() => deleteRecording(recording.id)}
                    title="Delete"
                  >
                    X
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playback controls */}
      {playbackRecording && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Playback: {playbackRecording.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setPlaybackRecording(null)}
            >
              X
            </Button>
          </div>

          {/* Playback slider */}
          <div className="space-y-1">
            <Slider
              value={[playbackIndex]}
              onValueChange={([v]) => seekTo(v)}
              min={0}
              max={playbackRecording.frames.length - 1}
              step={1}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatDuration(playbackIndex * RECORDING_INTERVAL)}</span>
              <span>{formatDuration(playbackRecording.duration)}</span>
            </div>
          </div>

          {/* Playback buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1"
              onClick={isPlaying ? pausePlayback : startPlayback}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="h-7 px-2 text-xs bg-background border border-border rounded"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
