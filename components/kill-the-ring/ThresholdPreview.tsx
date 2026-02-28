// Live threshold preview showing frequencies above current detection threshold
'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react'

interface ThresholdPreviewProps {
  spectrum: Float32Array | null
  threshold: number
  sampleRate: number
  fftSize: number
}

// Format frequency for display
function formatFreq(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`
  return `${hz.toFixed(0)}`
}

// Get frequency band name
function getFreqBand(hz: number): string {
  if (hz < 80) return 'Sub'
  if (hz < 250) return 'Low'
  if (hz < 500) return 'Low-Mid'
  if (hz < 2000) return 'Mid'
  if (hz < 6000) return 'Hi-Mid'
  return 'High'
}

export function ThresholdPreview({
  spectrum,
  threshold,
  sampleRate,
  fftSize,
}: ThresholdPreviewProps) {
  const analysis = useMemo(() => {
    if (!spectrum || spectrum.length === 0) {
      return null
    }

    const peaks: { freq: number; db: number; band: string }[] = []
    let maxDb = -Infinity
    let maxFreq = 0

    const freqPerBin = sampleRate / fftSize
    const nyquist = sampleRate / 2

    // Find local maxima above threshold
    for (let i = 1; i < spectrum.length - 1; i++) {
      const db = spectrum[i]
      const freq = i * freqPerBin

      if (freq > 20 && freq <= nyquist && db >= threshold) {
        // Check if local maximum
        if (db > spectrum[i - 1] && db > spectrum[i + 1]) {
          peaks.push({ freq, db, band: getFreqBand(freq) })
          if (db > maxDb) {
            maxDb = db
            maxFreq = freq
          }
        }
      }
    }

    // Sort by amplitude (loudest first) and take top peaks
    peaks.sort((a, b) => b.db - a.db)
    const topPeaks = peaks.slice(0, 8)

    // Group by frequency band for summary
    const bandCounts = peaks.reduce((acc, p) => {
      acc[p.band] = (acc[p.band] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const avgFreq = peaks.length > 0
      ? peaks.reduce((sum, p) => sum + p.freq, 0) / peaks.length
      : 0

    return {
      peaks,
      topPeaks,
      bandCounts,
      maxDb,
      maxFreq,
      avgFreq,
      totalCount: peaks.length,
    }
  }, [spectrum, threshold, sampleRate, fftSize])

  if (!analysis || analysis.totalCount === 0) {
    return (
      <Card className="p-2 bg-muted/20 border-dashed">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="w-3.5 h-3.5" />
          <span>No peaks above {threshold}dB threshold</span>
        </div>
      </Card>
    )
  }

  const severityLevel = analysis.totalCount > 20 ? 'critical' : analysis.totalCount > 10 ? 'warning' : 'normal'

  return (
    <Card className={cn(
      'p-2 transition-colors',
      severityLevel === 'critical' && 'bg-red-500/10 border-red-500/30',
      severityLevel === 'warning' && 'bg-amber-500/10 border-amber-500/30',
      severityLevel === 'normal' && 'bg-muted/20'
    )}>
      <div className="flex items-start gap-3">
        {/* Left: Summary stats */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded',
            severityLevel === 'critical' && 'bg-red-500/20 text-red-500',
            severityLevel === 'warning' && 'bg-amber-500/20 text-amber-500',
            severityLevel === 'normal' && 'bg-primary/10 text-primary'
          )}>
            {severityLevel !== 'normal' && <AlertTriangle className="w-3.5 h-3.5" />}
            <span className="font-mono text-sm font-bold">{analysis.totalCount}</span>
            <span className="text-[10px]">peaks</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px]">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Loudest:</span>
              <span className="font-mono font-semibold">{formatFreq(analysis.maxFreq)}Hz</span>
              <span className="text-muted-foreground">at</span>
              <span className="font-mono">{analysis.maxDb.toFixed(1)}dB</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Avg: {formatFreq(analysis.avgFreq)}Hz
            </div>
          </div>
        </div>

        {/* Center: Top peaks */}
        <div className="flex-1 flex items-center gap-1.5 flex-wrap">
          {analysis.topPeaks.slice(0, 6).map((p, i) => (
            <Badge
              key={i}
              variant="outline"
              className={cn(
                'text-[10px] font-mono h-5 px-1.5',
                i === 0 && 'border-primary/50 bg-primary/5'
              )}
            >
              {formatFreq(p.freq)}
              <span className="ml-1 text-muted-foreground text-[9px]">
                {p.db.toFixed(0)}dB
              </span>
            </Badge>
          ))}
          {analysis.topPeaks.length > 6 && (
            <Badge variant="secondary" className="text-[9px] h-5">
              +{analysis.topPeaks.length - 6}
            </Badge>
          )}
        </div>

        {/* Right: Band distribution */}
        <div className="flex gap-1">
          {Object.entries(analysis.bandCounts).slice(0, 4).map(([band, count]) => (
            <div
              key={band}
              className="flex flex-col items-center px-1.5 py-0.5 bg-muted/50 rounded text-[9px]"
            >
              <span className="font-mono font-bold">{count}</span>
              <span className="text-muted-foreground">{band}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
