'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

interface SliderWithInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  format?: (value: number) => string
}

export function SliderWithInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label = 'Value',
  unit = '',
  format,
}: SliderWithInputProps) {
  const [inputValue, setInputValue] = useState(String(value))

  const clampValue = (val: number) => Math.max(min, Math.min(max, val))
  
  const formatDisplay = (val: number) => {
    if (format) return format(val)
    return `${val}${unit ? unit : ''}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed))
    }
  }

  const handleInputBlur = () => {
    setInputValue(String(value))
  }

  const handleStepper = (direction: 'up' | 'down') => {
    const delta = direction === 'up' ? step : -step
    const newValue = clampValue(value + delta)
    onChange(newValue)
    setInputValue(String(newValue))
  }

  const handleSliderChange = (newValue: number[]) => {
    const newVal = newValue[0]
    onChange(newVal)
    setInputValue(String(newVal))
  }

  return (
    <div className="space-y-2">
      {/* Label and Input with Internal Arrows */}
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="relative flex items-center">
          {/* Input field with integrated +/- arrows */}
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            className="w-16 h-7 pl-6 pr-6 text-xs font-mono text-center text-foreground bg-input border border-border rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tabular-nums appearance-none"
            style={{
              backgroundImage: `
                linear-gradient(135deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%),
                linear-gradient(45deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%)
              `,
              backgroundPosition: 'left 4px center, right 4px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '12px 14px',
            }}
            title={`${label}: use arrows to adjust, or type a value`}
          />
          {/* Clickable minus button */}
          <button
            onClick={() => handleStepper('down')}
            disabled={value <= min}
            className="absolute left-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={`Decrease ${label}`}
            title={`Decrease by ${step}`}
          >
            −
          </button>
          {/* Clickable plus button */}
          <button
            onClick={() => handleStepper('up')}
            disabled={value >= max}
            className="absolute right-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={`Increase ${label}`}
            title={`Increase by ${step}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Full slider track below */}
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="mt-3"
      />
    </div>
  )
}
