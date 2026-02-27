'use client'

import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { ControlPanel } from './ControlPanel'
import { IssuesList } from './IssuesList'
import { SpectrumCanvas } from './SpectrumCanvas'
import { GEQBarView } from './GEQBarView'
import { WaterfallCanvas } from './WaterfallCanvas'
import { SettingsPanel } from './SettingsPanel'
import { TrackTimeline } from './TrackTimeline'
import { DEFAULT_SETTINGS } from '@/lib/dsp/constants'

export function KillTheRing() {
  const {
    isRunning,
    hasPermission,
    error,
    noiseFloorDb,
    sampleRate,
    fftSize,
    spectrum,
    advisories,
    tracks,
    settings,
    start,
    stop,
    updateSettings,
    resetSettings,
  } = useAudioAnalyzer()

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">KillTheRing2</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
            Acoustic Feedback Detection
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Live</span>
            </div>
          )}
          <span className="font-mono">{fftSize} pt FFT @ {(sampleRate / 1000).toFixed(1)}kHz</span>
          <SettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            onReset={resetSettings}
          />
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/20">
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Controls */}
        <aside className="w-72 flex-shrink-0 border-r border-border overflow-y-auto p-4">
          <ControlPanel
            isRunning={isRunning}
            settings={settings}
            onStart={start}
            onStop={stop}
            onSettingsChange={updateSettings}
            noiseFloorDb={noiseFloorDb}
            sampleRate={sampleRate}
          />
          
          {/* Issues List */}
          <div className="mt-4">
            <h2 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Active Issues ({advisories.length})
            </h2>
            <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
          </div>
        </aside>

        {/* Main Visualization Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* RTA Spectrum */}
          <div className="flex-1 min-h-0 p-4 pb-2">
            <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-foreground">RTA Spectrum</span>
                <span className="text-xs text-muted-foreground">
                  {spectrum?.noiseFloorDb !== null ? `Floor: ${spectrum?.noiseFloorDb?.toFixed(1)}dB` : ''}
                </span>
              </div>
              <div className="h-[calc(100%-28px)]">
                <SpectrumCanvas
                  spectrum={spectrum}
                  advisories={advisories}
                  isRunning={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section - GEQ and Waterfall */}
          <div className="flex gap-4 p-4 pt-2 h-64">
            {/* GEQ Bar View */}
            <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-foreground">31-Band GEQ</span>
                <span className="text-xs text-muted-foreground">ISO Bands</span>
              </div>
              <div className="h-[calc(100%-28px)]">
                <GEQBarView advisories={advisories} />
              </div>
            </div>

            {/* Waterfall Display */}
            <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-foreground">Waterfall</span>
                <span className="text-xs text-muted-foreground">Time History</span>
              </div>
              <div className="h-[calc(100%-28px)]">
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
