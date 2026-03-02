'use client'

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
      <div className="space-y-3">
        <Select value={settings.mode} onValueChange={(v) => onModeChange(v as OperationMode)}>
          <SelectTrigger className="h-7 w-full text-xs bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feedbackHunt">Feedback Hunt</SelectItem>
            <SelectItem value="vocalRing">Vocal Ring</SelectItem>
            <SelectItem value="musicAware">Music-Aware</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
            <SelectItem value="calibration">Calibration</SelectItem>
          </SelectContent>
        </Select>

        {/* Frequency Range Presets */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Freq Range</div>
          <div className="flex items-center gap-1 flex-wrap">
            {FREQ_RANGE_PRESETS.map((preset) => {
              const isActive =
                settings.minFrequency === preset.minFrequency &&
                settings.maxFrequency === preset.maxFrequency
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    onSettingsChange({
                      minFrequency: preset.minFrequency,
                      maxFrequency: preset.maxFrequency,
                    })
                  }
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                  aria-pressed={isActive}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Auto Music-Aware */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-muted-foreground">Auto Music-Aware</span>
            {settings.showTooltips && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  Automatically activates music-aware mode when signal rises {settings.autoMusicAwareHysteresisDb}dB above the noise floor (band is playing).
                </TooltipContent>
              </Tooltip>
            )}
            {settings.autoMusicAware && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${
                settings.musicAware
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                {settings.musicAware ? 'Music' : 'Speech'}
              </span>
            )}
          </div>
          <button
            role="switch"
            aria-checked={settings.autoMusicAware}
            aria-label="Toggle auto music-aware mode"
            onClick={() => onSettingsChange({ autoMusicAware: !settings.autoMusicAware })}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              settings.autoMusicAware ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
              settings.autoMusicAware ? 'translate-x-3.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Threshold</span>
              {settings.showTooltips && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px] text-xs">
                    Primary sensitivity. 4-8dB aggressive, 10-14dB balanced, 16+dB conservative.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="font-mono">{settings.feedbackThresholdDb}dB</span>
          </div>
          <Slider
            value={[settings.feedbackThresholdDb]}
            onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
            min={2} max={20} step={1}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Ring</span>
              {settings.showTooltips && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px] text-xs">
                    Resonance detection. 2-4dB for calibration, 5-7dB normal, 8+dB during shows.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="font-mono">{settings.ringThresholdDb}dB</span>
          </div>
          <Slider
            value={[settings.ringThresholdDb]}
            onValueChange={([v]) => onSettingsChange({ ringThresholdDb: v })}
            min={1} max={12} step={0.5}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Growth</span>
              {settings.showTooltips && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px] text-xs">
                    How fast feedback must grow. 0.5-1dB/s catches early, 3+dB/s only runaway.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="font-mono">{settings.growthRateThreshold.toFixed(1)}dB/s</span>
          </div>
          <Slider
            value={[settings.growthRateThreshold]}
            onValueChange={([v]) => onSettingsChange({ growthRateThreshold: v })}
            min={0.5} max={8} step={0.5}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
