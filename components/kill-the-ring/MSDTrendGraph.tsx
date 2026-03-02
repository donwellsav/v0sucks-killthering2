'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useAnimationFrame } from '@/hooks/useAnimationFrame'
import { clamp } from '@/lib/utils/mathHelpers'
import { formatFrequency } from '@/lib/utils/pitchUtils'
import { VIZ_COLORS } from '@/lib/dsp/constants'

interface MSDDataPoint {
  timestamp: number
  frequency: number
  msdValue: number
  isFeedback: boolean
}

interface MSDTrendGraphProps {
  /** MSD history data for tracked frequencies */
  msdHistory: Map<number, MSDDataPoint[]>
  /** Maximum number of frequencies to display (default 5) */
  maxFrequencies?: number
  /** Time window in seconds (default 30) */
  timeWindowSeconds?: number
  /** MSD threshold for feedback detection */
  msdThreshold?: number
  isRunning: boolean
  graphFontSize?: number
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
]

export function MSDTrendGraph({
  msdHistory,
  maxFrequencies = 5,
  timeWindowSeconds = 30,
  msdThreshold = 0.5,
  isRunning,
  graphFontSize = 11,
}: MSDTrendGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        dimensionsRef.current = { width, height }

        const canvas = canvasRef.current
        if (canvas) {
          const dpr = window.devicePixelRatio || 1
          canvas.width = Math.floor(width * dpr)
          canvas.height = Math.floor(height * dpr)
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const padding = { top: 20, right: 100, bottom: 30, left: 50 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight)

    // MSD range: 0 to 2 (log scale would be better but linear is clearer)
    const MSD_MIN = 0
    const MSD_MAX = 2

    // Draw threshold line
    const thresholdY = padding.top + ((MSD_MAX - msdThreshold) / (MSD_MAX - MSD_MIN)) * plotHeight
    ctx.strokeStyle = VIZ_COLORS.RUNAWAY
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(padding.left, thresholdY)
    ctx.lineTo(padding.left + plotWidth, thresholdY)
    ctx.stroke()
    ctx.setLineDash([])

    // Label threshold
    ctx.fillStyle = VIZ_COLORS.RUNAWAY
    ctx.font = `${graphFontSize - 1}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('FEEDBACK', padding.left + 5, thresholdY - 4)

    // Grid lines
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let msd = 0; msd <= MSD_MAX; msd += 0.5) {
      const y = padding.top + ((MSD_MAX - msd) / (MSD_MAX - MSD_MIN)) * plotHeight
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + plotWidth, y)
    }
    ctx.stroke()

    // Get top frequencies by activity
    const now = Date.now()
    const windowMs = timeWindowSeconds * 1000
    const sortedFreqs = Array.from(msdHistory.entries())
      .map(([freq, points]) => {
        const recent = points.filter(p => now - p.timestamp < windowMs)
        const avgMsd = recent.length > 0 
          ? recent.reduce((sum, p) => sum + p.msdValue, 0) / recent.length 
          : 0
        return { freq, points: recent, avgMsd }
      })
      .filter(f => f.points.length > 0)
      .sort((a, b) => b.avgMsd - a.avgMsd)
      .slice(0, maxFrequencies)

    // Draw lines for each frequency
    sortedFreqs.forEach(({ freq, points }, index) => {
      if (points.length < 2) return

      const color = COLORS[index % COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      let started = false
      for (const point of points) {
        const age = now - point.timestamp
        if (age > windowMs) continue

        const x = padding.left + ((windowMs - age) / windowMs) * plotWidth
        const y = padding.top + ((MSD_MAX - clamp(point.msdValue, MSD_MIN, MSD_MAX)) / (MSD_MAX - MSD_MIN)) * plotHeight

        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Legend entry on the right
      const legendY = padding.top + 15 + index * 16
      ctx.fillStyle = color
      ctx.fillRect(padding.left + plotWidth + 10, legendY - 6, 10, 10)
      ctx.fillStyle = '#888'
      ctx.font = `${graphFontSize}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(formatFrequency(freq), padding.left + plotWidth + 25, legendY + 3)
    })

    // Y-axis labels (MSD values)
    ctx.fillStyle = '#666'
    ctx.font = `${graphFontSize}px system-ui, sans-serif`
    ctx.textAlign = 'right'
    for (let msd = 0; msd <= MSD_MAX; msd += 0.5) {
      const y = padding.top + ((MSD_MAX - msd) / (MSD_MAX - MSD_MIN)) * plotHeight
      ctx.fillText(msd.toFixed(1), padding.left - 5, y + 3)
    }

    // X-axis labels (time)
    ctx.textAlign = 'center'
    const timeLabels = [0, 10, 20, 30]
    for (const sec of timeLabels) {
      if (sec > timeWindowSeconds) continue
      const x = padding.left + ((timeWindowSeconds - sec) / timeWindowSeconds) * plotWidth
      ctx.fillText(`${sec}s`, x, height - 8)
    }

    // Axis titles
    ctx.save()
    ctx.translate(12, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('MSD', 0, 0)
    ctx.restore()

    ctx.textAlign = 'center'
    ctx.fillText('Time Ago', width / 2 - padding.right / 2, height - 2)

    // Title
    ctx.fillStyle = '#888'
    ctx.font = `bold ${graphFontSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('MSD Trend (Lower = More Likely Feedback)', padding.left, 12)

  }, [msdHistory, maxFrequencies, timeWindowSeconds, msdThreshold, graphFontSize])

  useAnimationFrame(render, isRunning || msdHistory.size > 0)

  return (
    <div ref={containerRef} className="w-full h-full min-h-[120px]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
