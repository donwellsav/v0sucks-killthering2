'use client'

// Kill The Ring — v2.0 Full Rebuild (cache invalidation v1)

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { useAdvisoryLogging } from '@/hooks/useAdvisoryLogging'
import { IssuesList } from './IssuesList'
import { SpectrumCanvas } from './SpectrumCanvas'
import { GEQBarView } from './GEQBarView'
import { WaterfallCanvas } from './WaterfallCanvas'
import { SettingsPanel } from './SettingsPanel'
import { HelpMenu } from './HelpMenu'
import { InputMeterSlider } from './InputMeterSlider'
import { ResetConfirmDialog } from './ResetConfirmDialog'
import { LogsViewer } from './LogsViewer'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Menu, X, History } from 'lucide-react'
import Link from 'next/link'
import type { OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'
import { getEventLogger } from '@/lib/logging/eventLogger'

type GraphView = 'rta' | 'geq' | 'waterfall'

const GRAPH_CHIPS: { value: GraphView; label: string }[] = [
  { value: 'rta', label: 'RTA' },
  { value: 'geq', label: 'GEQ' },
  { value: 'waterfall', label: 'WTF' },
]

export function KillTheRing() {
  // v2.1 Force Rebuild — bundler cache invalidation
  // Ensures correct GRAPH_CHIPS usage, no window.innerWidth, proper syntax
  // Last updated: 2026-02-28
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

  const [activeGraph, setActiveGraph] = useState<GraphView>('rta')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileShowGraph, setMobileShowGraph] = useState(false)

  const loggerRef = useRef(getEventLogger())
  const logger = loggerRef.current
  const sessionIdRef = useRef<string | null>(null)
  const lastFlushedRef = useRef<number>(0)

  const flushEventsToDB = useCallback(async (sessionId: string) => {
    const allLogs = loggerRef.current.getLogs()
    const newLogs = allLogs.slice(lastFlushedRef.current)
    if (newLogs.length === 0) return
    lastFlushedRef.current = allLogs.length
    try {
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: newLogs }),
      })
    } catch {
      // Non-fatal: events remain in-memory
    }
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (isRunning) {
      logger.logAnalysisStarted({ mode: settings.mode, fftSize: settings.fftSize })
      const newId = crypto.randomUUID()
      sessionIdRef.current = newId
      lastFlushedRef.current = 0
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, mode: settings.mode, fftSize: settings.fftSize }),
      }).catch(() => {})
    } else {
      logger.logAnalysisStopped()
      const sid = sessionIdRef.current
      if (sid) {
        flushEventsToDB(sid).then(() => {
          fetch(`/api/sessions/${sid}`, { method: 'PATCH' }).catch(() => {})
        })
        sessionIdRef.current = null
      }
    }
  }, [isRunning, settings.mode, settings.fftSize, logger, flushEventsToDB])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      if (sessionIdRef.current) flushEventsToDB(sessionIdRef.current)
    }, 30_000)
    return () => clearInterval(interval)
  }, [isRunning, flushEventsToDB])

  useAdvisoryLogging(advisories)

  const handleModeChange = (mode: OperationMode) => {
    const modeSettings = OPERATION_MODES[mode]
    updateSettings({
      mode,
      feedbackThresholdDb: modeSettings.feedbackThreshold,
      ringThresholdDb: modeSettings.ringThreshold,
      growthRateThreshold: modeSettings.growthRateThreshold,
      musicAware: modeSettings.musicAware,
    })
    logger.logSettingsChanged({ mode, reason: 'mode_changed' })
  }

  const handleSettingsChange = useCallback((newSettings: Partial<typeof settings>) => {
    updateSettings(newSettings)
    loggerRef.current.logSettingsChanged(newSettings)
  }, [updateSettings])

  const inputLevel = spectrum?.peak ?? -60

  const DetectionControls = () => (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-3">
        <Select value={settings.mode} onValueChange={(v) => handleModeChange(v as OperationMode)}>
          <SelectTrigger className="h-7 w-full text-xs bg-input border-border">
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

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Threshold</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  Primary sensitivity. 4-8dB aggressive, 10-14dB balanced, 16+dB conservative.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono">{settings.feedbackThresholdDb}dB</span>
          </div>
          <Slider
            value={[settings.feedbackThresholdDb]}
            onValueChange={([v]) => handleSettingsChange({ feedbackThresholdDb: v })}
            min={2} max={20} step={1}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Ring</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  Resonance detection. 2-4dB for calibration, 5-7dB normal, 8+dB during shows.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono">{settings.ringThresholdDb}dB</span>
          </div>
          <Slider
            value={[settings.ringThresholdDb]}
            onValueChange={([v]) => handleSettingsChange({ ringThresholdDb: v })}
            min={1} max={12} step={0.5}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Growth</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  How fast feedback must grow. 0.5-1dB/s catches early, 3+dB/s only runaway.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono">{settings.growthRateThreshold.toFixed(1)}dB/s</span>
          </div>
          <Slider
            value={[settings.growthRateThreshold]}
            onValueChange={([v]) => handleSettingsChange({ growthRateThreshold: v })}
            min={0.5} max={8} step={0.5}
          />
        </div>
      </div>
    </TooltipProvider>
  )

  return (
    <div className="flex flex-col h-screen">
      {/* ─── KILL THE RING v2.1 ─────────────────────────────────────────────────
          Buildtime: 2026-02-28 | Bundler cache: invalidated
          Layout: Header + Mobile/Desktop content + Reset confirmation
          Graphs: GRAPH_CHIPS (RTA/GEQ/Waterfall) - NO window.innerWidth SSR access
          ──────────────────────────────────────────────────────────────────────── */}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm gap-2 sm:gap-4">

        {/* Logo / start-stop */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2.5 pl-2 sm:pl-3 border-l border-border/50">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={isRunning ? stop : start}
                    aria-label={isRunning ? 'Stop analysis' : 'Start analysis'}
                    className="relative w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                  >
                    <div className={`absolute inset-0 rounded-full border transition-colors duration-300 ${isRunning ? 'border-primary' : 'border-primary/60'}`} />
                    {isRunning && (
                      <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-40" />
                    )}
                    <svg
                      className={`w-4 sm:w-5 h-4 sm:h-5 relative z-10 transition-colors duration-300 ${isRunning ? 'text-primary' : 'text-primary/70 hover:text-primary'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.31-2.5-4.06v8.12c1.48-.75 2.5-2.29 2.5-4.06zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isRunning ? 'Stop analysis' : 'Start analysis'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="hidden sm:flex flex-col gap-0.5">
              <div className="leading-none">
                <span className="text-sm font-black tracking-tight text-foreground">KILL THE </span>
                <span className="text-sm font-black tracking-tight text-primary">RING</span>
              </div>
              <span className="text-[7.5px] font-semibold tracking-widest text-muted-foreground uppercase">Don Wells AV</span>
            </div>
          </div>
        </div>

        {/* Center: Gain slider — styled section container */}
        <div className="hidden md:flex items-center flex-1 min-w-0 px-4">
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Section label */}
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Input Gain
            </div>
            {/* Gain control */}
            <InputMeterSlider
              value={settings.inputGainDb}
              onChange={(v) => handleSettingsChange({ inputGainDb: v })}
              level={inputLevel}
              fullWidth
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-shrink-0">
          {noiseFloorDb !== null && (
            <span className="font-mono text-[9px] sm:text-[10px] hidden lg:inline">
              Floor: {noiseFloorDb.toFixed(0)}dB
            </span>
          )}

          <LogsViewer />
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground" aria-label="Session History">
            <Link href="/sessions">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">History</span>
            </Link>
          </Button>
          <HelpMenu />
          <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onReset={() => {
              resetSettings()
              logger.logSettingsChanged({ action: 'reset_to_defaults' })
            }}
          />

          {/* Mobile: toggle graph vs controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileShowGraph(!mobileShowGraph)}
            className="lg:hidden h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            aria-label={mobileShowGraph ? 'Show controls' : 'Show graph'}
            title={mobileShowGraph ? 'Show controls' : 'Show graph'}
          >
            {mobileShowGraph ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="12 3 20 7.46 20 16.91 12 21 4 16.55 4 7"/>
                <polyline points="12 12.46 20 7.46"/>
                <polyline points="12 12.46 12 21"/>
                <polyline points="12 12.46 4 7.46"/>
              </svg>
            )}
          </Button>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Mobile full-screen overlay ─────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Controls menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.31-2.5-4.06v8.12c1.48-.75 2.5-2.29 2.5-4.06zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <span className="text-sm font-semibold text-foreground">Controls</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <section>
              <h3 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Input Gain</h3>
              <InputMeterSlider
                value={settings.inputGainDb}
                onChange={(v) => handleSettingsChange({ inputGainDb: v })}
                level={inputLevel}
                fullWidth
              />
            </section>
            <div className="border-t border-border" />
            <section>
              <DetectionControls />
            </section>
            <div className="border-t border-border" />
            <section>
              <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Active Issues</span>
                <span className="text-primary font-mono">{advisories.length}</span>
              </h2>
              <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
            </section>
          </div>

          <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
            <ResetConfirmDialog
              onConfirm={() => {
                resetSettings()
                logger.logSettingsChanged({ action: 'reset_to_defaults' })
                setMobileMenuOpen(false)
              }}
              trigger={
                <Button variant="outline" className="w-full h-10 text-sm font-medium">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              }
            />
            <Button
              variant="outline"
              className="w-full h-10 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile: Controls + Issues panel (hidden when viewing graph) */}
        {!mobileShowGraph && (
          <div className="lg:hidden flex-1 flex flex-col overflow-hidden bg-background">
            <div className="border-b border-border p-2 flex-shrink-0 bg-card/50">
              <InputMeterSlider
                value={settings.inputGainDb}
                onChange={(v) => handleSettingsChange({ inputGainDb: v })}
                level={inputLevel}
                compact
              />
            </div>
            <div className="border-b border-border p-3 flex-shrink-0 bg-card/50 overflow-y-auto max-h-48">
              <DetectionControls />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Active Issues</span>
                <span className="text-primary font-mono">{advisories.length}</span>
              </h2>
              <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
            </div>
          </div>
        )}

        {/* Desktop: Always-visible left sidebar */}
        <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 border-r border-border bg-card/50 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-border p-3 overflow-y-auto max-h-96">
            <DetectionControls />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between sticky top-0 bg-card/50 py-1 z-10">
              <span>Active Issues</span>
              <span className="text-primary font-mono">{advisories.length}</span>
            </h2>
            <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
          </div>
        </aside>

        {/* Graph area — full width on mobile (when mobileShowGraph), right panel on desktop */}
        <main className={`flex-1 flex flex-col overflow-hidden min-w-0 ${mobileShowGraph ? 'flex' : 'hidden lg:flex'}`}>

          {/* Top: Large active graph (~60% height) */}
          <div className="flex-[3] min-h-0 p-1.5 sm:p-2 md:p-3 pb-0.5 sm:pb-1">
            <div className="h-full bg-card/60 rounded-lg border border-border overflow-hidden flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20 gap-2">
                <div className="flex items-center gap-1">
                  {GRAPH_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      onClick={() => setActiveGraph(chip.value)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                        activeGraph === chip.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono whitespace-nowrap flex-shrink-0">
                  {isRunning && spectrum?.noiseFloorDb != null
                    ? `${spectrum.noiseFloorDb.toFixed(0)}dB`
                    : 'Ready'}
                </span>
              </div>
              <div className="relative flex-1 min-h-0">
                <div className={`absolute inset-0 transition-opacity duration-200 ${activeGraph === 'rta' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <SpectrumCanvas spectrum={spectrum} advisories={advisories} isRunning={isRunning} graphFontSize={settings.graphFontSize} />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-200 ${activeGraph === 'geq' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <GEQBarView advisories={advisories} graphFontSize={settings.graphFontSize} />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-200 ${activeGraph === 'waterfall' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <WaterfallCanvas spectrum={spectrum} isRunning={isRunning} graphFontSize={settings.graphFontSize} />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile graph pill switcher */}
          <div className="flex sm:hidden items-center gap-2 px-2 pb-1.5 pt-0.5 flex-shrink-0">
            {GRAPH_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveGraph(chip.value)}
                className={`flex-1 py-1.5 rounded-full text-[10px] font-medium border transition-colors ${
                  activeGraph === chip.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Bottom row: GEQ + Waterfall always visible (~40% height), tablet and up */}
          <div className="hidden sm:flex flex-[2] min-h-0 gap-1.5 md:gap-2 p-1.5 md:p-3 pt-0.5 md:pt-1">
            <div className="flex-1 bg-card/60 rounded-lg border border-border overflow-hidden flex flex-col min-w-0">
              <div className="flex-shrink-0 px-2 py-1 border-b border-border bg-muted/20">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">GEQ</span>
              </div>
              <div className="flex-1 min-h-0 pointer-events-none">
                <GEQBarView advisories={advisories} graphFontSize={Math.max(10, settings.graphFontSize - 4)} />
              </div>
            </div>
            <div className="flex-1 bg-card/60 rounded-lg border border-border overflow-hidden flex flex-col min-w-0">
              <div className="flex-shrink-0 px-2 py-1 border-b border-border bg-muted/20">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Waterfall</span>
              </div>
              <div className="flex-1 min-h-0 pointer-events-none">
                <WaterfallCanvas spectrum={spectrum} isRunning={isRunning} graphFontSize={Math.max(10, settings.graphFontSize - 4)} />
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
