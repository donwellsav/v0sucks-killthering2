'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnalysisConfig } from '@/types/advisory'

export interface MicPreset {
  id: string
  name: string
  description: string
  icon: string // Emoji or icon class
  /** Frequency range known to be feedback-prone for this mic type */
  feedbackProneRange: { min: number; max: number }
  /** Suggested analysis settings */
  settings: Partial<AnalysisConfig>
}

const MIC_PRESETS: MicPreset[] = [
  {
    id: 'sm58',
    name: 'SM58 / Dynamic',
    description: 'Cardioid dynamic vocal mic (presence peak 2-5kHz)',
    icon: '🎤',
    feedbackProneRange: { min: 2000, max: 5000 },
    settings: {
      minFrequency: 150,
      maxFrequency: 12000,
      feedbackThresholdDb: 4,
      ringThresholdDb: 3,
    },
  },
  {
    id: 'beta58',
    name: 'Beta 58 / Supercardioid',
    description: 'Tighter pickup pattern, brighter (3-8kHz)',
    icon: '🎙️',
    feedbackProneRange: { min: 3000, max: 8000 },
    settings: {
      minFrequency: 200,
      maxFrequency: 15000,
      feedbackThresholdDb: 5,
      ringThresholdDb: 4,
    },
  },
  {
    id: 'lavalier',
    name: 'Lavalier / Lapel',
    description: 'Small body mic (presence 1-4kHz, proximity issues)',
    icon: '📍',
    feedbackProneRange: { min: 800, max: 4000 },
    settings: {
      minFrequency: 100,
      maxFrequency: 10000,
      feedbackThresholdDb: 3,
      ringThresholdDb: 2,
    },
  },
  {
    id: 'headset',
    name: 'Headset Mic',
    description: 'Close-talking mic (plosives, sibilance)',
    icon: '🎧',
    feedbackProneRange: { min: 1000, max: 6000 },
    settings: {
      minFrequency: 150,
      maxFrequency: 12000,
      feedbackThresholdDb: 4,
      ringThresholdDb: 3,
    },
  },
  {
    id: 'condenser',
    name: 'Condenser / Studio',
    description: 'Large diaphragm condenser (sensitive, wide range)',
    icon: '🔊',
    feedbackProneRange: { min: 500, max: 8000 },
    settings: {
      minFrequency: 80,
      maxFrequency: 18000,
      feedbackThresholdDb: 3,
      ringThresholdDb: 2,
    },
  },
  {
    id: 'shotgun',
    name: 'Shotgun / Interview',
    description: 'Highly directional (off-axis coloration)',
    icon: '📡',
    feedbackProneRange: { min: 300, max: 5000 },
    settings: {
      minFrequency: 100,
      maxFrequency: 15000,
      feedbackThresholdDb: 5,
      ringThresholdDb: 4,
    },
  },
  {
    id: 'instrument',
    name: 'Instrument Mic',
    description: 'Clip-on or stand-mounted (guitar, sax, brass)',
    icon: '🎷',
    feedbackProneRange: { min: 200, max: 3000 },
    settings: {
      minFrequency: 80,
      maxFrequency: 12000,
      feedbackThresholdDb: 5,
      ringThresholdDb: 4,
      musicAware: true,
    },
  },
  {
    id: 'choir',
    name: 'Choir / Overhead',
    description: 'Area mic for multiple vocalists',
    icon: '🎵',
    feedbackProneRange: { min: 500, max: 4000 },
    settings: {
      minFrequency: 100,
      maxFrequency: 15000,
      feedbackThresholdDb: 4,
      ringThresholdDb: 3,
    },
  },
]

interface MicPresetsProps {
  /** Current active preset ID */
  activePresetId?: string | null
  /** Callback when a preset is selected */
  onPresetSelect: (preset: MicPreset) => void
  /** Callback to apply preset settings */
  onApplySettings: (settings: Partial<AnalysisConfig>) => void
  className?: string
}

export function MicPresets({
  activePresetId,
  onPresetSelect,
  onApplySettings,
  className,
}: MicPresetsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(activePresetId ?? null)

  const handleSelect = (preset: MicPreset) => {
    setSelectedId(preset.id)
    onPresetSelect(preset)
  }

  const handleApply = () => {
    const preset = MIC_PRESETS.find(p => p.id === selectedId)
    if (preset) {
      onApplySettings(preset.settings)
    }
  }

  const selectedPreset = MIC_PRESETS.find(p => p.id === selectedId)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Microphone Presets
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-2">
        {MIC_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className={cn(
              'p-2 rounded-lg border text-left transition-all',
              selectedId === preset.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 bg-card/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{preset.icon}</span>
              <span className="text-xs font-medium truncate">{preset.name}</span>
            </div>
            <div className="text-[9px] text-muted-foreground line-clamp-2">
              {preset.description}
            </div>
          </button>
        ))}
      </div>

      {/* Selected preset details */}
      {selectedPreset && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{selectedPreset.name}</span>
            <Button
              size="sm"
              variant="default"
              onClick={handleApply}
              className="h-6 text-[10px]"
            >
              Apply Preset
            </Button>
          </div>
          
          <div className="text-[10px] text-muted-foreground">
            Feedback-prone: {selectedPreset.feedbackProneRange.min < 1000 
              ? `${selectedPreset.feedbackProneRange.min} Hz` 
              : `${(selectedPreset.feedbackProneRange.min / 1000).toFixed(1)} kHz`
            } - {selectedPreset.feedbackProneRange.max < 1000 
              ? `${selectedPreset.feedbackProneRange.max} Hz` 
              : `${(selectedPreset.feedbackProneRange.max / 1000).toFixed(1)} kHz`
            }
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
            {selectedPreset.settings.minFrequency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Freq:</span>
                <span className="font-mono">{selectedPreset.settings.minFrequency} Hz</span>
              </div>
            )}
            {selectedPreset.settings.maxFrequency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Freq:</span>
                <span className="font-mono">{(selectedPreset.settings.maxFrequency / 1000).toFixed(0)} kHz</span>
              </div>
            )}
            {selectedPreset.settings.feedbackThresholdDb && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feedback Thr:</span>
                <span className="font-mono">{selectedPreset.settings.feedbackThresholdDb} dB</span>
              </div>
            )}
            {selectedPreset.settings.ringThresholdDb && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ring Thr:</span>
                <span className="font-mono">{selectedPreset.settings.ringThresholdDb} dB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Export presets for use elsewhere
export { MIC_PRESETS }
