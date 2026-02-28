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
  const [editing, setEditing] = useState(false)

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
    gradient.addColorStop(0, '#3B82F6')
    gradient.addColorStop(0.6, '#3B82F6')
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
    if (editing) return
    isDragging.current = true
    updateValueFromX(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    updateValueFromX(e.clientX)
  }

  const handleMouseUp = () => { isDragging.current = false }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (editing) return
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
  }, [editing])

  const commitEdit = (raw: string) => {
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)))
    setEditing(false)
  }

  const valueLabel = `${value > 0 ? '+' : ''}${value}dB`

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
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

      {/* Value display — click to edit */}
      {editing ? (
        <input
          autoFocus
          type="text"
          defaultValue={String(value)}
          className={`font-mono bg-input border border-primary rounded px-1 text-center text-foreground focus-visible:outline-none flex-shrink-0 ${compact ? 'text-[8px] w-9 h-4' : 'text-xs w-12 h-5'}`}
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit((e.target as HTMLInputElement).value)
            if (e.key === 'Escape') setEditing(false)
            if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(max, value + 1)) }
            if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min, value - 1)) }
          }}
        />
      ) : (
        <button
          className={`font-mono text-right text-foreground hover:text-primary transition-colors cursor-text flex-shrink-0 tabular-nums ${compact ? 'text-[8px] w-9' : 'text-xs w-12'}`}
          onClick={() => setEditing(true)}
          onWheel={(e) => {
            e.preventDefault()
            onChange(e.deltaY < 0 ? Math.min(max, value + 1) : Math.max(min, value - 1))
          }}
          title="Click to type, scroll to step ±1dB"
          aria-label={`Input gain ${valueLabel}, click to edit`}
        >
          {valueLabel}
        </button>
      )}
    </div>
  )
}
