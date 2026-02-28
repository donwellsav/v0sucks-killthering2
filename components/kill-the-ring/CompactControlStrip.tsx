// Compact control strip for quick detection threshold adjustments
'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Activity, AlertTriangle, Radio, Headphones, Music, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { BUILT_IN_PRESETS, PresetManager, type DetectionPreset } from '@/lib/dsp/presets'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DetectorSettings } from '@/types/advisory'

interface CompactControlStripProps {
  settings: DetectorSettings
  detectedFrequenciesAboveThreshold: number
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  onOpenSettings: () => void
  onPresetChange: (preset: DetectionPreset) => void
  currentPresetId?: string
}

// Quick preset buttons with icons
const QUICK_PRESETS = [
  { id: 'live-pa', icon: Radio, label: 'PA', color: 'text-red-500', shortcut: '1' },
  { id: 'stage-monitors', icon: Headphones, label: 'Mon', color: 'text-amber-500', shortcut: '2' },
  { id: 'studio', icon: Music, label: 'Studio', color: 'text-blue-500', shortcut: '3' },
] as const

export function CompactControlStrip({
  settings,
  detectedFrequenciesAboveThreshold,
  onSettingsChange,
  onPresetChange,
  currentPresetId,
}: CompactControlStripProps) {
  const [expanded, setExpanded] = useState(false)

  // Get sensitivity level description
  const sensitivityLevel = useMemo(() => {
    if (settings.feedbackThresholdDb <= 8) return { label: 'Very High', color: 'text-red-500' }
    if (settings.feedbackThresholdDb <= 12) return { label: 'High', color: 'text-orange-500' }
    if (settings.feedbackThresholdDb <= 16) return { label: 'Medium', color: 'text-yellow-500' }
    if (settings.feedbackThresholdDb <= 20) return { label: 'Low', color: 'text-green-500' }
    return { label: 'Very Low', color: 'text-blue-500' }
  }, [settings.feedbackThresholdDb])

  const handleQuickPreset = (presetId: string) => {
    const preset = PresetManager.getPreset(presetId)
    if (preset) {
      onPresetChange(preset)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-gradient-to-r from-card via-card/95 to-card rounded-lg border border-border shadow-sm">
        {/* Main control row */}
        <div className="flex items-center gap-3 px-3 py-2">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1">
            {QUICK_PRESETS.map(({ id, icon: Icon, label, color }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentPresetId === id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleQuickPreset(id)}
                    className={cn(
                      'h-7 px-2 text-xs gap-1',
                      currentPresetId === id ? '' : color
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">
                    <p className="font-semibold">{BUILT_IN_PRESETS[id]?.name}</p>
                    <p className="text-muted-foreground">{BUILT_IN_PRESETS[id]?.description}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Main Threshold Slider with visual feedback */}
          <div className="flex items-center gap-3 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Sensitivity</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs max-w-48">
                  <p className="font-semibold">Detection Sensitivity</p>
                  <p className="text-muted-foreground">Controls how easily feedback is detected. Lower threshold = more sensitive detection.</p>
                </div>
              </TooltipContent>
            </Tooltip>

            <div className="flex-1 flex items-center gap-2 min-w-40">
              <Slider
                value={[settings.feedbackThresholdDb]}
                onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
                min={6}
                max={24}
                step={1}
                className="flex-1"
              />
              <div className="flex items-center gap-1.5 min-w-20">
                <span className={cn('text-xs font-semibold', sensitivityLevel.color)}>
                  {sensitivityLevel.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {settings.feedbackThresholdDb}dB
                </span>
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Live Detection Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
                detectedFrequenciesAboveThreshold > 10 
                  ? 'bg-red-500/20 text-red-500' 
                  : detectedFrequenciesAboveThreshold > 0 
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-muted/50 text-muted-foreground'
              )}>
                {detectedFrequenciesAboveThreshold > 0 && (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span className="font-mono text-xs font-semibold">
                  {detectedFrequenciesAboveThreshold}
                </span>
                <span className="text-[10px]">peaks</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <p className="font-semibold">Live Peak Count</p>
                <p className="text-muted-foreground">
                  {detectedFrequenciesAboveThreshold > 0
                    ? `${detectedFrequenciesAboveThreshold} frequency bins above ${settings.feedbackThresholdDb}dB threshold`
                    : 'No peaks above threshold'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Expanded controls */}
        {expanded && (
          <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Ring Threshold */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                        <span>Ring Sensitivity</span>
                        <Info className="w-3 h-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-48">
                      <p className="text-xs">Controls detection of sustained resonances. Lower values catch subtle ringing.</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-mono text-xs">{settings.ringThresholdDb}dB</span>
                </div>
                <Slider
                  value={[settings.ringThresholdDb]}
                  onValueChange={([v]) => onSettingsChange({ ringThresholdDb: v })}
                  min={3}
                  max={15}
                  step={0.5}
                />
              </div>

              {/* Growth Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                        <span>Growth Rate</span>
                        <Info className="w-3 h-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-48">
                      <p className="text-xs">How fast amplitude must rise to trigger feedback alert. Lower values catch feedback earlier.</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-mono text-xs">{settings.growthRateThreshold.toFixed(1)}dB/s</span>
                </div>
                <Slider
                  value={[settings.growthRateThreshold]}
                  onValueChange={([v]) => onSettingsChange({ growthRateThreshold: v })}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>

            {/* Current settings summary */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
              <Badge variant="outline" className="text-[9px] h-5">
                {settings.mode}
              </Badge>
              <span>FFT: {settings.fftSize}</span>
              <span>Music-aware: {settings.musicAware ? 'On' : 'Off'}</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
