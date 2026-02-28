'use client'

import { useState } from 'react'
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
import { Settings, RotateCcw, HelpCircle, BarChart3, Monitor, Bot } from 'lucide-react'
import type { DetectorSettings } from '@/types/advisory'

interface SettingsPanelProps {
  settings: DetectorSettings
  onSettingsChange: (settings: Partial<DetectorSettings>) => void
  onReset: () => void
}

export interface AgentSettings {
  model: string
  temperature: number
  systemPrompt: string
}

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  model: 'openai/gpt-4o-mini',
  temperature: 0.3,
  systemPrompt:
    'You are a live sound engineer assistant embedded in Kill The Ring, a real-time acoustic feedback detection tool. Interpret detected issues, explain EQ recommendations in plain language, and suggest workflow steps for the engineer.',
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onReset,
}: SettingsPanelProps) {
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS)

  const updateAgent = (patch: Partial<AgentSettings>) =>
    setAgentSettings((prev) => ({ ...prev, ...patch }))

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
            Analysis engine and display preferences. Detection controls are in the sidebar.
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
            <TabsTrigger value="agent" className="gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5" />
              Agent
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
              title="Input Gain" 
              tooltip="Digital boost applied before analysis. Increase if your signal is weak, decrease if clipping. Does not affect audio output, only analysis sensitivity."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Boost</span>
                  <span className="text-xs font-mono">{settings.inputGainDb > 0 ? '+' : ''}{settings.inputGainDb}dB</span>
                </div>
                <Slider
                  value={[settings.inputGainDb]}
                  onValueChange={([v]) => onSettingsChange({ inputGainDb: v })}
                  min={-40}
                  max={40}
                  step={1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>-40dB</span>
                  <span>0dB</span>
                  <span>+40dB</span>
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
              <Button variant="outline" size="sm" onClick={onReset} className="w-full">
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset to PA Defaults
              </Button>
              <p className="text-[9px] text-muted-foreground text-center mt-2">
                Restores aggressive detection for corporate/conference PA
              </p>
            </div>
          </TabsContent>

          <TabsContent value="agent" className="mt-4 space-y-5">
            <Section
              title="Model"
              tooltip="The AI model used by the assistant. GPT-4o Mini is fast and cost-efficient. GPT-4o offers higher reasoning for complex explanations. Claude Haiku is an Anthropic alternative."
            >
              <Select value={agentSettings.model} onValueChange={(v) => updateAgent({ model: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini (fast, efficient)</SelectItem>
                  <SelectItem value="openai/gpt-4o">GPT-4o (high reasoning)</SelectItem>
                  <SelectItem value="anthropic/claude-haiku-4-5">Claude Haiku (Anthropic)</SelectItem>
                  <SelectItem value="anthropic/claude-sonnet-4-5">Claude Sonnet (Anthropic)</SelectItem>
                </SelectContent>
              </Select>
            </Section>

            <Section
              title="Temperature"
              tooltip="Controls response creativity. 0.0-0.3 for precise, factual EQ advice. 0.5-0.7 for conversational explanations. Higher values may produce less reliable technical recommendations."
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Value</span>
                  <span className="text-xs font-mono">{agentSettings.temperature.toFixed(1)}</span>
                </div>
                <Slider
                  value={[agentSettings.temperature]}
                  onValueChange={([v]) => updateAgent({ temperature: v })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </Section>

            <Section
              title="System Prompt"
              tooltip="Instructions given to the AI before every conversation. Defines its role, tone, and context. Changes take effect on the next message sent."
            >
              <textarea
                value={agentSettings.systemPrompt}
                onChange={(e) => updateAgent({ systemPrompt: e.target.value })}
                rows={5}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
                placeholder="Describe the assistant's role and behavior..."
              />
              <p className="text-[9px] text-muted-foreground">
                {agentSettings.systemPrompt.length} characters
              </p>
            </Section>

            <div className="pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAgentSettings(DEFAULT_AGENT_SETTINGS)}
                className="w-full"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset Agent Defaults
              </Button>
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

