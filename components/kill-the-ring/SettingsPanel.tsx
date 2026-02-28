'use client'

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
import { Settings, RotateCcw, HelpCircle, BarChart3, Monitor, Download, FileJson, FileText, Sheet, Trash2 } from 'lucide-react'
import { getEventLogger, type LogEntry, type FeedbackIssueLog } from '@/lib/logging/eventLogger'
import type { DetectorSettings } from '@/types/advisory'

interface SettingsPanelProps {
  settings: DetectorSettings
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  onReset: () => void
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onReset,
}: SettingsPanelProps) {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-1.5 text-xs">
              <Monitor className="w-3.5 h-3.5" />
              Display
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Export
              {issueLogs.length > 0 && (
                <span className="ml-1 px-1 py-px bg-primary/20 text-primary text-[9px] rounded-full font-medium leading-none">
                  {issueLogs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4 space-y-5">
            <Section 
              title="FFT Size" 
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
              title="Harmonic Tolerance"
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

          </TabsContent>

          <TabsContent value="display" className="mt-4 space-y-5">
            <Section 
              title="Graph Label Size" 
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

          <TabsContent value="export" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
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
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface SectionProps {
  title: string
  tooltip?: string
  children: React.ReactNode
}

function Section({ title, tooltip, children }: SectionProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {tooltip && (
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

