'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SliderWithStepperProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label?: string
  unit?: string
  format?: (value: number) => string
}

export function SliderWithStepper({
  value,
  onChange,
  min,
  max,
  step,
  label,
  unit = '',
  format,
}: SliderWithStepperProps) {
  const clampValue = (val: number) => Math.max(min, Math.min(max, val))
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value)
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed))
    }
  }

  const handleStepper = (direction: 'up' | 'down') => {
    const delta = direction === 'up' ? step : -step
    onChange(clampValue(value + delta))
  }

  const displayValue = format ? format(value) : value

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <div className="flex items-center gap-1.5">
          {/* Stepper Buttons */}
          <div className="flex gap-0.5 bg-input rounded border border-border">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => handleStepper('down')}
              disabled={value <= min}
              title="Decrease"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => handleStepper('up')}
              disabled={value >= max}
              title="Increase"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          </div>

          {/* Text Input */}
          <input
            type="number"
            value={displayValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="font-mono text-xs px-1.5 py-1 w-14 text-center bg-input border border-border rounded text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title={`Enter value between ${min} and ${max}`}
          />
          {unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(clampValue(v))}
        min={min}
        max={max}
        step={step}
      />
    </div>
  )
}
