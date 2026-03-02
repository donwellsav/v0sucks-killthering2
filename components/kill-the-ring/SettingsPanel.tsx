'use client'
// BUILD v3.1 - advisories prop correctly wired, FrequencyBandControls removed
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResetConfirmDialog } from './ResetConfirmDialog'
import { MicPresets } from './MicPresets'
import { ABComparison } from './ABComparison'

import { SessionRecorderContent } from './SessionRecorder'
import { ParametricEQExportContent } from './ParametricEQExport'
import { Settings, RotateCcw, HelpCircle, BarChart3, Monitor, Download, FileJson, FileText, Sheet, Trash2, Cpu, Mic, ToggleLeft } from 'lucide-react'
import { ALGORITHM_MODES } from '@/lib/dsp/constants'
import type { AlgorithmMode, Advisory } from '@/types/advisory'
import { getEventLogger, type LogEntry, type FeedbackIssueLog } from '@/lib/logging/eventLogger'
import type { DetectorSettings } from '@/types/advisory'

interface SettingsPanelProps {
  settings: DetectorSettings
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  onReset: () => void
  isRunning?: boolean
  advisories?: Advisory[]
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onReset,
  isRunning = false,
  advisories = [],
}: SettingsPanelProps) {
  // Settings panel state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logger = getEventLogger()

  useEffect(() => {
    setLogs(logger.getLogs())
    const unsubscribe = logger.subscribe((updated) => setLogs(updated))
    return unsubscribe
  }, [logger])

  const handleExport = (format: 'csv' | 'json' | 'text') => {
    let content = ''
    let filename = `kill-the-ring-logs_${new Date().toISOString().split('T')[0]}`
    let mimeType = 'text/plain'
    switch (format) {
      case 'csv':  content = logger.exportAsCSV();  filename += '.csv';  mimeType = 'text/csv'; break
      case 'json': content = logger.exportAsJSON(); filename += '.json'; mimeType = 'application/json'; break
      case 'text': content = logger.exportAsText(); filename += '.txt';  mimeType = 'text/plain'; break
    }
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    logger.logExport(format, logs.length)
  }

  const handleClearLogs = () => {
    if (confirm('Clear all logs? This cannot be undone.')) logger.clearLogs()
  }

  const issueLogs = logs.filter(l => l.type === 'issue_detected')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" aria-label="Settings">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Advanced Settings
          </DialogTitle>
          <DialogDescription className="text-xs">
            Analysis engine, display preferences, and log export.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="analysis" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analysis" className="gap-1 text-xs px-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="algorithms" className="gap-1 text-xs px-2">
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Algo</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-1 text-xs px-2">
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Display</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1 text-xs px-2">
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1 text-xs px-2">
              <Download className="w-3.5 h-3.5" />
              {issueLogs.length > 0 && (
                <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {issueLogs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4 space-y-5">
            <Section 
              title="FFT Size" 
              showTooltip={settings.showTooltips}
              tooltip="Controls frequency resolution vs response time. Higher FFT = better precision for low frequencies but slower updates. 4096 for fast response, 8192 for balanced PA use, 16384 for precise low-end analysis."
            >
              <Select
                value={settings.fftSize.toString()}
                onValueChange={(v) =>
                  onSettingsChange({ fftSize: parseInt(v) as 4096 | 8192 | 16384 })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4096">4096 - Fast (~12Hz res @ 48kHz)</SelectItem>
                  <SelectItem value="8192">8192 - Balanced (~6Hz res)</SelectItem>
                  <SelectItem value="16384">16384 - High Res (~3Hz res)</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Section 
              title="Spectrum Smoothing" 
              showTooltip={settings.showTooltips}
              tooltip="Averages spectral frames to reduce visual noise. 0-30% for detailed analysis, 50-70% for general use, 80%+ for presentation. Lower values show faster transients but more jitter."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-xs font-mono">{(settings.smoothingTimeConstant * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.smoothingTimeConstant]}
                  onValueChange={([v]) => onSettingsChange({ smoothingTimeConstant: v })}
                  min={0}
                  max={0.95}
                  step={0.05}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Raw</span>
                  <span>Smooth</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Hold Time" 
              showTooltip={settings.showTooltips}
              tooltip="How long detected issues stay visible after disappearing from spectrum. Longer times help reference issues while making EQ cuts. 1-2s for fast workflow, 3-4s for careful tuning."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="text-xs font-mono">{(settings.holdTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  value={[settings.holdTimeMs]}
                  onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
                  min={500}
                  max={5000}
                  step={250}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Quick</span>
                  <span>Long Hold</span>
                </div>
              </div>
            </Section>

            <Section
              title="A-Weighting"
              showTooltip={settings.showTooltips}
              tooltip="Applies IEC 61672-1 A-weighting curve to match human hearing sensitivity. Reduces low-frequency emphasis (below ~500Hz is attenuated). Enable for perceived-loudness analysis; disable for flat-response detection of all feedback regardless of audibility."
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Apply A-weighting curve</span>
                <button
                  role="switch"
                  aria-checked={settings.aWeightingEnabled}
                  onClick={() => onSettingsChange({ aWeightingEnabled: !settings.aWeightingEnabled })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    settings.aWeightingEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                    settings.aWeightingEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </Section>

            <Section
              title="Harmonic Tolerance"
              showTooltip={settings.showTooltips}
              tooltip="Cents window used when matching overtones and sub-harmonics. Tighten for calibration in controlled rooms (25–35¢). Widen for live performance with reverb or temperature drift (65–100¢). Default 50¢ = half a semitone."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Window</span>
                  <span className="text-xs font-mono">{settings.harmonicToleranceCents}¢</span>
                </div>
                <Slider
                  value={[settings.harmonicToleranceCents]}
                  onValueChange={([v]) => onSettingsChange({ harmonicToleranceCents: v })}
                  min={25}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Tight (calibration)</span>
                  <span>Wide (live)</span>
                </div>
              </div>
            </Section>

            <Section
              title="Confidence Threshold"
              showTooltip={settings.showTooltips}
              tooltip="Minimum confidence to display. LOWER = more alerts (better to catch everything). HIGHER = fewer alerts (may miss real feedback). 55% is aggressive - better safe than sorry!"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Min. Confidence</span>
                  <span className="text-xs font-mono">{Math.round((settings.confidenceThreshold ?? 0.40) * 100)}%</span>
                </div>
                <Slider
                  value={[(settings.confidenceThreshold ?? 0.40) * 100]}
                  onValueChange={([v]) => onSettingsChange({ confidenceThreshold: v / 100 })}
                  min={40}
                  max={90}
                  step={5}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Catch everything</span>
                  <span>High confidence only</span>
                </div>
              </div>
            </Section>

            <Section
              title="Room Acoustics"
              showTooltip={settings.showTooltips}
              tooltip="Room parameters for automatic frequency-dependent thresholds. The Schroeder frequency (f_S = 2000√(T/V)) determines where room modes dominate. Select a preset or use Custom for manual control."
            >
              <div className="space-y-3">
                {/* Room Preset Selector */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Room Size Preset</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['small', 'medium', 'large', 'custom'] as const).map((preset) => {
                      const presetLabels = {
                        small: 'Small',
                        medium: 'Medium',
                        large: 'Large',
                        custom: 'Custom',
                      }
                      const presetDescriptions = {
                        small: '10-20 people',
                        medium: '20-50 people',
                        large: '50-200 people',
                        custom: 'Manual',
                      }
                      const isSelected = (settings.roomPreset ?? 'medium') === preset
                      return (
                        <button
                          key={preset}
                          onClick={() => {
                            if (preset === 'custom') {
                              onSettingsChange({ roomPreset: 'custom' })
                            } else {
                              // AGGRESSIVE thresholds - better false positives than missing feedback!
                              const presetValues = {
                                small: { roomRT60: 0.5, roomVolume: 80, feedbackThresholdDb: 5, ringThresholdDb: 3 },
                                medium: { roomRT60: 0.7, roomVolume: 250, feedbackThresholdDb: 6, ringThresholdDb: 4 },
                                large: { roomRT60: 1.0, roomVolume: 1000, feedbackThresholdDb: 7, ringThresholdDb: 5 },
                              }[preset]
                              onSettingsChange({ roomPreset: preset, ...presetValues })
                            }
                          }}
                          className={`flex flex-col items-start px-2 py-1.5 rounded-md text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/20 border border-primary/50 text-primary'
                              : 'bg-muted/50 border border-transparent hover:bg-muted'
                          }`}
                        >
                          <span className="text-xs font-medium">{presetLabels[preset]}</span>
                          <span className="text-[9px] text-muted-foreground">{presetDescriptions[preset]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Manual controls - only show for Custom preset */}
                {(settings.roomPreset ?? 'medium') === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">RT60 (reverb time)</span>
                        <span className="text-xs font-mono">{(settings.roomRT60 ?? 0.7).toFixed(1)}s</span>
                      </div>
                      <Slider
                        value={[(settings.roomRT60 ?? 0.7) * 10]}
                        onValueChange={([v]) => onSettingsChange({ roomRT60: v / 10 })}
                        min={3}
                        max={30}
                        step={1}
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Dead (studio)</span>
                        <span>Live (cathedral)</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Room Volume</span>
                        <span className="text-xs font-mono">{settings.roomVolume ?? 250}m��</span>
                      </div>
                      <Slider
                        value={[settings.roomVolume ?? 250]}
                        onValueChange={([v]) => onSettingsChange({ roomVolume: v })}
                        min={50}
                        max={5000}
                        step={50}
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Small room</span>
                        <span>Large venue</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Schroeder frequency display */}
                <div className="text-[9px] text-muted-foreground bg-muted/50 rounded px-2 py-1 flex justify-between">
                  <span>Schroeder freq:</span>
                  <span className="font-mono">{Math.round(2000 * Math.sqrt((settings.roomRT60 ?? 0.7) / (settings.roomVolume ?? 250)))}Hz</span>
                </div>
              </div>
            </Section>

          </TabsContent>

          {/* ==================== ALGORITHMS TAB ==================== */}
          <TabsContent value="algorithms" className="mt-4 space-y-5">
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-4">
              <p className="text-xs text-primary font-medium">Advanced Detection Algorithms</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Based on DAFx-16, DBX, and KU Leuven research. These algorithms dramatically reduce false positives and improve detection accuracy.
              </p>
            </div>

            <Section
              title="Algorithm Mode"
              showTooltip={settings.showTooltips}
              tooltip="Select which detection algorithms to use. 'MSD' (Magnitude Slope Deviation) is recommended - 100% accuracy for speech per DAFx-16. Note: Phase coherence is disabled (Web Audio API limitation)."
            >
              <div className="space-y-2">
                {(Object.keys(ALGORITHM_MODES) as AlgorithmMode[]).map((mode) => {
                  const info = ALGORITHM_MODES[mode]
                  const isSelected = (settings.algorithmMode ?? 'msd') === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => onSettingsChange({ algorithmMode: mode })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/20 border border-primary/50 text-primary'
                          : 'bg-muted/50 border border-transparent hover:bg-muted'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-medium">{info.label}</span>
                        <p className="text-[9px] text-muted-foreground">{info.description}</p>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-medium text-primary">ACTIVE</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section
              title="MSD History Buffer"
              showTooltip={settings.showTooltips}
              tooltip="Number of frames for Magnitude Slope Deviation analysis. More frames = higher accuracy but slower detection. 7-15 for speech, 15-30 for music, 30+ for compressed content."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Frames</span>
                  <span className="text-xs font-mono">{settings.msdMinFrames ?? 7}</span>
                </div>
                <Slider
                  value={[settings.msdMinFrames ?? 7]}
                  onValueChange={([v]) => onSettingsChange({ msdMinFrames: v })}
                  min={7}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Fast (speech)</span>
                  <span>Accurate (music)</span>
                </div>
              </div>
            </Section>

            {/* Phase Coherence Section - DISABLED
                Web Audio API AnalyserNode.getFloatFrequencyData() only returns magnitude, not phase.
                The phase buffer exists but is never populated. Kept for future AudioWorklet implementation.
            */}
            <Section
              title="Phase Coherence (Disabled)"
              showTooltip={settings.showTooltips}
              tooltip="DISABLED: Web Audio API doesn't provide phase data. This feature requires AudioWorklet implementation for future support."
            >
              <div className="space-y-2 opacity-50 pointer-events-none">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Threshold</span>
                  <span className="text-xs font-mono">{((settings.phaseCoherenceThreshold ?? 0.75) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[(settings.phaseCoherenceThreshold ?? 0.75) * 100]}
                  onValueChange={([v]) => onSettingsChange({ phaseCoherenceThreshold: v / 100 })}
                  min={40}
                  max={95}
                  step={5}
                  disabled
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Not Available</span>
                  <span>Web Audio API Limitation</span>
                </div>
              </div>
            </Section>

            <Section
              title="Fusion Feedback Threshold"
              showTooltip={settings.showTooltips}
              tooltip="Combined algorithm probability threshold for positive feedback detection. Lower = more alerts, Higher = fewer but more confident alerts."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Threshold</span>
                  <span className="text-xs font-mono">{((settings.fusionFeedbackThreshold ?? 0.55) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[(settings.fusionFeedbackThreshold ?? 0.55) * 100]}
                  onValueChange={([v]) => onSettingsChange({ fusionFeedbackThreshold: v / 100 })}
                  min={40}
                  max={90}
                  step={5}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Catch all</span>
                  <span>High confidence</span>
                </div>
              </div>
            </Section>

            <Section
              title="Detection Features"
              showTooltip={settings.showTooltips}
              tooltip="Enable/disable specific detection features. Compression detection adapts thresholds for dynamically compressed content. Comb pattern identifies feedback from acoustic paths."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-foreground">Compression Detection</span>
                    <p className="text-[9px] text-muted-foreground">Adapts thresholds for compressed music</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.enableCompressionDetection ?? true}
                    onClick={() => onSettingsChange({ enableCompressionDetection: !(settings.enableCompressionDetection ?? true) })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      (settings.enableCompressionDetection ?? true) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                      (settings.enableCompressionDetection ?? true) ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-foreground">Comb Pattern Detection</span>
                    <p className="text-[9px] text-muted-foreground">Identifies feedback acoustic paths</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.enableCombPatternDetection ?? true}
                    onClick={() => onSettingsChange({ enableCombPatternDetection: !(settings.enableCombPatternDetection ?? true) })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      (settings.enableCombPatternDetection ?? true) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                      (settings.enableCombPatternDetection ?? true) ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </Section>

            <Section
              title="Display Options"
              showTooltip={settings.showTooltips}
              tooltip="Show detailed algorithm scores and phase visualization in the UI. Useful for debugging and understanding detection decisions."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-foreground">Show Algorithm Scores</span>
                    <p className="text-[9px] text-muted-foreground">Display MSD, Phase, Spectral scores</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.showAlgorithmScores ?? false}
                    onClick={() => onSettingsChange({ showAlgorithmScores: !(settings.showAlgorithmScores ?? false) })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      (settings.showAlgorithmScores ?? false) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                      (settings.showAlgorithmScores ?? false) ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-foreground">Show Phase Display</span>
                    <p className="text-[9px] text-muted-foreground">Visualize phase coherence</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.showPhaseDisplay ?? false}
                    onClick={() => onSettingsChange({ showPhaseDisplay: !(settings.showPhaseDisplay ?? false) })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      (settings.showPhaseDisplay ?? false) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                      (settings.showPhaseDisplay ?? false) ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </Section>

            <div className="bg-muted/50 rounded-md p-3 text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Algorithm Summary:</p>
              <ul className="space-y-1">
                <li><strong>MSD</strong>: Magnitude Slope Deviation - feedback grows linearly in dB</li>
                <li><strong>Phase</strong>: Phase coherence - feedback maintains constant phase</li>
                <li><strong>Spectral</strong>: Flatness + kurtosis - feedback is a pure tone</li>
                <li><strong>Comb</strong>: Pattern detection - feedback occurs at regular intervals</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="display" className="mt-4 space-y-5">
            <Section
              title="Tooltips"
              showTooltip={settings.showTooltips}
              tooltip="Show contextual help on sliders and controls. Disable once you know the system."
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Show help tooltips</span>
                <button
                  role="switch"
                  aria-checked={settings.showTooltips}
                  onClick={() => onSettingsChange({ showTooltips: !settings.showTooltips })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    settings.showTooltips ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform ${
                    settings.showTooltips ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </Section>
            <Section 
              title="Graph Label Size" 
              showTooltip={settings.showTooltips}
              tooltip="Font size for frequency, dB, and annotation labels inside the RTA, GEQ, and Waterfall graphs. Increase for high-DPI displays or viewing from a distance."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Size</span>
                  <span className="text-xs font-mono">{settings.graphFontSize}px</span>
                </div>
                <Slider
                  value={[settings.graphFontSize]}
                  onValueChange={([v]) => onSettingsChange({ graphFontSize: v })}
                  min={8}
                  max={26}
                  step={1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Max Issues Shown" 
              showTooltip={settings.showTooltips}
              tooltip="Limits how many feedback issues display at once. Default is 6 for focused work on worst problems; increase up to 12 for full system overview during calibration."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Limit</span>
                  <span className="text-xs font-mono">{settings.maxDisplayedIssues}</span>
                </div>
                <Slider
                  value={[settings.maxDisplayedIssues]}
                  onValueChange={([v]) => onSettingsChange({ maxDisplayedIssues: v })}
                  min={3}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Focused</span>
                  <span>All Issues</span>
                </div>
              </div>
            </Section>

            <Section 
              title="EQ Recommendation Style" 
              showTooltip={settings.showTooltips}
              tooltip="Surgical: narrow Q (8-16), deep cuts for precise feedback removal. Heavy: wider Q (2-4), moderate cuts for broader tonal shaping and room mode control."
            >
              <Select
                value={settings.eqPreset}
                onValueChange={(v) => onSettingsChange({ eqPreset: v as 'surgical' | 'heavy' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">Surgical - Narrow Q, Deep Cuts</SelectItem>
                  <SelectItem value="heavy">Heavy - Wide Q, Moderate Cuts</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <div className="pt-3 border-t border-border">
              <ResetConfirmDialog
                onConfirm={onReset}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reset to PA Defaults
                  </Button>
                }
              />
              <p className="text-[9px] text-muted-foreground text-center mt-2">
                Restores aggressive detection for corporate/conference PA
              </p>
            </div>
          </TabsContent>

          {/* Tools Tab - Mic Presets, A/B Comparison, Frequency Band Controls */}
          <TabsContent value="tools" className="mt-4 space-y-5">
            <MicPresets
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
            
            <ABComparison
              currentSettings={settings}
              onApplySettings={onSettingsChange}
            />
            
            {/* Session Recorder inline */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Session Recorder</p>
              <SessionRecorderContent
                isRunning={isRunning}
                settings={settings as Record<string, unknown>}
              />
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-4 space-y-4">
            {/* Parametric EQ Export inline */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Parametric EQ Export</p>
              <ParametricEQExportContent advisories={advisories} />
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {logs.length} event{logs.length !== 1 ? 's' : ''} &bull; {issueLogs.length} issue{issueLogs.length !== 1 ? 's' : ''} detected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLogs}
                  className="text-destructive hover:text-destructive h-7 text-xs gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              </div>

            <div className="space-y-2">
              {(
                [
                  { format: 'csv'  as const, label: 'CSV',        desc: 'Open in Excel or Sheets for analysis',           icon: <Sheet    className="w-4 h-4" /> },
                  { format: 'json' as const, label: 'JSON',       desc: 'Complete data structure for programmatic use',   icon: <FileJson className="w-4 h-4" /> },
                  { format: 'text' as const, label: 'Plain Text', desc: 'Human-readable formatted report',                icon: <FileText className="w-4 h-4" /> },
                ] as const
              ).map(({ format, label, desc, icon }) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={logs.length === 0}
                  className="w-full flex items-start gap-3 p-3 border border-border rounded-md hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                >
                  <div className="mt-0.5 text-muted-foreground">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
              Logs are stored in memory for this session. Export before closing the tab.
            </p>
            </div>{/* end border-t wrapper */}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface SectionProps {
  title: string
  tooltip?: string
  showTooltip?: boolean
  children: React.ReactNode
}

function Section({ title, tooltip, showTooltip = true, children }: SectionProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {tooltip && showTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {children}
      </div>
    </TooltipProvider>
  )
}

