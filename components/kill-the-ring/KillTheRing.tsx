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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border">
        {/* Left: Logo + Start/Stop */}
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-foreground tracking-tight">KillTheRing</h1>
          
          <Button
            onClick={isRunning ? stop : start}
            variant={isRunning ? 'secondary' : 'default'}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            {isRunning ? (
              <>
                <MicOff className="w-4 h-4 mr-1.5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-1.5" />
                Start
              </>
            )}
          </Button>

          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Center: Mode + Gain */}
        <div className="flex items-center gap-6">
          <Select value={settings.mode} onValueChange={(v) => handleModeChange(v as OperationMode)}>
            <SelectTrigger className="h-8 w-40 text-xs">
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">
            {fftSize}pt FFT
          </span>
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
        {/* Left Sidebar - Issues */}
        <aside className="w-72 flex-shrink-0 border-r border-border overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-foreground">Active Issues</h2>
              <span className="text-xs font-mono text-muted-foreground">{advisories.length}</span>
            </div>
            <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
          </div>
        </aside>

        {/* Visualization Area */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
          {/* RTA Spectrum */}
          <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-foreground">RTA Spectrum</span>
              <span className="text-xs text-muted-foreground font-mono">
                {noiseFloorDb !== null ? `Floor ${noiseFloorDb.toFixed(0)}dB` : ''}
              </span>
            </div>
            <div className="h-[calc(100%-36px)]">
              <SpectrumCanvas
                spectrum={spectrum}
                advisories={advisories}
                isRunning={isRunning}
              />
            </div>
          </div>

          {/* Bottom Row - GEQ and Waterfall */}
          <div className="flex gap-3 h-48">
            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-foreground">31-Band GEQ</span>
              </div>
              <div className="h-[calc(100%-36px)]">
                <GEQBarView advisories={advisories} />
              </div>
            </div>

            <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-foreground">Waterfall</span>
              </div>
              <div className="h-[calc(100%-36px)]">
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
