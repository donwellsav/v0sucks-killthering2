'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings, RotateCcw, HelpCircle } from 'lucide-react'
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg">Detection Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="detection" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>

          <TabsContent value="detection" className="mt-4 space-y-6">
            <Section 
              title="Feedback Threshold"
              tooltip="Primary detection sensitivity. Lower = more sensitive to faint feedback. Typical range: 10-18dB for live sound."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Sensitivity Level</span>
                  <span className="text-xs font-mono">{settings.feedbackThresholdDb}dB</span>
                </div>
                <Slider
                  value={[settings.feedbackThresholdDb]}
                  onValueChange={([v]) => onSettingsChange({ feedbackThresholdDb: v })}
                  min={6}
                  max={24}
                  step={1}
                />
                <p className="text-[10px] text-muted-foreground">Low (6-12) = Aggressive | High (18-24) = Conservative</p>
              </div>
            </Section>

            <Section 
              title="Ring Sensitivity"
              tooltip="Threshold for detecting resonant peaks. Lower values catch subtle room resonances. Default: 5-8dB."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Resonance Detection</span>
                  <span className="text-xs font-mono">{settings.ringThresholdDb}dB</span>
                </div>
                <Slider
                  value={[settings.ringThresholdDb]}
                  onValueChange={([v]) => onSettingsChange({ ringThresholdDb: v })}
                  min={3}
                  max={15}
                  step={0.5}
                />
                <p className="text-[10px] text-muted-foreground">Higher = fewer false positives in musical content</p>
              </div>
            </Section>

            <Section 
              title="Growth Rate Threshold"
              tooltip="How fast a frequency must grow to be classified as runaway feedback. Measured in dB/second."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Growth Velocity</span>
                  <span className="text-xs font-mono">{settings.growthRateThreshold.toFixed(1)}dB/s</span>
                </div>
                <Slider
                  value={[settings.growthRateThreshold]}
                  onValueChange={([v]) => onSettingsChange({ growthRateThreshold: v })}
                  min={1}
                  max={10}
                  step={0.5}
                />
                <p className="text-[10px] text-muted-foreground">Low (1-2) = Fast detection | High (6-10) = Only severe feedback</p>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="analysis" className="mt-4 space-y-6">
            <Section 
              title="FFT Size"
              tooltip="Higher FFT size provides better frequency resolution but slower response time. Choose based on lowest feedback frequency."
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
                  <SelectItem value="4096">4096 - Fast Response (11.7 Hz resolution @ 48kHz)</SelectItem>
                  <SelectItem value="8192">8192 - Balanced (5.9 Hz resolution @ 48kHz)</SelectItem>
                  <SelectItem value="16384">16384 - High Resolution (2.9 Hz resolution @ 48kHz)</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Section 
              title="Spectrum Smoothing"
              tooltip="Reduces display noise by averaging spectral frames. Higher = smoother but may hide fast-changing peaks."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Smoothing Amount</span>
                  <span className="text-xs font-mono">{(settings.smoothingTimeConstant * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.smoothingTimeConstant]}
                  onValueChange={([v]) => onSettingsChange({ smoothingTimeConstant: v })}
                  min={0}
                  max={0.95}
                  step={0.05}
                />
              </div>
            </Section>

            <Section 
              title="Hold Time"
              tooltip="How long detected issues remain visible after they disappear from the spectrum. Useful for reference while making EQ changes."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Display Duration</span>
                  <span className="text-xs font-mono">{settings.holdTimeMs}ms</span>
                </div>
                <Slider
                  value={[settings.holdTimeMs]}
                  onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
                  min={500}
                  max={5000}
                  step={250}
                />
                <p className="text-[10px] text-muted-foreground">Increase to 3000-5000ms when making reference adjustments</p>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="display" className="mt-4 space-y-6">
            <Section 
              title="Max Issues Displayed"
              tooltip="Limit how many issues are shown in the active list. Lower values reduce visual clutter."
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Issues to Show</span>
                  <span className="text-xs font-mono">{settings.maxDisplayedIssues}</span>
                </div>
                <Slider
                  value={[settings.maxDisplayedIssues]}
                  onValueChange={([v]) => onSettingsChange({ maxDisplayedIssues: v })}
                  min={3}
                  max={12}
                  step={1}
                />
              </div>
            </Section>

            <Section 
              title="EQ Recommendation Style"
              tooltip="Surgical uses narrow, deep cuts. Heavy uses wider, moderate cuts. Choose based on your preference and system capabilities."
            >
              <Select
                value={settings.eqPreset}
                onValueChange={(v) => onSettingsChange({ eqPreset: v as 'surgical' | 'heavy' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">Surgical - Narrow Q, Deep Cuts (High precision)</SelectItem>
                  <SelectItem value="heavy">Heavy - Wide Q, Moderate Cuts (Broader control)</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Button variant="outline" size="sm" onClick={onReset} className="w-full">
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Reset to Defaults
            </Button>
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
    <TooltipProvider>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          {children}
        </div>
      </div>
    </TooltipProvider>
  )
}
