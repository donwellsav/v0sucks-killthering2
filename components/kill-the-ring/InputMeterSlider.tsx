'use client'

import { useRef, useEffect, useState } from 'react'

interface InputMeterSliderProps {
  value: number
  onChange: (value: number) => void
  level: number // Current input level in dB (-60 to 0)
  min?: number
  max?: number
  /** When true the slider expands to fill its container (used in mobile overlay) */
  fullWidth?: boolean
  /** When true use compact styling for mobile (reduced height, smaller text) */
  compact?: boolean
}

export function InputMeterSlider({
  value,
  onChange,
  level,
  min = -6,
  max = 42,
  fullWidth = false,
  compact = false,
}: InputMeterSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDragging = useRef(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  // Normalize level to 0-1 range
  const normalizedLevel = Math.max(0, Math.min(1, (level + 60) / 60))

  // Draw meter
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(0, 0, width, height)

    // Meter gradient (green -> yellow -> red)
    const meterWidth = width * normalizedLevel
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, '#22c55e')
    gradient.addColorStop(0.6, '#22c55e')
    gradient.addColorStop(0.8, '#eab308')
    gradient.addColorStop(0.95, '#ef4444')
    gradient.addColorStop(1, '#ef4444')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, meterWidth, height)

    // Gain marker line
    const gainPos = ((value - min) / (max - min)) * width
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gainPos, 0)
    ctx.lineTo(gainPos, height)
    ctx.stroke()

    // Gain marker triangles
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(gainPos - 4, 0)
    ctx.lineTo(gainPos + 4, 0)
    ctx.lineTo(gainPos, 5)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(gainPos - 4, height)
    ctx.lineTo(gainPos + 4, height)
    ctx.lineTo(gainPos, height - 5)
    ctx.closePath()
    ctx.fill()
  }, [normalizedLevel, value, min, max])

  const updateValueFromX = (clientX: number) => {
    const slider = sliderRef.current
    if (!slider) return
    const rect = slider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const ratio = x / rect.width
    const newValue = Math.round(min + ratio * (max - min))
    onChange(newValue)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(clamped)
      setInputValue(String(clamped))
    } else {
      setInputValue(String(value))
    }
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    } else if (e.key === 'Escape') {
      setInputValue(String(value))
      setIsEditing(false)
    }
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    isDragging.current = true
    updateValueFromX(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    updateValueFromX(e.clientX)
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return
    isDragging.current = true
    updateValueFromX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
    updateValueFromX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    isDragging.current = false
  }

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

  // Canvas logical width: make it much wider now
  const canvasLogicalWidth = fullWidth ? 480 : compact ? 200 : 240

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''} ${compact ? 'gap-1.5' : ''}`}>
      <span className={`text-muted-foreground uppercase tracking-wide whitespace-nowrap ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
        Gain
      </span>
      <div
        ref={sliderRef}
        className={`relative rounded cursor-ew-resize overflow-hidden ${fullWidth ? 'flex-1' : compact ? 'flex-1 h-4' : 'flex-1 sm:w-64 h-5'}`}
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
          if (e.key === 'ArrowRight') onChange(Math.min(max, value + 1))
          if (e.key === 'ArrowLeft') onChange(Math.max(min, value - 1))
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasLogicalWidth}
          height={compact ? 16 : 20}
          className="w-full h-full"
        />
      </div>
      
      {/* Manual input field */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          autoFocus
          className={`font-mono text-center text-foreground bg-input border border-primary rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            compact ? 'text-[8px] w-10' : 'text-xs w-12'
          }`}
        />
      ) : (
        <span
          onClick={() => {
            setIsEditing(true)
            setInputValue(String(value))
          }}
          className={`font-mono text-right text-foreground cursor-text hover:text-primary transition-colors ${
            compact ? 'text-[8px] w-8' : 'text-xs w-10'
          }`}
          title="Click to edit"
        >
          {value > 0 ? '+' : ''}{value}dB
        </span>
      )}
    </div>
  )
}
