'use client'

import React from 'react'
import { HelpCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { DetectorSettings, OperationMode } from '@/types/advisory'
import { FREQ_RANGE_PRESETS } from '@/lib/dsp/constants'

interface DetectionControlsProps {
  settings: DetectorSettings
  onModeChange: (mode: OperationMode) => void
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
}

export function DetectionControls({ settings, onModeChange, onSettingsChange }: DetectionControlsProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-2">

        {/* Mode select */}
        <Select value={settings.mode} onValueChange={(v) => onModeChange(v as OperationMode)}>
          <SelectTrigger className="h-5 w-full bg-input border-border px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent size="compact">
            <SelectItem value="feedbackHunt">Feedback Hunt</SelectItem>
            <SelectItem value="vocalRing">Vocal Ring</SelectItem>
            <SelectItem value="musicAware">Music-Aware</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
            <SelectItem value="calibration">Calibration</SelectItem>
          </SelectContent>
        </Select>

        {/* Freq range pills — single row, no label overhead */}
        <div className="flex items-center gap-1 flex-wrap">
          {FREQ_RANGE_PRESETS.map((preset) => {
            const isActive =
              settings.minFrequency === preset.minFrequency &&
              settings.maxFrequency === preset.maxFrequency
            return (
              <button
                key={preset.label}
                onClick={() => onSettingsChange({ minFrequency: preset.minFrequency, maxFrequency: preset.maxFrequency })}
                className={`px-1.5 py-px rounded text-[10px] font-medium border transition-colors leading-tight ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
                aria-pressed={isActive}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Auto Music-Aware — inline single row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] text-muted-foreground truncate">Music-Aware</span>
            {settings.showTooltips && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-2.5 h-2.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  Auto-activates when signal rises {settings.autoMusicAwareHysteresisDb}dB above noise floor.
                </TooltipContent>
              </Tooltip>
            )}
            {settings.autoMusicAware && (
              <span className={`px-1 py-px rounded text-[9px] font-medium border leading-tight flex-shrink-0 ${
                settings.musicAware
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                {settings.musicAware ? 'ON' : 'OFF'}
              </span>
            )}
          </div>
          <button
            role="switch"
            aria-checked={settings.autoMusicAware}
            aria-label="Toggle auto music-aware mode"
            onClick={() => onSettingsChange({ autoMusicAware: !settings.autoMusicAware })}
            className={`relative inline-flex h-3.5 w-6 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              settings.autoMusicAware ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-background shadow transition-transform ${
              settings.autoMusicAware ? 'translate-x-3' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Sliders — each fits on two lines: label+value row, then track */}
        <InlineSlider
          label="Threshold"
          value={`${settings.feedbackThresholdDb}dB`}
          tooltip={settings.showTooltips ? 'Primary sensitivity. 4-8dB aggressive, 10-14dB balanced, 16+dB conservative.' : undefined}
        >
          <Slider
            value={[settings.feedbackThresholdDb]}
            onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
            min={2} max={20} step={1}
          />
        </InlineSlider>

        <InlineSlider
          label="Ring"
          value={`${settings.ringThresholdDb}dB`}
          tooltip={settings.showTooltips ? 'Resonance detection. 2-4dB calibration, 5-7dB normal, 8+dB shows.' : undefined}
        >
          <Slider
            value={[settings.ringThresholdDb]}
            onValueChange={([v]) => onSettingsChange({ ringThresholdDb: v })}
            min={1} max={12} step={0.5}
          />
        </InlineSlider>

        <InlineSlider
          label="Growth"
          value={`${settings.growthRateThreshold.toFixed(1)}dB/s`}
          tooltip={settings.showTooltips ? 'How fast feedback must grow. 0.5-1dB/s catches early, 3+dB/s only runaway.' : undefined}
        >
          <Slider
            value={[settings.growthRateThreshold]}
            onValueChange={([v]) => onSettingsChange({ growthRateThreshold: v })}
            min={0.5} max={8} step={0.5}
          />
        </InlineSlider>

      </div>
    </TooltipProvider>
  )
}

function InlineSlider({ label, value, tooltip, children }: {
  label: string
  value: string
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-2.5 h-2.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-[10px] font-mono text-foreground tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  )
}
