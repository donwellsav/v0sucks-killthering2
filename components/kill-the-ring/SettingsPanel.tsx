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
import { Settings, RotateCcw } from 'lucide-react'
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
          <DialogTitle className="text-lg">Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="analysis" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4 space-y-6">
            <Section title="FFT Resolution">
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
                  <SelectItem value="4096">4096 (Fast response)</SelectItem>
                  <SelectItem value="8192">8192 (Balanced)</SelectItem>
                  <SelectItem value="16384">16384 (High resolution)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">Higher = better frequency accuracy, slower response</p>
            </Section>

            <Section title="Spectrum Smoothing">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs">{(settings.smoothingTimeConstant * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[settings.smoothingTimeConstant]}
                  onValueChange={([v]) => onSettingsChange({ smoothingTimeConstant: v })}
                  min={0}
                  max={0.95}
                  step={0.05}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Reduces display noise for cleaner visualization</p>
            </Section>

            <Section title="Hold Time">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-mono">{settings.holdTimeMs}ms</span>
                </div>
                <Slider
                  value={[settings.holdTimeMs]}
                  onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
                  min={500}
                  max={5000}
                  step={250}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">How long issues persist after detection stops</p>
            </Section>
          </TabsContent>

          <TabsContent value="display" className="mt-4 space-y-6">
            <Section title="Graph Text Size">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-mono">{settings.graphTextSize}px</span>
                </div>
                <Slider
                  value={[settings.graphTextSize]}
                  onValueChange={([v]) => onSettingsChange({ graphTextSize: v })}
                  min={8}
                  max={20}
                  step={1}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Font size for graph axis labels and markers</p>
            </Section>

            <Section title="Max Issues Displayed">
              <div className="space-y-2">
                <div className="flex justify-between">
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
              <p className="text-[11px] text-muted-foreground mt-1.5">Limits the active issues list size</p>
            </Section>

            <Section title="EQ Recommendation Style">
              <Select
                value={settings.eqPreset}
                onValueChange={(v) => onSettingsChange({ eqPreset: v as 'surgical' | 'heavy' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">Surgical (Narrow, deep)</SelectItem>
                  <SelectItem value="heavy">Heavy (Wide, moderate)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">Affects PEQ Q factor and gain recommendations</p>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </div>
  )
}
