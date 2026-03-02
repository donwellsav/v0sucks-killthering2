'use client'
// v3 — no duplicate definitions; Speech preset included
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface FrequencyBand {
  id: string
  label: string
  minHz: number
  maxHz: number
  color: string
  solo: boolean
  mute: boolean
}

interface FrequencyBandControlsProps {
  onRangeChange: (minHz: number, maxHz: number) => void
  currentMinHz: number
  currentMaxHz: number
  className?: string
}

const DEFAULT_BANDS: FrequencyBand[] = [
  { id: 'sub',     label: 'Sub',     minHz: 20,    maxHz: 120,   color: '#ef4444', solo: false, mute: false },
  { id: 'low',     label: 'Low',     minHz: 120,   maxHz: 400,   color: '#f97316', solo: false, mute: false },
  { id: 'lowMid',  label: 'Low-Mid', minHz: 400,   maxHz: 1000,  color: '#eab308', solo: false, mute: false },
  { id: 'mid',     label: 'Mid',     minHz: 1000,  maxHz: 2500,  color: '#22c55e', solo: false, mute: false },
  { id: 'highMid', label: 'Hi-Mid',  minHz: 2500,  maxHz: 6000,  color: '#3b82f6', solo: false, mute: false },
  { id: 'high',    label: 'High',    minHz: 6000,  maxHz: 20000, color: '#8b5cf6', solo: false, mute: false },
]

const DEFAULT_QUICK_PRESETS = [
  { label: 'Full Range', minHz: 20,   maxHz: 20000 },
  { label: 'Speech',     minHz: 150,  maxHz: 10000 },
  { label: 'Sub/Bass',   minHz: 20,   maxHz: 400   },
  { label: 'Midrange',   minHz: 400,  maxHz: 4000  },
  { label: 'High Freq',  minHz: 4000, maxHz: 20000 },
]

export function FrequencyBandControls({
  onRangeChange,
  currentMinHz,
  currentMaxHz,
  className,
}: FrequencyBandControlsProps) {
  const [bands, setBands] = useState<FrequencyBand[]>(DEFAULT_BANDS)
  const [quickPresets, setQuickPresets] = useState(DEFAULT_QUICK_PRESETS)
  const [customMin, setCustomMin] = useState(currentMinHz)
  const [customMax, setCustomMax] = useState(currentMaxHz)
  const [savedAsName, setSavedAsName] = useState<string | null>(null)

  const handleSolo = (bandId: string) => {
    const band = bands.find(b => b.id === bandId)
    if (!band) return
    const isAlreadySolo = band.solo
    if (isAlreadySolo) {
      setBands(bands.map(b => ({ ...b, solo: false })))
      onRangeChange(20, 20000)
    } else {
      setBands(bands.map(b => ({ ...b, solo: b.id === bandId })))
      onRangeChange(band.minHz, band.maxHz)
    }
  }

  const applyCustomRange = () => {
    onRangeChange(customMin, customMax)
    setBands(bands.map(b => ({ ...b, solo: false })))
    setSavedAsName(null)
  }

  const applyPreset = (preset: { label: string; minHz: number; maxHz: number }) => {
    setCustomMin(preset.minHz)
    setCustomMax(preset.maxHz)
    onRangeChange(preset.minHz, preset.maxHz)
    setBands(bands.map(b => ({ ...b, solo: false })))
    setSavedAsName(null)
  }

  const saveAsSpeech = () => {
    setQuickPresets(prev =>
      prev.map(p => p.label === 'Speech' ? { ...p, minHz: customMin, maxHz: customMax } : p)
    )
    onRangeChange(customMin, customMax)
    setSavedAsName('Speech')
    setTimeout(() => setSavedAsName(null), 2000)
  }

  const hzToSlider = (hz: number) => {
    const minLog = Math.log10(20)
    const maxLog = Math.log10(20000)
    return ((Math.log10(Math.max(hz, 20)) - minLog) / (maxLog - minLog)) * 100
  }

  const sliderToHz = (pos: number) => {
    const minLog = Math.log10(20)
    const maxLog = Math.log10(20000)
    return Math.round(Math.pow(10, minLog + (pos / 100) * (maxLog - minLog)))
  }

  const fmtHz = (hz: number) => hz < 1000 ? `${hz} Hz` : `${(hz / 1000).toFixed(1)} kHz`

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Frequency Bands</div>
        <div className="grid grid-cols-3 gap-1.5">
          {bands.map((band) => (
            <button
              key={band.id}
              onClick={() => handleSolo(band.id)}
              className={cn(
                'px-2 py-1.5 rounded text-[10px] font-medium border transition-all',
                band.solo
                  ? 'text-white border-transparent'
                  : 'text-muted-foreground border-border hover:border-primary/50'
              )}
              style={{ backgroundColor: band.solo ? band.color : 'transparent' }}
            >
              {band.label}
              <span className="block text-[8px] opacity-60">
                {band.minHz < 1000 ? band.minHz : `${(band.minHz/1000).toFixed(1)}k`}–
                {band.maxHz < 1000 ? band.maxHz : `${(band.maxHz/1000).toFixed(0)}k`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Quick Presets</div>
        <div className="flex flex-wrap gap-1">
          {quickPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className={cn(
                'h-6 text-[9px] px-2',
                currentMinHz === preset.minHz && currentMaxHz === preset.maxHz && 'border-primary text-primary'
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Custom Range</div>
          <button
            onClick={saveAsSpeech}
            className={cn(
              'text-[9px] px-1.5 py-0.5 rounded border transition-all',
              savedAsName
                ? 'border-green-500/50 text-green-500 bg-green-500/10'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
            )}
          >
            {savedAsName ? `Saved as "${savedAsName}"` : 'Save as "Speech"'}
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="font-mono">{fmtHz(customMin)}</span>
            <span className="font-mono">{fmtHz(customMax)}</span>
          </div>
          <Slider
            value={[hzToSlider(customMin), hzToSlider(customMax)]}
            onValueChange={([min, max]) => {
              setCustomMin(sliderToHz(min))
              setCustomMax(sliderToHz(max))
            }}
            min={0}
            max={100}
            step={1}
          />
          <Button variant="secondary" size="sm" className="w-full h-7 text-xs" onClick={applyCustomRange}>
            Apply Range
          </Button>
        </div>
      </div>

      <div className="p-2 rounded bg-muted/50 text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Active Range</div>
        <div className="text-sm font-mono font-medium">
          {fmtHz(currentMinHz)} – {fmtHz(currentMaxHz)}
        </div>
      </div>
    </div>
  )
}
