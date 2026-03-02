'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useAnimationFrame } from '@/hooks/useAnimationFrame'
import { freqToLogPosition, clamp } from '@/lib/utils/mathHelpers'
import { formatFrequency } from '@/lib/utils/pitchUtils'
import { CANVAS_SETTINGS } from '@/lib/dsp/constants'
import type { Advisory } from '@/types/advisory'

interface FeedbackHeatmapCanvasProps {
  /** Historical feedback frequency counts */
  feedbackHistory: Map<number, { count: number; lastSeen: number; maxSeverity: string }>
  /** Current active advisories */
  advisories: Advisory[]
  /** Whether analysis is running */
  isRunning: boolean
  /** Graph font size */
  graphFontSize?: number
  /** Show frequency labels */
  showLabels?: boolean
}

const FREQ_LABELS = [100, 200, 500, 1000, 2000, 5000, 10000]

/**
 * Visualizes accumulated feedback detection history as a heatmap.
 * Brighter/taller bars indicate frequencies that have repeatedly triggered feedback detection.
 */
export function FeedbackHeatmapCanvas({
  feedbackHistory,
  advisories,
  isRunning,
  graphFontSize = 11,
  showLabels = true,
}: FeedbackHeatmapCanvasProps) {
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

    const padding = { top: 30, right: 20, bottom: 30, left: 50 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const { RTA_FREQ_MIN, RTA_FREQ_MAX } = CANVAS_SETTINGS

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight)

    // Grid lines (vertical at frequency labels)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const freq of FREQ_LABELS) {
      const x = padding.left + freqToLogPosition(freq, RTA_FREQ_MIN, RTA_FREQ_MAX) * plotWidth
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, padding.top + plotHeight)
    }
    ctx.stroke()

    // Find max count for normalization
    const maxCount = Math.max(1, ...Array.from(feedbackHistory.values()).map(v => v.count))

    // Draw heatmap bars for each feedback frequency
    const barWidth = 8
    const now = Date.now()
    
    for (const [freq, data] of feedbackHistory) {
      if (freq < RTA_FREQ_MIN || freq > RTA_FREQ_MAX) continue

      const x = padding.left + freqToLogPosition(freq, RTA_FREQ_MIN, RTA_FREQ_MAX) * plotWidth
      const intensity = data.count / maxCount
      const barHeight = intensity * plotHeight

      // Fade based on recency (older = more transparent)
      const age = now - data.lastSeen
      const recencyFade = Math.max(0.3, 1 - age / (60 * 1000)) // Fade over 60 seconds

      // Color based on severity
      let color: string
      switch (data.maxSeverity) {
        case 'critical':
          color = `rgba(239, 68, 68, ${0.6 * recencyFade})` // red
          break
        case 'high':
          color = `rgba(249, 115, 22, ${0.6 * recencyFade})` // orange
          break
        case 'medium':
          color = `rgba(234, 179, 8, ${0.5 * recencyFade})` // yellow
          break
        default:
          color = `rgba(34, 197, 94, ${0.4 * recencyFade})` // green
      }

      // Draw bar from bottom
      ctx.fillStyle = color
      ctx.fillRect(
        x - barWidth / 2,
        padding.top + plotHeight - barHeight,
        barWidth,
        barHeight
      )

      // Draw count label on tall bars
      if (intensity > 0.3 && showLabels) {
        ctx.fillStyle = '#fff'
        ctx.font = `${graphFontSize - 2}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(
          `${data.count}`,
          x,
          padding.top + plotHeight - barHeight - 4
        )
      }
    }

    // Highlight current active advisories
    for (const advisory of advisories) {
      const freq = advisory.trueFrequencyHz
      if (freq < RTA_FREQ_MIN || freq > RTA_FREQ_MAX) continue

      const x = padding.left + freqToLogPosition(freq, RTA_FREQ_MIN, RTA_FREQ_MAX) * plotWidth

      // Draw pulsing indicator at top
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(x, padding.top + 10, 5, 0, Math.PI * 2)
      ctx.fill()

      // Draw frequency label
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${graphFontSize}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(formatFrequency(freq), x, padding.top - 5)
    }

    // Y-axis labels (count scale)
    ctx.fillStyle = '#666'
    ctx.font = `${graphFontSize}px system-ui, sans-serif`
    ctx.textAlign = 'right'
    const countLabels = [0, Math.round(maxCount / 2), maxCount]
    for (const count of countLabels) {
      const y = padding.top + plotHeight - (count / maxCount) * plotHeight
      ctx.fillText(`${count}`, padding.left - 5, y + 3)
    }

    // X-axis labels (Hz)
    ctx.textAlign = 'center'
    for (const freq of FREQ_LABELS) {
      const x = padding.left + freqToLogPosition(freq, RTA_FREQ_MIN, RTA_FREQ_MAX) * plotWidth
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, height - 8)
    }

    // Title
    ctx.fillStyle = '#888'
    ctx.font = `bold ${graphFontSize}px system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('Feedback Frequency History', padding.left, 15)

    // Legend
    ctx.font = `${graphFontSize - 2}px system-ui, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(`Peak: ${maxCount} detections`, width - padding.right, 15)

  }, [feedbackHistory, advisories, graphFontSize, showLabels])

  useAnimationFrame(render, isRunning || feedbackHistory.size > 0)

  return (
    <div ref={containerRef} className="w-full h-full min-h-[150px]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
