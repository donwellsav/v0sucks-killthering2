'use client'

// Kill The Ring main component
import { useEffect, useState, useCallback } from 'react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { useAdvisoryLogging } from '@/hooks/useAdvisoryLogging'
import { IssuesList } from './IssuesList'
import { SpectrumCanvas } from './SpectrumCanvas'
import { GEQBarView } from './GEQBarView'
import { WaterfallCanvas } from './WaterfallCanvas'
import { SettingsPanel } from './SettingsPanel'
import { HelpMenu } from './HelpMenu'
import { InputMeterSlider } from './InputMeterSlider'
import { LogsViewer } from './LogsViewer'
import { AIChatPanel } from './AIChatPanel'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { HelpCircle, Menu, X, Target, Music, Zap, Settings2, Radio } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { OperationMode } from '@/types/advisory'
import type { AgentSettings } from '@/types/agent'
import { DEFAULT_AGENT_SETTINGS } from '@/types/agent'
import { OPERATION_MODES } from '@/lib/dsp/constants'
import { getEventLogger } from '@/lib/logging/eventLogger'

type GraphView = 'rta' | 'geq' | 'waterfall'

const GRAPH_LABELS: Record<GraphView, string> = {
  rta: 'RTA Spectrum',
  geq: '31-Band GEQ',
  waterfall: 'Waterfall',
}

const MODE_CHIPS = [
  { value: 'feedbackHunt' as OperationMode, label: 'Feedback Hunt', shortLabel: 'Hunt', icon: <Target className="w-3 h-3" /> },
  { value: 'vocalRing'    as OperationMode, label: 'Vocal Ring',    shortLabel: 'Vocal', icon: <Radio className="w-3 h-3" /> },
  { value: 'musicAware'   as OperationMode, label: 'Music-Aware',   shortLabel: 'Music', icon: <Music className="w-3 h-3" /> },
  { value: 'aggressive'   as OperationMode, label: 'Aggressive',    shortLabel: 'Aggro', icon: <Zap className="w-3 h-3" /> },
  { value: 'calibration'  as OperationMode, label: 'Calibration',   shortLabel: 'Cal',   icon: <Settings2 className="w-3 h-3" /> },
]

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

  const [activeGraph, setActiveGraph] = useState<GraphView>('rta')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS)

  const logger = getEventLogger()

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Log when analysis starts
  useEffect(() => {
    if (isRunning) {
      logger.logAnalysisStarted({
        mode: settings.mode,
        fftSize: settings.fftSize,
      })
    } else {
      logger.logAnalysisStopped()
    }
  }, [isRunning, settings.mode, settings.fftSize, logger])

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
    logger.logSettingsChanged(newSettings)
  }, [updateSettings, logger])

  const handleResetSettings = () => {
    resetSettings()
    logger.logSettingsChanged({ action: 'reset_to_defaults' })
  }

  const handleAgentSettingsChange = useCallback((newSettings: Partial<AgentSettings>) => {
    setAgentSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const inputLevel = spectrum?.peak ?? -60

  // The two graphs that appear in the small bottom row (everything except active)
  const smallGraphs = (['rta', 'geq', 'waterfall'] as GraphView[]).filter(g => g !== activeGraph)

  // Shared detection controls — used in both sidebar and mobile overlay
  const DetectionControls = () => (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-3">
        {/* Mode chips */}
        <div className="flex flex-wrap gap-1">
          {MODE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => handleModeChange(chip.value)}
              title={chip.label}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all border',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                settings.mode === chip.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              )}
            >
              {chip.icon}
              <span className="hidden xl:inline">{chip.label}</span>
              <span className="xl:hidden">{chip.shortLabel}</span>
            </button>
          ))}
        </div>

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
      {/* Header */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm gap-2 sm:gap-4">

        {/* Left: Logo — doubles as start/stop button */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2.5 pl-2 sm:pl-3 border-l border-border/50">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={isRunning ? stop : start}
                    aria-label={isRunning ? 'Stop analysis' : 'Start analysis'}
                    className="relative w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                  >
                    {/* Static border ring */}
                    <div className={`absolute inset-0 rounded-full border transition-colors duration-300 ${isRunning ? 'border-primary' : 'border-primary/60'}`} />
                    {/* Pulsing ring — only when running */}
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

        {/* Center: Gain meter — desktop only */}
        <div className="hidden md:flex items-center justify-center flex-1 sm:flex-none min-w-0">
          <InputMeterSlider
            value={settings.inputGainDb}
            onChange={(v) => handleSettingsChange({ inputGainDb: v })}
            level={inputLevel}
          />
        </div>

        {/* Right: Info + Actions + Hamburger */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-shrink-0">
          <span className="font-mono text-[9px] sm:text-[10px] hidden lg:inline">
            {fftSize}pt @ {(sampleRate / 1000).toFixed(1)}kHz
          </span>
          {noiseFloorDb !== null && (
            <span className="font-mono text-[9px] sm:text-[10px] hidden lg:inline">
              Floor: {noiseFloorDb.toFixed(0)}dB
            </span>
          )}

          {/* These are icon-only on mobile */}
          <AIChatPanel
            advisories={advisories}
            settings={settings}
            isRunning={isRunning}
            agentSettings={agentSettings}
          />
          <LogsViewer />
          <HelpMenu />
          <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onReset={handleResetSettings}
            agentSettings={agentSettings}
            onAgentSettingsChange={handleAgentSettingsChange}
          />

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>

          {/* Mobile hamburger — right side */}
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

      {/* Mobile full-screen overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Controls menu"
        >
          {/* Overlay header bar */}
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

          {/* Scrollable overlay content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Input Gain section */}
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

            {/* Detection controls section */}
            <section>
              <DetectionControls />
            </section>

            <div className="border-t border-border" />

            {/* Active Issues section */}
            <section>
              <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Active Issues</span>
                <span className="text-primary font-mono">{advisories.length}</span>
              </h2>
              <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
            </section>
          </div>

          {/* Overlay footer: close button */}
          <div className="flex-shrink-0 border-t border-border p-4">
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

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — desktop only, collapsible */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 border-r border-border overflow-y-auto bg-card/50 flex-col">
            <div className="p-3 border-b border-border space-y-3">
              <DetectionControls />
            </div>

            <div className="p-3">
              <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Active Issues</span>
                <span className="text-primary font-mono">{advisories.length}</span>
              </h2>
              <IssuesList advisories={advisories} maxIssues={settings.maxDisplayedIssues} />
            </div>
          </aside>
        )}

        {/* Main Visualization Area */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Large Panel */}
          <div className="flex-1 min-h-0 p-1.5 sm:p-2 md:p-3 pb-1 sm:pb-1.5">
            <div className="h-full bg-card/60 rounded-lg border border-border overflow-hidden">
              {/* Panel header with graph switcher */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20 gap-2">
                <div className="flex items-center gap-1">
                  {(['rta', 'geq', 'waterfall'] as GraphView[]).map((graph) => (
                    <button
                      key={graph}
                      onClick={() => setActiveGraph(graph)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        activeGraph === graph
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground hover:border-border'
                      )}
                    >
                      {GRAPH_LABELS[graph]}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                  {isRunning && spectrum?.noiseFloorDb != null
                    ? `${spectrum.noiseFloorDb.toFixed(0)}dB`
                    : 'Ready'}
                </span>
              </div>

              {/* Graph area with crossfade */}
              <div className="relative h-[calc(100%-24px)]">
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

          {/* Mobile graph pill switcher — below main canvas, hidden on sm+ */}
          <div className="flex sm:hidden items-center gap-2 px-2 pb-1.5 pt-0.5">
            {(['rta', 'geq', 'waterfall'] as GraphView[]).map((graph) => (
              <button
                key={graph}
                onClick={() => setActiveGraph(graph)}
                className={`flex-1 py-1.5 rounded-full text-[10px] font-medium border transition-colors ${
                  activeGraph === graph
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {graph === 'rta' ? 'RTA' : graph === 'geq' ? 'GEQ' : 'WTF'}
              </button>
            ))}
          </div>

          {/* Bottom Row — the two non-active graphs — desktop/tablet only */}
          <div className="hidden sm:flex gap-1.5 md:gap-3 p-1.5 md:p-3 pt-1 md:pt-1.5 h-40 sm:h-48 md:h-56">
            {smallGraphs.map((graph) => (
              <button
                key={graph}
                onClick={() => setActiveGraph(graph)}
                className="flex-1 bg-card/60 rounded-lg border border-border overflow-hidden text-left hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center justify-between px-1.5 sm:px-2 py-1 border-b border-border bg-muted/20">
                  <span className="text-[8px] sm:text-[10px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {GRAPH_LABELS[graph]}
                  </span>
                  <span className="text-[7px] sm:text-[9px] text-muted-foreground/60 group-hover:text-primary/60 transition-colors whitespace-nowrap ml-1">
                    click
                  </span>
                </div>
                <div className="h-[calc(100%-20px)] pointer-events-none">
                  {graph === 'rta' && <SpectrumCanvas spectrum={spectrum} advisories={advisories} isRunning={isRunning} graphFontSize={settings.graphFontSize} />}
                  {graph === 'geq' && <GEQBarView advisories={advisories} graphFontSize={settings.graphFontSize} />}
                  {graph === 'waterfall' && <WaterfallCanvas spectrum={spectrum} isRunning={isRunning} graphFontSize={settings.graphFontSize} />}
                </div>
              </button>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}
