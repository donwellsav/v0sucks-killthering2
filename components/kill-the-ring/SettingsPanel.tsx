'use client'

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
import { Settings, RotateCcw, HelpCircle, Zap, BarChart3, Monitor } from 'lucide-react'
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
          <span className="text-xs">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Detection Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Fine-tune feedback detection for your PA system. Default settings are optimized for corporate/conference environments.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detection" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detection" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Detection
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              Display
            </TabsTrigger>
          </TabsList>

          {/* DETECTION TAB */}
          <TabsContent value="detection" className="mt-4 space-y-5">
            <Section 
              title="Feedback Threshold" 
              tooltip="Primary sensitivity control. Lower values detect fainter feedback but may increase false positives. Typical ranges: 4-8dB for aggressive detection, 10-14dB for balanced, 16-20dB for conservative."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Sensitivity</span>
                  <span className="text-xs font-mono font-medium">{settings.feedbackThresholdDb}dB</span>
                </div>
                <Slider
                  value={[settings.feedbackThresholdDb]}
                  onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
                  min={2}
                  max={20}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>More Sensitive</span>
                  <span>Less Sensitive</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Ring Threshold" 
              tooltip="Controls detection of resonant peaks that may become feedback. Lower values catch room modes and subtle ring-outs earlier. Typical ranges: 2-4dB for calibration, 5-7dB for normal use, 8-12dB during performance."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Resonance Detection</span>
                  <span className="text-xs font-mono font-medium">{settings.ringThresholdDb}dB</span>
                </div>
                <Slider
                  value={[settings.ringThresholdDb]}
                  onValueChange={([v]) => onSettingsChange({ ringThresholdDb: v })}
                  min={1}
                  max={12}
                  step={0.5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Catch Subtle Rings</span>
                  <span>Only Obvious Rings</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Growth Rate Threshold" 
              tooltip="How fast a frequency must grow to be flagged as potential feedback. Lower values catch feedback earlier in its development. Typical ranges: 0.5-1dB/s for aggressive, 2-3dB/s for balanced, 4-6dB/s for conservative."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Growth Velocity</span>
                  <span className="text-xs font-mono font-medium">{settings.growthRateThreshold.toFixed(1)}dB/s</span>
                </div>
                <Slider
                  value={[settings.growthRateThreshold]}
                  onValueChange={([v]) => onSettingsChange({ growthRateThreshold: v })}
                  min={0.5}
                  max={8}
                  step={0.5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Catch Early</span>
                  <span>Only Runaway</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Music-Aware Mode" 
              tooltip="When enabled, the detector ignores frequencies that appear to be musical content (sustained notes, harmonics). Best used during live performance to reduce false positives. Disable during system tuning for maximum sensitivity."
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Filter musical content</span>
                <Select
                  value={settings.musicAware ? 'enabled' : 'disabled'}
                  onValueChange={(v) => onSettingsChange({ musicAware: v === 'enabled' })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Section>
          </TabsContent>

          {/* ANALYSIS TAB */}
          <TabsContent value="analysis" className="mt-4 space-y-5">
            <Section 
              title="FFT Size" 
              tooltip="Controls frequency resolution vs. time response trade-off. Higher FFT = better frequency precision but slower response. 4096 for fast transients, 8192 for balanced PA use, 16384 for precise low-frequency analysis."
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
                  <SelectItem value="4096">
                    <div className="flex flex-col">
                      <span>4096 - Fast Response</span>
                      <span className="text-[10px] text-muted-foreground">~11.7Hz resolution @ 48kHz</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="8192">
                    <div className="flex flex-col">
                      <span>8192 - Balanced (Recommended)</span>
                      <span className="text-[10px] text-muted-foreground">~5.9Hz resolution @ 48kHz</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="16384">
                    <div className="flex flex-col">
                      <span>16384 - High Resolution</span>
                      <span className="text-[10px] text-muted-foreground">~2.9Hz resolution @ 48kHz</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Section 
              title="Spectrum Smoothing" 
              tooltip="Averages spectral frames to reduce visual noise. Higher values create smoother displays but may hide fast-changing peaks. 0-30% for detailed analysis, 40-60% for general use, 70%+ for presentation displays."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Smoothing Amount</span>
                  <span className="text-xs font-mono font-medium">{(settings.smoothingTimeConstant * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.smoothingTimeConstant]}
                  onValueChange={([v]) => onSettingsChange({ smoothingTimeConstant: v })}
                  min={0}
                  max={0.95}
                  step={0.05}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Raw/Detailed</span>
                  <span>Smooth/Averaged</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Hold Time" 
              tooltip="How long detected issues remain visible after the frequency drops below threshold. Longer hold times help reference issues while making EQ adjustments. 1-2s for fast workflow, 3-4s for careful tuning, 5s for documentation."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Issue Persistence</span>
                  <span className="text-xs font-mono font-medium">{(settings.holdTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <Slider
                  value={[settings.holdTimeMs]}
                  onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
                  min={500}
                  max={5000}
                  step={250}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Quick Clear</span>
                  <span>Long Reference</span>
                </div>
              </div>
            </Section>

            <Section 
              title="Input Gain" 
              tooltip="Digital gain applied to input signal before analysis. Increase if your signal is weak, decrease if you see clipping. Does not affect actual audio output, only analysis sensitivity."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Gain Boost</span>
                  <span className="text-xs font-mono font-medium">{settings.inputGainDb}dB</span>
                </div>
                <Slider
                  value={[settings.inputGainDb]}
                  onValueChange={([v]) => onSettingsChange({ inputGainDb: v })}
                  min={0}
                  max={30}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Unity</span>
                  <span>+30dB Boost</span>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* DISPLAY TAB */}
          <TabsContent value="display" className="mt-4 space-y-5">
            <Section 
              title="Max Issues Displayed" 
              tooltip="Limits how many feedback issues are shown simultaneously. Lower values reduce visual clutter, higher values show more comprehensive system state. 5-6 for focused work, 8-10 for full system view, 12 for detailed analysis."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Visible Issues</span>
                  <span className="text-xs font-mono font-medium">{settings.maxDisplayedIssues}</span>
                </div>
                <Slider
                  value={[settings.maxDisplayedIssues]}
                  onValueChange={([v]) => onSettingsChange({ maxDisplayedIssues: v })}
                  min={3}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Minimal</span>
                  <span>Comprehensive</span>
                </div>
              </div>
            </Section>

            <Section 
              title="EQ Recommendation Style" 
              tooltip="Controls the type of EQ cuts suggested. Surgical uses narrow Q (8-16) with deeper cuts for precise feedback removal. Heavy uses wider Q (2-4) with moderate cuts for broader tonal shaping."
            >
              <Select
                value={settings.eqPreset}
                onValueChange={(v) => onSettingsChange({ eqPreset: v as 'surgical' | 'heavy' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">
                    <div className="flex flex-col">
                      <span>Surgical</span>
                      <span className="text-[10px] text-muted-foreground">Narrow Q (8-16), deep cuts - precise feedback removal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="heavy">
                    <div className="flex flex-col">
                      <span>Heavy</span>
                      <span className="text-[10px] text-muted-foreground">Wide Q (2-4), moderate cuts - broader control</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <div className="pt-4 border-t border-border space-y-3">
              <Button variant="outline" size="sm" onClick={onReset} className="w-full">
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset to PA Defaults
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Restores aggressive mode optimized for corporate/conference PA systems with vocal focus (200Hz-8kHz)
              </p>
            </div>
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-sm">
          {children}
        </div>
      </div>
    </TooltipProvider>
  )
}
