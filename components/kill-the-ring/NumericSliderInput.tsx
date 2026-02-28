'use client'

import { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'

interface NumericSliderInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  unit?: string
  format?: (value: number) => string
  compact?: boolean
}

export function NumericSliderInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = '',
  format,
  compact = false,
}: NumericSliderInputProps) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const clampValue = (val: number) => Math.max(min, Math.min(max, val))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)

    // Allow partial input while typing
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
  }

  const displayValue = format ? format(value) : `${value}${unit}`

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={`font-mono ${compact ? 'text-[8px]' : 'text-xs'}`}>
            {displayValue}
          </span>
        </div>
      )}

      {/* Slider track */}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(clampValue(v))}
        min={min}
        max={max}
        step={step}
      />

      {/* Text input with stepper buttons */}
      <div className="relative flex items-center">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={min}
          max={max}
          step={step}
          className={`font-mono text-center text-foreground bg-input border border-border rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tabular-nums appearance-none pl-6 pr-6 w-full ${compact ? 'text-[8px] h-7' : 'text-xs h-8'}`}
          style={{
            backgroundImage: `
              linear-gradient(135deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%),
              linear-gradient(45deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%)
            `,
            backgroundPosition: 'left 4px center, right 4px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '12px 14px',
          }}
          title={`${label ? label + ': ' : ''}${displayValue}`}
        />
        {/* Minus button */}
        <button
          onClick={() => handleStepper('down')}
          disabled={value <= min}
          className="absolute left-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Decrease ${label}`}
          title="Decrease"
        >
          −
        </button>
        {/* Plus button */}
        <button
          onClick={() => handleStepper('up')}
          disabled={value >= max}
          className="absolute right-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Increase ${label}`}
          title="Increase"
        >
          +
        </button>
      </div>
    </div>
  )
}
