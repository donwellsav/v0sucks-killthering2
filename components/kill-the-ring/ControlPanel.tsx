'use client'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Mic, MicOff, Volume2, Target, Music, Zap, Settings2, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DetectorSettings, OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'

const MODE_CHIPS: { value: OperationMode; label: string; shortLabel: string; icon: React.ReactNode; description: string }[] = [
  { value: 'feedbackHunt', label: 'Feedback Hunt', shortLabel: 'Hunt', icon: <Target className="w-3.5 h-3.5" />, description: 'Balanced PA detection' },
  { value: 'vocalRing', label: 'Vocal Ring', shortLabel: 'Vocal', icon: <Radio className="w-3.5 h-3.5" />, description: 'Speech frequencies' },
  { value: 'musicAware', label: 'Music-Aware', shortLabel: 'Music', icon: <Music className="w-3.5 h-3.5" />, description: 'Reduces false positives' },
  { value: 'aggressive', label: 'Aggressive', shortLabel: 'Aggro', icon: <Zap className="w-3.5 h-3.5" />, description: 'Maximum sensitivity' },
  { value: 'calibration', label: 'Calibration', shortLabel: 'Cal', icon: <Settings2 className="w-3.5 h-3.5" />, description: 'System ring-out' },
]

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

      {/* Mode Selection - Chip Style */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mode</Label>
        <div className="flex flex-wrap gap-1.5">
          {MODE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleModeChange(chip.value)}
              title={chip.description}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
                'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
                settings.mode === chip.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {chip.icon}
              <span className="hidden sm:inline">{chip.label}</span>
              <span className="sm:hidden">{chip.shortLabel}</span>
            </button>
          ))}
        </div>
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
