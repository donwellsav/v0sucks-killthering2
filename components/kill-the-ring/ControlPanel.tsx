'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mic, MicOff } from 'lucide-react'
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
        variant={isRunning ? 'destructive' : 'default'}
        className="w-full h-12 text-base font-medium"
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
        <p className="text-[10px] text-muted-foreground leading-tight">
          {settings.mode === 'feedbackHunt' && 'Standard mode for detecting runaway feedback during soundcheck.'}
          {settings.mode === 'vocalRing' && 'Sensitive mode for subtle vocal resonances and rings.'}
          {settings.mode === 'musicAware' && 'Instrument-friendly mode that respects musical content.'}
          {settings.mode === 'aggressive' && 'Maximum sensitivity for problematic rooms.'}
          {settings.mode === 'calibration' && 'Shows all detected peaks for system tuning.'}
        </p>
      </div>

      {/* Preset Selection */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">EQ Preset</Label>
        <Select 
          value={settings.eqPreset} 
          onValueChange={(v) => onSettingsChange({ eqPreset: v as 'surgical' | 'heavy' })}
        >
          <SelectTrigger className="bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="surgical">Surgical (High Q, Deep Cut)</SelectItem>
            <SelectItem value="heavy">Heavy (Low Q, Moderate Cut)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Music Aware Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground">Music-Aware</Label>
        <Switch
          checked={settings.musicAware}
          onCheckedChange={(v) => onSettingsChange({ musicAware: v })}
        />
      </div>

      {/* Status Info */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex justify-between">
          <span>Sample Rate</span>
          <span className="font-mono text-foreground">{(sampleRate / 1000).toFixed(1)} kHz</span>
        </div>
        <div className="flex justify-between">
          <span>FFT Size</span>
          <span className="font-mono text-foreground">{settings.fftSize}</span>
        </div>
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
        <div className="flex justify-between">
          <span>Threshold</span>
          <span className="font-mono text-foreground">{settings.feedbackThresholdDb} dB</span>
        </div>
      </div>
    </div>
  )
}
