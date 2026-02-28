// Live threshold preview showing frequencies above current detection threshold
'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ThresholdPreviewProps {
  spectrum: Float32Array | null
  threshold: number
  sampleRate: number
  fftSize: number
}

export function ThresholdPreview({
  spectrum,
  threshold,
  sampleRate,
  fftSize,
}: ThresholdPreviewProps) {
  const { frequenciesAboveThreshold, avgFreq, maxFreq } = useMemo(() => {
    if (!spectrum || spectrum.length === 0) {
      return { frequenciesAboveThreshold: [], avgFreq: 0, maxFreq: 0 }
    }

    const frequenciesAboveThreshold: { freq: number; db: number }[] = []
    let maxDb = -Infinity

    const freqPerBin = sampleRate / fftSize
    const nyquist = sampleRate / 2

    for (let i = 0; i < spectrum.length; i++) {
      const db = spectrum[i]
      const freq = i * freqPerBin

      // Only consider frequencies up to Nyquist and above 20 Hz
      if (freq > 20 && freq <= nyquist && db >= threshold) {
        frequenciesAboveThreshold.push({ freq, db })
        maxDb = Math.max(maxDb, db)
      }
    }

    const avgFreq =
      frequenciesAboveThreshold.length > 0
        ? frequenciesAboveThreshold.reduce((sum, f) => sum + f.freq, 0) /
          frequenciesAboveThreshold.length
        : 0

    return {
      frequenciesAboveThreshold,
      avgFreq,
      maxFreq: maxDb === -Infinity ? 0 : maxDb,
    }
  }, [spectrum, threshold, sampleRate, fftSize])

  if (!spectrum || frequenciesAboveThreshold.length === 0) {
    return (
      <Card className="p-3 bg-muted/20">
        <div className="text-xs text-muted-foreground text-center py-2">
          No frequencies above threshold ({threshold}dB)
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3 bg-muted/20">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            {frequenciesAboveThreshold.length} frequencies detected
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Peak: {maxFreq.toFixed(1)}dB
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {frequenciesAboveThreshold.slice(0, 6).map((f, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-mono">
              {f.freq.toFixed(0)}Hz
              <span className="ml-1 text-muted-foreground">{f.db.toFixed(1)}dB</span>
            </Badge>
          ))}
          {frequenciesAboveThreshold.length > 6 && (
            <Badge variant="outline" className="text-[10px]">
              +{frequenciesAboveThreshold.length - 6} more
            </Badge>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          Avg: {avgFreq.toFixed(0)}Hz | Range: {frequenciesAboveThreshold[0].freq.toFixed(0)}Hz -{' '}
          {frequenciesAboveThreshold[frequenciesAboveThreshold.length - 1].freq.toFixed(0)}Hz
        </div>
      </div>
    </Card>
  )
}
