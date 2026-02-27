'use client'

import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { IssuesList } from './IssuesList'
import { SpectrumCanvas } from './SpectrumCanvas'
import { GEQBarView } from './GEQBarView'
import { WaterfallCanvas } from './WaterfallCanvas'
import { SettingsPanel } from './SettingsPanel'
import { HelpMenu } from './HelpMenu'
import { InputMeterSlider } from './InputMeterSlider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic, MicOff } from 'lucide-react'
import type { OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'

export function KillTheRing() {
  const {
    isRunning,
    error,
    noiseFloorDb,
    sampleRate,
    fftSize,
    spectrum,
    advisories,
    settings,
    start,
    stop,
    updateSettings,
    resetSettings,
  } = useAudioAnalyzer()

  const handleModeChange = (mode: OperationMode) => {
    const modeSettings = OPERATION_MODES[mode]
    updateSettings({
      mode,
      feedbackThresholdDb: modeSettings.feedbackThreshold,
      ringThresholdDb: modeSettings.ringThreshold,
      growthRateThreshold: modeSettings.growthRateThreshold,
      musicAware: modeSettings.musicAware,
    })
  }

  // Get current input level from spectrum for meter
  const inputLevel = spectrum?.peak ?? -60

  return (
    <div className="flex flex-col h-screen">
      {/* Header with Controls */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Left: Logo + Start/Stop */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">KillTheRing2</h1>
          
          <Button
            onClick={isRunning ? stop : start}
            variant={isRunning ? 'destructive' : 'default'}
            size="sm"
            className="h-7 px-3 text-xs font-medium"
          >
            {isRunning ? (
              <>
                <MicOff className="w-3.5 h-3.5 mr-1.5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 mr-1.5" />
                Start
              </>
            )}
          </Button>

          {isRunning && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary font-medium">LIVE</span>
            </div>
          )}
        </div>

        {/* Center: Mode + Gain Meter */}
        <div className="flex items-center gap-4">
          <Select value={settings.mode} onValueChange={(v) => handleModeChange(v as OperationMode)}>
            <SelectTrigger className="h-7 w-36 text-xs bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feedbackHunt">Feedback Hunt</SelectItem>
              <SelectItem value="vocalRing">Vocal Ring</SelectItem>
              <SelectItem value="musicAware">Music-Aware</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="calibration">Calibration</SelectItem>
            </SelectContent>
          </Select>

          <InputMeterSlider
            value={settings.inputGainDb}
            onChange={(v) => updateSettings({ inputGainDb: v })}
            level={inputLevel}
          />
        </div>

        {/* Right: Info + Settings */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono text-[10px]">
            {fftSize}pt @ {(sampleRate / 1000).toFixed(1)}kHz
          </span>
          {noiseFloorDb !== null && (
            <span className="font-mono text-[10px]">
              Floor: {noiseFloorDb.toFixed(0)}dB
            </span>
          )}
          <HelpMenu />
          <SettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            onReset={resetSettings}
          />
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Issues Only */}
        <aside className="w-64 flex-shrink-0 border-r border-border overflow-y-auto p-3 bg-card/50">
          <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>Active Issues</span>
            <span className="text-primary font-mono">{advisories.length}</span>
          </h2>
          <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
        </aside>

        {/* Main Visualization Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* RTA Spectrum */}
          <div className="flex-1 min-h-0 p-3 pb-1.5">
            <div className="h-full bg-card/60 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20">
                <span className="text-[10px] font-medium text-foreground">RTA Spectrum</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {spectrum?.noiseFloorDb !== null ? `${spectrum?.noiseFloorDb?.toFixed(0)}dB floor` : ''}
                </span>
              </div>
              <div className="h-[calc(100%-24px)]">
                <SpectrumCanvas
                  spectrum={spectrum}
                  advisories={advisories}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section - GEQ and Waterfall */}
          <div className="flex gap-3 p-3 pt-1.5 h-56">
            {/* GEQ Bar View */}
            <div className="flex-1 bg-card/60 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20">
                <span className="text-[10px] font-medium text-foreground">31-Band GEQ</span>
              </div>
              <div className="h-[calc(100%-24px)]">
                <GEQBarView advisories={advisories} />
              </div>
            </div>

            {/* Waterfall Display */}
            <div className="flex-1 bg-card/60 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20">
                <span className="text-[10px] font-medium text-foreground">Waterfall</span>
              </div>
              <div className="h-[calc(100%-24px)]">
                <WaterfallCanvas 
                  spectrum={spectrum}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
