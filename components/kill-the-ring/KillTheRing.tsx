'use client'

import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Mic, MicOff, HelpCircle, Menu, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'
import { getEventLogger } from '@/lib/logging/eventLogger'

type GraphView = 'rta' | 'geq' | 'waterfall'

const GRAPH_LABELS: Record<GraphView, string> = {
  rta: 'RTA Spectrum',
  geq: '31-Band GEQ',
  waterfall: 'Waterfall',
}

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

  const logger = getEventLogger()

  // Apply GUI font size to html element so all rem-based Tailwind sizes scale with it
  useEffect(() => {
    const size = settings.guiFontSize ?? 18
    document.documentElement.style.setProperty('--gui-font-size', `${size}px`)
    document.documentElement.style.fontSize = `${size}px`
  }, [settings.guiFontSize])

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

  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    updateSettings(newSettings)
    logger.logSettingsChanged(newSettings)
  }

  const handleResetSettings = () => {
    resetSettings()
    logger.logSettingsChanged({ action: 'reset_to_defaults' })
  }

  const inputLevel = spectrum?.peak ?? -60

  // The two graphs that appear in the small bottom row (everything except active)
  const smallGraphs = (['rta', 'geq', 'waterfall'] as GraphView[]).filter(g => g !== activeGraph)

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm gap-2 sm:gap-4">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden flex-shrink-0"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        {/* Left: Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2.5 pl-2 sm:pl-3 border-l border-border/50">
            <div className="relative w-6 sm:w-7 h-6 sm:h-7 flex items-center justify-center flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-1.5 border-primary/60" />
              <svg className="w-3 sm:w-4 h-3 sm:h-4 relative z-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.31-2.5-4.06v8.12c1.48-.75 2.5-2.29 2.5-4.06zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </div>
            
            <div className="flex flex-col gap-0.5 hidden sm:flex">
              <div className="leading-none">
                <span className="text-sm font-black tracking-tight text-foreground">KILL THE </span>
                <span className="text-sm font-black tracking-tight text-primary">RING</span>
              </div>
              <span className="text-[7.5px] font-semibold tracking-widest text-muted-foreground uppercase">Don Wells AV</span>
            </div>
          </div>
        </div>

        {/* Center: Start + Meter + Mode - Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap justify-center flex-1 sm:flex-none min-w-0">
          <Button
            onClick={isRunning ? stop : start}
            variant={isRunning ? 'destructive' : 'default'}
            size="sm"
            className="h-7 px-2 sm:px-3 text-xs font-medium flex-shrink-0"
          >
            {isRunning ? (
              <><MicOff className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-0 sm:mr-1.5" /><span className="hidden sm:inline">Stop</span></>
            ) : (
              <><Mic className="w-3 sm:w-3.5 h-3 sm:h-3.5 mr-0 sm:mr-1.5" /><span className="hidden sm:inline">Start</span></>
            )}
          </Button>

          {isRunning && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary font-medium hidden sm:inline">LIVE</span>
            </div>
          )}

          <div className="hidden md:block">
            <InputMeterSlider
              value={settings.inputGainDb}
              onChange={(v) => handleSettingsChange({ inputGainDb: v })}
              level={inputLevel}
            />
          </div>

          <Select value={settings.mode} onValueChange={(v) => handleModeChange(v as OperationMode)}>
            <SelectTrigger className="h-7 w-auto sm:w-44 text-xs bg-input border-border">
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
        </div>

        {/* Right: Info + Actions - Responsive */}
        <div className="flex items-center gap-1 sm:gap-3 text-xs text-muted-foreground flex-shrink-0">
          <span className="font-mono text-[9px] sm:text-[10px] hidden lg:inline">
            {fftSize}pt @ {(sampleRate / 1000).toFixed(1)}kHz
          </span>
          {noiseFloorDb !== null && (
            <span className="font-mono text-[9px] sm:text-[10px] hidden lg:inline">
              Floor: {noiseFloorDb.toFixed(0)}dB
            </span>
          )}
          <LogsViewer />
          <HelpMenu />
          <SettingsPanel
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onReset={handleResetSettings}
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
        {/* Left Sidebar - Hidden on mobile, collapsible */}
        {sidebarOpen && (
          <aside className="w-full sm:w-64 md:w-72 flex-shrink-0 border-r border-border overflow-y-auto bg-card/50 absolute sm:static inset-0 top-auto z-40 sm:z-auto">
            <TooltipProvider delayDuration={400}>
            <div className="p-3 border-b border-border space-y-3">
              <h2 className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {settings.mode === 'feedbackHunt' ? 'Feedback Hunt' : settings.mode === 'vocalRing' ? 'Vocal Ring' : settings.mode === 'musicAware' ? 'Music-Aware' : settings.mode === 'aggressive' ? 'Aggressive' : 'Calibration'}
              </h2>

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
              <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20 gap-1">
                <Select value={activeGraph} onValueChange={(v) => setActiveGraph(v as GraphView)}>
                  <SelectTrigger className="h-6 w-auto sm:w-32 md:w-44 text-[9px] sm:text-[10px] border-0 bg-transparent p-0 gap-1 font-medium text-foreground focus:ring-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rta" className="text-xs">RTA Spectrum</SelectItem>
                    <SelectItem value="geq" className="text-xs">31-Band GEQ</SelectItem>
                    <SelectItem value="waterfall" className="text-xs">Waterfall</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Bottom Row - the two non-active graphs - Hidden on small screens */}
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


