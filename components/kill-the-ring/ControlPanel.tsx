'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import type { DetectorSettings, OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'

interface ControlPanelProps {
  isRunning: boolean
  settings: DetectorSettings
  onStart: () => void
  onStop: () => void
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  noiseFloorDb: number | null
  sampleRate: number
}

export function ControlPanel({
  isRunning,
  settings,
  onStart,
  onStop,
  onSettingsChange,
  noiseFloorDb,
  sampleRate,
}: ControlPanelProps) {
  const handleModeChange = (mode: OperationMode) => {
    const modeSettings = OPERATION_MODES[mode]
    onSettingsChange({
      mode,
      feedbackThresholdDb: modeSettings.feedbackThreshold,
      ringThresholdDb: modeSettings.ringThreshold,
      growthRateThreshold: modeSettings.growthRateThreshold,
      musicAware: modeSettings.musicAware,
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Start/Stop Button */}
      <Button
        onClick={isRunning ? onStop : onStart}
        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
      >
        {isRunning ? (
          <>
            <MicOff className="w-5 h-5 mr-2" />
            Stop Analysis
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 mr-2" />
            Start Analysis
          </>
        )}
      </Button>

      {/* Mode Selection */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mode</Label>
        <Select value={settings.mode} onValueChange={(v) => handleModeChange(v as OperationMode)}>
          <SelectTrigger className="bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feedbackHunt">Feedback Hunt</SelectItem>
            <SelectItem value="vocalRing">Vocal Ring Assist</SelectItem>
            <SelectItem value="musicAware">Music-Aware</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
            <SelectItem value="calibration">Calibration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Input Gain Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Input Gain
          </Label>
          <span className="text-xs font-mono text-foreground">
            {settings.inputGainDb > 0 ? '+' : ''}{settings.inputGainDb} dB
          </span>
        </div>
        <Slider
          value={[settings.inputGainDb]}
          onValueChange={([v]) => onSettingsChange({ inputGainDb: v })}
          min={-12}
          max={24}
          step={1}
          className="w-full"
        />
      </div>

      {/* Status Info */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex justify-between">
          <span>Noise Floor</span>
          <span className="font-mono text-foreground">
            {noiseFloorDb !== null ? `${noiseFloorDb.toFixed(1)} dB` : '---'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Resolution</span>
          <span className="font-mono text-foreground">
            {(sampleRate / settings.fftSize).toFixed(1)} Hz/bin
          </span>
        </div>
      </div>
    </div>
  )
}
