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
  gain: number
  q: number
  type: 'peaking' | 'notch'
}

export interface ParametricEQExportContentProps {
  advisories: Advisory[]
  feedbackHistory?: Map<number, { count: number; maxSeverity: string }>
}

export function ParametricEQExportContent({ advisories, feedbackHistory }: ParametricEQExportContentProps) {
  const [qFactor, setQFactor] = useState(5)
  const [cutDepth, setCutDepth] = useState(-6)
  const [includeHistorical, setIncludeHistorical] = useState(true)
  const [maxBands, setMaxBands] = useState(8)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [copied, setCopied] = useState(false)

  const eqBands = useMemo<EQBand[]>(() => {
    const bands = new Map<number, EQBand>()
    for (const a of advisories) {
      const freq = Math.round(a.trueFrequencyHz)
      let depth = cutDepth
      if (a.severity === 'critical') depth = Math.min(depth, -15)
      else if (a.severity === 'high') depth = Math.min(depth, -10)
      bands.set(freq, { frequency: freq, gain: depth, q: qFactor, type: qFactor >= 8 ? 'notch' : 'peaking' })
    }
    if (includeHistorical && feedbackHistory) {
      for (const [freq, data] of feedbackHistory) {
        if (bands.has(freq) || data.count < 3) continue
        bands.set(freq, { frequency: Math.round(freq), gain: cutDepth + 2, q: qFactor * 0.8, type: 'peaking' })
      }
    }
    return Array.from(bands.values()).sort((a, b) => a.frequency - b.frequency).slice(0, maxBands)
  }, [advisories, feedbackHistory, qFactor, cutDepth, includeHistorical, maxBands])

  const buildContent = useCallback((fmt: ExportFormat): { content: string; filename: string; mime: string } => {
    switch (fmt) {
      case 'csv': return {
        content: ['Band,Frequency (Hz),Gain (dB),Q Factor,Type',
          ...eqBands.map((b, i) => `${i + 1},${b.frequency},${b.gain.toFixed(1)},${b.q.toFixed(1)},${b.type}`)
        ].join('\n'),
        filename: 'feedback_eq_cuts.csv', mime: 'text/csv',
      }
      case 'waves': return {
        content: JSON.stringify({ plugin: 'Q10', bands: eqBands.map((b, i) => ({ band: i + 1, enabled: true, frequency: b.frequency, gain: b.gain, q: b.q })) }, null, 2),
        filename: 'feedback_eq_waves.json', mime: 'application/json',
      }
      case 'protools': return {
        content: ['# Pro Tools Parametric EQ', `# Exported ${new Date().toISOString()}`, '',
          ...eqBands.map((b, i) => `Band ${i + 1}: ${b.frequency} Hz, ${b.gain.toFixed(1)} dB, Q=${b.q.toFixed(1)}`)
        ].join('\n'),
        filename: 'feedback_eq_protools.txt', mime: 'text/plain',
      }
      case 'smaart': return {
        content: ['# Smaart Feedback Frequency List', `# Exported ${new Date().toISOString()}`, '# Frequency (Hz), Recommended Cut (dB)',
          ...eqBands.map(b => `${b.frequency}, ${b.gain.toFixed(1)}`)
        ].join('\n'),
        filename: 'feedback_frequencies_smaart.txt', mime: 'text/plain',
      }
      default: return {
        content: JSON.stringify({ format: 'Kill The Ring EQ Export', version: '1.0', exportedAt: new Date().toISOString(), bands: eqBands }, null, 2),
        filename: 'feedback_eq_export.json', mime: 'application/json',
      }
    }
  }, [eqBands])

  const handleDownload = useCallback(() => {
    const { content, filename, mime } = buildContent(exportFormat)
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }, [buildContent, exportFormat])

  const handleCopy = useCallback(() => {
    const { content } = buildContent(exportFormat)
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [buildContent, exportFormat])

  const FORMAT_INFO: Record<ExportFormat, string> = {
    json: 'Universal JSON with full metadata',
    csv: 'Spreadsheet-compatible CSV',
    waves: 'Waves Q10/Q6 plugin preset',
    protools: 'Pro Tools text format',
    smaart: 'Smaart frequency list',
  }

  return (
    <div className="space-y-4">
      {/* Band preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Generated Bands ({eqBands.length} / {maxBands})</span>
          <span className="text-muted-foreground font-mono">Q = {qFactor.toFixed(1)}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
          {eqBands.map(band => (
            <div key={band.frequency} className="p-1.5 rounded bg-muted/50 text-[10px] flex justify-between items-center gap-1">
              <span className="font-mono">{formatFrequency(band.frequency)}</span>
              <span className={cn('font-mono font-semibold',
                band.gain <= -10 ? 'text-destructive' : band.gain <= -6 ? 'text-orange-500' : 'text-yellow-500'
              )}>
                {band.gain.toFixed(0)} dB
              </span>
            </div>
          ))}
          {eqBands.length === 0 && (
            <div className="col-span-2 py-4 text-center text-muted-foreground text-xs">
              No feedback frequencies detected yet
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Q Factor</span>
            <span className="font-mono text-muted-foreground">{qFactor.toFixed(1)}</span>
          </div>
          <Slider value={[qFactor]} onValueChange={([v]) => setQFactor(v)} min={1} max={15} step={0.5} />
          <div className="flex justify-between text-[9px] text-muted-foreground"><span>Wide</span><span>Narrow</span></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Cut Depth</span>
            <span className="font-mono text-muted-foreground">{cutDepth} dB</span>
          </div>
          <Slider value={[Math.abs(cutDepth)]} onValueChange={([v]) => setCutDepth(-v)} min={1} max={18} step={1} />
          <div className="flex justify-between text-[9px] text-muted-foreground"><span>Gentle</span><span>Deep</span></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Max Bands</span>
            <span className="font-mono text-muted-foreground">{maxBands}</span>
          </div>
          <Slider value={[maxBands]} onValueChange={([v]) => setMaxBands(v)} min={1} max={16} step={1} />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={includeHistorical} onChange={e => setIncludeHistorical(e.target.checked)} className="rounded" />
          Include historical (3+ detections)
        </label>
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Export Format</p>
        <div className="grid grid-cols-5 gap-1">
          {(['json', 'csv', 'waves', 'protools', 'smaart'] as ExportFormat[]).map(fmt => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={cn(
                'py-1 rounded text-[9px] font-medium border transition-colors',
                exportFormat === fmt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
              )}
            >
              {fmt === 'protools' ? 'PT' : fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground">{FORMAT_INFO[exportFormat]}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="default" size="sm" className="flex-1 h-9" onClick={handleDownload} disabled={eqBands.length === 0}>
          Download
        </Button>
        <Button variant="outline" size="sm" className="h-9 px-4" onClick={handleCopy} disabled={eqBands.length === 0}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
