'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useAnimationFrame } from '@/hooks/useAnimationFrame'
import { freqToLogPosition, clamp } from '@/lib/utils/mathHelpers'
import { CANVAS_SETTINGS } from '@/lib/dsp/constants'
import type { SpectrumData } from '@/types/advisory'

interface WaterfallCanvasProps {
  spectrum: SpectrumData | null
  isRunning: boolean
}

const HISTORY_SIZE = 128

export function WaterfallCanvas({ spectrum, isRunning }: WaterfallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const historyRef = useRef<Float32Array[]>([])
  const lastSpectrumRef = useRef<number>(0)

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

  // Update history
  useEffect(() => {
    if (!spectrum?.freqDb || !isRunning) return
    if (spectrum.timestamp === lastSpectrumRef.current) return

    lastSpectrumRef.current = spectrum.timestamp

    // Add new spectrum to history
    const copy = new Float32Array(spectrum.freqDb)
    historyRef.current.push(copy)

    // Limit history size
    while (historyRef.current.length > HISTORY_SIZE) {
      historyRef.current.shift()
    }
  }, [spectrum, isRunning])

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

    const padding = { top: 10, right: 10, bottom: 20, left: 40 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    const history = historyRef.current
    if (history.length === 0) {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight)
      return
    }

    const { RTA_DB_MIN, RTA_DB_MAX, RTA_FREQ_MIN, RTA_FREQ_MAX } = CANVAS_SETTINGS
    
    // Get current spectrum info for frequency mapping
    const currentSpectrum = spectrum
    if (!currentSpectrum?.sampleRate || !currentSpectrum?.fftSize) {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight)
      return
    }

    const hzPerBin = currentSpectrum.sampleRate / currentSpectrum.fftSize
    const n = history[0]?.length ?? 0

    // Calculate number of display columns
    const numCols = Math.min(plotWidth, 256)
    const numRows = history.length
    const colWidth = plotWidth / numCols
    const rowHeight = plotHeight / HISTORY_SIZE

    ctx.save()
    ctx.translate(padding.left, padding.top)

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, plotWidth, plotHeight)

    // Draw waterfall
    for (let row = 0; row < numRows; row++) {
      const spectrumRow = history[numRows - 1 - row] // Newest at top
      if (!spectrumRow) continue

      const y = row * rowHeight

      for (let col = 0; col < numCols; col++) {
        // Map column to frequency
        const logPos = col / numCols
        const freq = Math.pow(10, Math.log10(RTA_FREQ_MIN) + logPos * (Math.log10(RTA_FREQ_MAX) - Math.log10(RTA_FREQ_MIN)))
        const bin = Math.round(freq / hzPerBin)

        if (bin < 1 || bin >= n) continue

        const db = clamp(spectrumRow[bin], RTA_DB_MIN, RTA_DB_MAX)
        const normalized = (db - RTA_DB_MIN) / (RTA_DB_MAX - RTA_DB_MIN)

        // Color mapping: blue (low) -> green (mid) -> yellow (high) -> red (peak)
        const r = normalized > 0.7 ? 255 : Math.floor(normalized * 255 / 0.7)
        const g = normalized > 0.5 ? Math.floor(255 * (1 - (normalized - 0.5) / 0.5)) : Math.floor(normalized * 255 / 0.5)
        const b = normalized < 0.3 ? Math.floor(255 * (1 - normalized / 0.3)) : 0

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(col * colWidth, y, colWidth + 0.5, rowHeight + 0.5)
      }
    }

    ctx.restore()

    // Time axis (right side)
    ctx.fillStyle = '#555'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Now', width - padding.right + 3, padding.top + 8)
    ctx.fillText('~5s', width - padding.right + 3, height - padding.bottom - 5)

    // Frequency axis (bottom)
    ctx.textAlign = 'center'
    const freqLabels = [100, 1000, 10000]
    for (const freq of freqLabels) {
      const x = padding.left + freqToLogPosition(freq, RTA_FREQ_MIN, RTA_FREQ_MAX) * plotWidth
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, height - 4)
    }

  }, [spectrum])

  useAnimationFrame(render, isRunning || historyRef.current.length > 0)

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
