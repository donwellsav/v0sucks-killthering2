'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { formatFrequency } from '@/lib/utils/pitchUtils'
import type { Advisory } from '@/types/advisory'

type ExportFormat = 'json' | 'csv' | 'waves' | 'protools' | 'smaart'

interface EQBand {
  frequency: number
  gain: number // Always negative for cuts
  q: number // Q factor
  type: 'peaking' | 'notch' | 'highpass' | 'lowpass'
}

interface ParametricEQExportProps {
  /** Current active advisories */
  advisories: Advisory[]
  /** Historical feedback frequencies with counts */
  feedbackHistory?: Map<number, { count: number; maxSeverity: string }>
  /** Callback when EQ bands are generated */
  onEQGenerated?: (bands: EQBand[]) => void
  className?: string
}

// Q factor presets based on bandwidth
const Q_PRESETS = {
  narrow: 10, // Very narrow notch
  medium: 5,  // Standard feedback cut
  wide: 2,    // Broader cut
}

// Cut depth presets
const CUT_PRESETS = {
  light: -3,
  moderate: -6,
  aggressive: -10,
  full: -15,
}

/**
 * Generates and exports parametric EQ settings based on detected feedback frequencies.
 * Supports multiple export formats for various digital mixers and DAWs.
 */
export function ParametricEQExport({
  advisories,
  feedbackHistory,
  onEQGenerated,
  className,
}: ParametricEQExportProps) {
  const [qFactor, setQFactor] = useState<number>(Q_PRESETS.medium)
  const [cutDepth, setCutDepth] = useState<number>(CUT_PRESETS.moderate)
  const [includeHistorical, setIncludeHistorical] = useState(true)
  const [maxBands, setMaxBands] = useState(8)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')

  // Generate EQ bands from advisories and history
  const eqBands = useMemo(() => {
    const bands: Map<number, EQBand> = new Map()

    // Add current advisories
    for (const advisory of advisories) {
      const freq = Math.round(advisory.trueFrequencyHz)
      
      // Adjust cut depth based on severity
      let depth = cutDepth
      if (advisory.severity === 'critical') depth = Math.min(depth, CUT_PRESETS.full)
      else if (advisory.severity === 'high') depth = Math.min(depth, CUT_PRESETS.aggressive)
      
      bands.set(freq, {
        frequency: freq,
        gain: depth,
        q: qFactor,
        type: qFactor >= 8 ? 'notch' : 'peaking',
      })
    }

    // Add historical frequencies if enabled
    if (includeHistorical && feedbackHistory) {
      for (const [freq, data] of feedbackHistory) {
        if (bands.has(freq)) continue // Skip if already from live advisories
        
        // Only include frequently triggered frequencies
        if (data.count < 3) continue
        
        // Adjust depth based on historical severity
        let depth = cutDepth + 2 // Slightly less aggressive for historical
        if (data.maxSeverity === 'critical') depth = Math.min(depth, CUT_PRESETS.aggressive)
        
        bands.set(freq, {
          frequency: Math.round(freq),
          gain: depth,
          q: qFactor * 0.8, // Slightly wider Q for historical
          type: 'peaking',
        })
      }
    }

    // Sort by frequency and limit to maxBands
    return Array.from(bands.values())
      .sort((a, b) => a.frequency - b.frequency)
      .slice(0, maxBands)
  }, [advisories, feedbackHistory, qFactor, cutDepth, includeHistorical, maxBands])

  // Export functions for different formats
  const exportJSON = useCallback(() => {
    return JSON.stringify({
      format: 'Kill The Ring Parametric EQ Export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      bands: eqBands,
      settings: {
        qFactor,
        cutDepth,
        includeHistorical,
      },
    }, null, 2)
  }, [eqBands, qFactor, cutDepth, includeHistorical])

  const exportCSV = useCallback(() => {
    const header = 'Band,Frequency (Hz),Gain (dB),Q Factor,Type'
    const rows = eqBands.map((band, i) => 
      `${i + 1},${band.frequency},${band.gain.toFixed(1)},${band.q.toFixed(1)},${band.type}`
    )
    return [header, ...rows].join('\n')
  }, [eqBands])

  const exportWaves = useCallback(() => {
    // Waves Q10/Q6 preset format (simplified)
    return JSON.stringify({
      plugin: 'Q10',
      bands: eqBands.map((band, i) => ({
        band: i + 1,
        enabled: true,
        frequency: band.frequency,
        gain: band.gain,
        q: band.q,
        shape: band.type === 'notch' ? 'bell' : 'bell',
      })),
    }, null, 2)
  }, [eqBands])

  const exportProTools = useCallback(() => {
    // Pro Tools EQ3/EQ7 style text format
    const lines = [
      '# Pro Tools Parametric EQ Settings',
      `# Exported from Kill The Ring on ${new Date().toISOString()}`,
      '#',
    ]
    eqBands.forEach((band, i) => {
      lines.push(`Band ${i + 1}: ${band.frequency} Hz, ${band.gain.toFixed(1)} dB, Q=${band.q.toFixed(1)}`)
    })
    return lines.join('\n')
  }, [eqBands])

  const exportSmaart = useCallback(() => {
    // Smaart-style frequency list
    const lines = [
      '# Smaart Feedback Frequency List',
      `# Exported ${new Date().toISOString()}`,
      '# Frequency (Hz), Recommended Cut (dB)',
    ]
    eqBands.forEach((band) => {
      lines.push(`${band.frequency}, ${band.gain.toFixed(1)}`)
    })
    return lines.join('\n')
  }, [eqBands])

  // Download export file
  const downloadExport = useCallback(() => {
    let content: string
    let filename: string
    let mimeType: string

    switch (exportFormat) {
      case 'csv':
        content = exportCSV()
        filename = 'feedback_eq_cuts.csv'
        mimeType = 'text/csv'
        break
      case 'waves':
        content = exportWaves()
        filename = 'feedback_eq_waves.json'
        mimeType = 'application/json'
        break
      case 'protools':
        content = exportProTools()
        filename = 'feedback_eq_protools.txt'
        mimeType = 'text/plain'
        break
      case 'smaart':
        content = exportSmaart()
        filename = 'feedback_frequencies_smaart.txt'
        mimeType = 'text/plain'
        break
      default:
        content = exportJSON()
        filename = 'feedback_eq_export.json'
        mimeType = 'application/json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    // Notify parent
    if (onEQGenerated) {
      onEQGenerated(eqBands)
    }
  }, [exportFormat, exportCSV, exportWaves, exportProTools, exportSmaart, exportJSON, eqBands, onEQGenerated])

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    let content: string
    switch (exportFormat) {
      case 'csv': content = exportCSV(); break
      case 'waves': content = exportWaves(); break
      case 'protools': content = exportProTools(); break
      case 'smaart': content = exportSmaart(); break
      default: content = exportJSON()
    }
    navigator.clipboard.writeText(content)
  }, [exportFormat, exportCSV, exportWaves, exportProTools, exportSmaart, exportJSON])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Parametric EQ Export
      </div>

      {/* EQ Band preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Generated Bands ({eqBands.length}/{maxBands})</span>
          <span className="text-muted-foreground font-mono">Q={qFactor.toFixed(1)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
          {eqBands.map((band, i) => (
            <div
              key={band.frequency}
              className="p-1.5 rounded bg-muted/50 text-[10px] flex justify-between items-center"
            >
              <span className="font-mono">{formatFrequency(band.frequency)}</span>
              <span className={cn(
                'font-mono',
                band.gain <= -10 ? 'text-red-500' : band.gain <= -6 ? 'text-orange-500' : 'text-yellow-500'
              )}>
                {band.gain.toFixed(0)} dB
              </span>
            </div>
          ))}
          {eqBands.length === 0 && (
            <div className="col-span-2 p-3 text-center text-muted-foreground text-xs">
              No feedback frequencies detected
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {/* Q Factor */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span>Q Factor (Bandwidth)</span>
            <span className="font-mono">{qFactor.toFixed(1)}</span>
          </div>
          <Slider
            value={[qFactor]}
            onValueChange={([v]) => setQFactor(v)}
            min={1}
            max={15}
            step={0.5}
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Wide</span>
            <span>Narrow</span>
          </div>
        </div>

        {/* Cut Depth */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span>Cut Depth</span>
            <span className="font-mono">{cutDepth} dB</span>
          </div>
          <Slider
            value={[Math.abs(cutDepth)]}
            onValueChange={([v]) => setCutDepth(-v)}
            min={1}
            max={18}
            step={1}
          />
        </div>

        {/* Max Bands */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span>Max Bands</span>
            <span className="font-mono">{maxBands}</span>
          </div>
          <Slider
            value={[maxBands]}
            onValueChange={([v]) => setMaxBands(v)}
            min={1}
            max={16}
            step={1}
          />
        </div>

        {/* Include historical */}
        <label className="flex items-center gap-2 text-[10px]">
          <input
            type="checkbox"
            checked={includeHistorical}
            onChange={(e) => setIncludeHistorical(e.target.checked)}
            className="rounded"
          />
          <span>Include historical frequencies</span>
        </label>
      </div>

      {/* Export format */}
      <div className="space-y-2">
        <div className="text-[10px] text-muted-foreground">Export Format</div>
        <div className="grid grid-cols-3 gap-1">
          {(['json', 'csv', 'waves', 'protools', 'smaart'] as ExportFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => setExportFormat(format)}
              className={cn(
                'px-2 py-1 rounded text-[9px] font-medium border transition-colors',
                exportFormat === format
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1 h-8"
          onClick={downloadExport}
          disabled={eqBands.length === 0}
        >
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={copyToClipboard}
          disabled={eqBands.length === 0}
        >
          Copy
        </Button>
      </div>

      {/* Format info */}
      <div className="text-[9px] text-muted-foreground">
        {exportFormat === 'json' && 'Universal JSON format with full metadata'}
        {exportFormat === 'csv' && 'Spreadsheet-compatible CSV format'}
        {exportFormat === 'waves' && 'Waves Q10/Q6 plugin preset format'}
        {exportFormat === 'protools' && 'Pro Tools text format for manual entry'}
        {exportFormat === 'smaart' && 'Smaart-compatible frequency list'}
      </div>
    </div>
  )
}
