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

function ControlLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function SliderRow({
  label,
  tooltip,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  tooltip?: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <ControlLabel label={label} tooltip={tooltip} />
        <span className="font-mono text-[11px] text-foreground tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  )
}

export function DetectionControls({ settings, onModeChange, onSettingsChange }: DetectionControlsProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col gap-0">

        {/* Mode */}
        <div className="pb-3">
          <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">Mode</div>
          <Select value={settings.mode} onValueChange={(v) => onModeChange(v as OperationMode)}>
            <SelectTrigger className="h-8 w-full text-xs bg-input border-border">
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
        </div>

        <div className="border-t border-border/40" />

        {/* Frequency Range */}
        <div className="py-3">
          <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">Freq Range</div>
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
                  aria-pressed={isActive}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                    isActive
                      ? 'bg-primary/15 text-primary border-primary/50'
                      : 'bg-transparent text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* Auto Music-Aware toggle */}
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ControlLabel
                label="Auto Music-Aware"
                tooltip={`Activates music-aware mode when signal rises ${settings.autoMusicAwareHysteresisDb}dB above the noise floor.`}
              />
              {settings.autoMusicAware && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border leading-none ${
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
              className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                settings.autoMusicAware ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                settings.autoMusicAware ? 'translate-x-3.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="border-t border-border/40" />

        {/* Threshold sliders */}
        <div className="pt-3 flex flex-col gap-3">
          <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Thresholds</div>

          <SliderRow
            label="Threshold"
            tooltip="Primary sensitivity. 4–8 dB aggressive, 10–14 dB balanced, 16+ dB conservative."
            value={settings.feedbackThresholdDb}
            display={`${settings.feedbackThresholdDb} dB`}
            min={2}
            max={20}
            step={1}
            onChange={(v) => onSettingsChange({ feedbackThresholdDb: v })}
          />

          <SliderRow
            label="Ring"
            tooltip="Resonance detection. 2–4 dB for calibration, 5–7 dB normal, 8+ dB during shows."
            value={settings.ringThresholdDb}
            display={`${settings.ringThresholdDb} dB`}
            min={1}
            max={12}
            step={0.5}
            onChange={(v) => onSettingsChange({ ringThresholdDb: v })}
          />

          <SliderRow
            label="Growth"
            tooltip="How fast feedback must grow. 0.5–1 dB/s catches early, 3+ dB/s only runaway."
            value={settings.growthRateThreshold}
            display={`${settings.growthRateThreshold.toFixed(1)} dB/s`}
            min={0.5}
            max={8}
            step={0.5}
            onChange={(v) => onSettingsChange({ growthRateThreshold: v })}
          />
        </div>

      </div>
    </TooltipProvider>
  )
}
