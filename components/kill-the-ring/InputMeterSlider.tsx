'use client'

import { useRef, useEffect, useState } from 'react'

interface InputMeterSliderProps {
  value: number
  onChange: (value: number) => void
  level: number
  min?: number
  max?: number
  fullWidth?: boolean
  compact?: boolean
}

export function InputMeterSlider({
  value,
  onChange,
  level,
  min = -40,
  max = 40,
  fullWidth = false,
  compact = false,
}: InputMeterSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [inputValue, setInputValue] = useState(String(value))

  const normalizedLevel = Math.max(0, Math.min(1, (level + 60) / 60))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(0, 0, w, h)

    const meterWidth = w * normalizedLevel
    const gradient = ctx.createLinearGradient(0, 0, w, 0)
    gradient.addColorStop(0, '#22c55e')
    gradient.addColorStop(0.6, '#22c55e')
    gradient.addColorStop(0.8, '#eab308')
    gradient.addColorStop(0.95, '#ef4444')
    gradient.addColorStop(1, '#ef4444')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, meterWidth, h)

    // Zero-dB tick mark
    const zeroPos = ((0 - min) / (max - min)) * w
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(zeroPos, 0)
    ctx.lineTo(zeroPos, h)
    ctx.stroke()
    ctx.setLineDash([])

    // Gain marker
    const gainPos = ((value - min) / (max - min)) * w
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gainPos, 0)
    ctx.lineTo(gainPos, h)
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(gainPos - 4, 0)
    ctx.lineTo(gainPos + 4, 0)
    ctx.lineTo(gainPos, 5)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(gainPos - 4, h)
    ctx.lineTo(gainPos + 4, h)
    ctx.lineTo(gainPos, h - 5)
    ctx.closePath()
    ctx.fill()
  }, [normalizedLevel, value, min, max])

  const updateValueFromX = (clientX: number) => {
    const slider = sliderRef.current
    if (!slider) return
    const rect = slider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const ratio = x / rect.width
    onChange(Math.round(min + ratio * (max - min)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    updateValueFromX(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    updateValueFromX(e.clientX)
  }

  const handleMouseUp = () => { isDragging.current = false }

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true
    updateValueFromX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
    updateValueFromX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => { isDragging.current = false }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const clampValue = (val: number) => Math.max(min, Math.min(max, val))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed))
    }
  }

  const handleInputBlur = () => {
    setInputValue(String(value))
  }

  const handleStepper = (direction: 'up' | 'down') => {
    const delta = direction === 'up' ? 1 : -1
    const newValue = clampValue(value + delta)
    onChange(newValue)
    setInputValue(String(newValue))
  }

  const valueLabel = `${value > 0 ? '+' : ''}${value}dB`

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
      {/* Label */}
      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
        Gain
      </span>

      {/* Slider track + 0dB label */}
      <div className="relative flex-1 flex flex-col">
        <div
          ref={sliderRef}
          className={`relative rounded cursor-ew-resize overflow-hidden w-full ${compact ? 'h-4' : 'h-5'}`}
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label="Input gain"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + 1))
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(min, value - 1))
          }}
        >
          <canvas
            ref={canvasRef}
            width={512}
            height={compact ? 16 : 20}
            className="w-full h-full"
          />
        </div>
        {/* 0dB unity label — positioned at the center (50%) of the range */}
        {!compact && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 pointer-events-none">
            <span className="text-[8px] text-muted-foreground/60 font-mono leading-none">0</span>
          </div>
        )}
      </div>

      {/* Input with integrated +/- arrows */}
      <div className="relative flex items-center flex-shrink-0">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={min}
          max={max}
          step={1}
          className={`font-mono text-center text-foreground bg-input border border-border rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tabular-nums appearance-none pl-6 pr-6 ${compact ? 'text-[8px] w-10 h-4' : 'text-xs w-14 h-5'}`}
          style={{
            backgroundImage: `
              linear-gradient(135deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%),
              linear-gradient(45deg, transparent 0%, transparent calc(50% - 8px), #666 calc(50% - 8px), #666 calc(50% - 5px), transparent calc(50% - 5px), transparent 50%, transparent calc(50% + 5px), #666 calc(50% + 5px), #666 calc(50% + 8px), transparent calc(50% + 8px), transparent 100%)
            `,
            backgroundPosition: 'left 4px center, right 4px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '12px 14px',
          }}
          title="Click ± to adjust, or type a value"
        />
        {/* Clickable minus button */}
        <button
          onClick={() => handleStepper('down')}
          disabled={value <= min}
          className="absolute left-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease gain by 1dB"
          title="Decrease by 1dB"
        >
          −
        </button>
        {/* Clickable plus button */}
        <button
          onClick={() => handleStepper('up')}
          disabled={value >= max}
          className="absolute right-1 h-full px-1 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase gain by 1dB"
          title="Increase by 1dB"
        >
          +
        </button>
      </div>
    </div>
  )
}
