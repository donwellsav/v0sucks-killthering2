'use client'

import { useRef, useEffect } from 'react'

interface InputMeterSliderProps {
  value: number
  onChange: (value: number) => void
  level: number // Current input level in dB (-60 to 0)
  min?: number
  max?: number
}

export function InputMeterSlider({
  value,
  onChange,
  level,
  min = -12,
  max = 24,
}: InputMeterSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

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

    // Gain marker triangle
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

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    updateValue(e)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    updateValue(e)
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    const slider = sliderRef.current
    if (!slider) return
    
    const rect = slider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = x / rect.width
    const newValue = Math.round(min + ratio * (max - min))
    onChange(newValue)
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide whitespace-nowrap">
        Gain
      </span>
      <div 
        ref={sliderRef}
        className="relative w-28 h-4 rounded cursor-ew-resize overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <canvas 
          ref={canvasRef}
          width={112}
          height={16}
          className="w-full h-full"
        />
      </div>
      <span className="text-xs font-mono w-10 text-right text-foreground">
        {value > 0 ? '+' : ''}{value}dB
      </span>
    </div>
  )
}
