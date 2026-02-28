// Compact control strip for quick detection threshold adjustments
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings2, Zap } from 'lucide-react'
import { BUILT_IN_PRESETS, PresetManager, type DetectionPreset } from '@/lib/dsp/presets'
import { Badge } from '@/components/ui/badge'
import type { DetectorSettings, OperationMode } from '@/types/advisory'

interface CompactControlStripProps {
  settings: DetectorSettings
  detectedFrequenciesAboveThreshold: number
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  onOpenSettings: () => void
  onPresetChange: (preset: DetectionPreset) => void
  currentPresetId?: string
}

export function CompactControlStrip({
  settings,
  detectedFrequenciesAboveThreshold,
  onSettingsChange,
  onOpenSettings,
  onPresetChange,
  currentPresetId,
}: CompactControlStripProps) {
  const [presets] = useState(() => PresetManager.getAllPresets())

  const presetOptions = presets.map(p => ({
    id: p.id,
    name: p.name,
    isBuiltIn: p.category === 'built-in',
  }))

  const handlePresetChange = (presetId: string) => {
    const preset = PresetManager.getPreset(presetId)
    if (preset) {
      onPresetChange(preset)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50 text-xs">
      <TooltipProvider>
        {/* Preset selector */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Select value={currentPresetId || ''} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                {presetOptions.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent>Load a detection preset</TooltipContent>
        </Tooltip>

        {/* Main threshold slider */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <span className="text-muted-foreground">Threshold</span>
              <Slider
                value={[settings.feedbackThresholdDb]}
                onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
                min={6}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="font-mono w-10 text-right">{settings.feedbackThresholdDb}dB</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>Detection sensitivity threshold</p>
              <p className="text-muted-foreground">Lower = more sensitive</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Detection indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={detectedFrequenciesAboveThreshold > 0 ? 'default' : 'outline'}
              className="gap-1"
            >
              <Zap className="w-3 h-3" />
              {detectedFrequenciesAboveThreshold}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {detectedFrequenciesAboveThreshold > 0
              ? `${detectedFrequenciesAboveThreshold} frequencies above threshold`
              : 'No frequencies above threshold'}
          </TooltipContent>
        </Tooltip>

        {/* Advanced settings button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="h-8 w-8 p-0"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open advanced settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
