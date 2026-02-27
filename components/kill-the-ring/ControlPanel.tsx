'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { AnalysisConfig, OperatingMode, Preset } from '@/types/advisory'

interface ControlPanelProps {
  isRunning: boolean
  config: AnalysisConfig
  onStart: () => void
  onStop: () => void
  onModeChange: (mode: OperatingMode) => void
  onPresetChange: (preset: Preset) => void
  onIgnoreWhistleChange: (ignore: boolean) => void
  noiseFloorDb: number | null
  sampleRate: number
}

export function ControlPanel({
  isRunning,
  config,
  onStart,
  onStop,
  onModeChange,
  onPresetChange,
  onIgnoreWhistleChange,
  noiseFloorDb,
  sampleRate,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Start/Stop Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={isRunning ? onStop : onStart}
          variant={isRunning ? 'destructive' : 'default'}
          className="min-w-[120px]"
        >
          {isRunning ? 'Stop' : 'Start Analysis'}
        </Button>
        
        {isRunning && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Analyzing</span>
          </div>
        )}
      </div>

      {/* Mode Selection */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mode</Label>
        <Select value={config.mode} onValueChange={(v) => onModeChange(v as OperatingMode)}>
          <SelectTrigger className="bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feedbackHunt">Feedback Hunt</SelectItem>
            <SelectItem value="vocalRingAssist">Vocal Ring Assist</SelectItem>
            <SelectItem value="musicAware">Music-Aware</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
            <SelectItem value="calibration">Calibration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preset Selection */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preset</Label>
        <Select value={config.preset} onValueChange={(v) => onPresetChange(v as Preset)}>
          <SelectTrigger className="bg-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="surgical">Surgical (High Q, Deep Cut)</SelectItem>
            <SelectItem value="heavy">Heavy (Low Q, Moderate Cut)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ignore Whistle Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground">Ignore Whistles</Label>
        <Switch
          checked={config.ignoreWhistle}
          onCheckedChange={onIgnoreWhistleChange}
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
          <span className="font-mono text-foreground">{config.fftSize}</span>
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
            {(sampleRate / config.fftSize).toFixed(1)} Hz/bin
          </span>
        </div>
      </div>
    </div>
  )
}
