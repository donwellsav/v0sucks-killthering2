'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpCircle } from 'lucide-react'

export function HelpMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-4 h-4" />
          <span className="text-xs">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">KillTheRing2 Help</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="modes">Modes</TabsTrigger>
            <TabsTrigger value="readings">Readings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Section title="What is KillTheRing2?">
              <p>
                KillTheRing2 is a real-time acoustic feedback detection tool for live sound engineers. 
                It analyzes audio input to identify feedback frequencies, resonant rings, and other 
                problematic tones, then provides specific EQ recommendations to address them.
              </p>
            </Section>

            <Section title="Quick Start">
              <ol className="list-decimal list-inside space-y-2">
                <li>Click <strong>Start Analysis</strong> to begin monitoring</li>
                <li>Detected issues appear in the <strong>Active Issues</strong> list, sorted by frequency</li>
                <li>Each issue shows the frequency, pitch, and recommended EQ cuts</li>
                <li>Apply the suggested GEQ or PEQ cuts to your mixer/DSP</li>
                <li>Click <strong>Start Analysis</strong> again to clear and re-scan</li>
              </ol>
            </Section>

            <Section title="Display Areas">
              <ul className="space-y-2">
                <li><strong>RTA Spectrum:</strong> Real-time frequency analysis with peak markers on detected issues</li>
                <li><strong>31-Band GEQ:</strong> Visual representation of recommended cuts on ISO standard frequencies</li>
                <li><strong>Waterfall:</strong> Time-history spectrogram showing how frequencies evolve</li>
                <li><strong>Active Issues:</strong> List of detected problems with EQ recommendations</li>
              </ul>
            </Section>
          </TabsContent>

          <TabsContent value="controls" className="mt-4 space-y-4">
            <Section title="Main Controls">
              <ul className="space-y-3">
                <li>
                  <strong>Start/Stop Analysis:</strong> Begins or pauses audio analysis. 
                  Starting clears previous issues; stopping preserves the list for reference.
                </li>
                <li>
                  <strong>Mode:</strong> Select the detection mode based on your use case (see Modes tab).
                </li>
                <li>
                  <strong>Input Gain:</strong> Software gain applied to the analysis signal (-12 to +24 dB). 
                  Boost if feedback is not being detected; reduce if the display is clipping.
                </li>
              </ul>
            </Section>

            <Section title="Settings Panel">
              <p className="mb-2">Click the gear icon in the header to access advanced settings:</p>
              <ul className="space-y-2">
                <li><strong>FFT Size:</strong> Analysis resolution. 8192 (default) balances accuracy and speed. 16384 for higher resolution, 4096 for faster response.</li>
                <li><strong>Frequency Range:</strong> Min/max frequencies to analyze. Default 60-16000 Hz covers most feedback-prone ranges.</li>
                <li><strong>Feedback Threshold:</strong> dB above noise floor to trigger detection. Lower = more sensitive.</li>
                <li><strong>Ring Threshold:</strong> Sensitivity for subtle resonant rings.</li>
                <li><strong>Hold Time:</strong> How long issues persist after detection (ms).</li>
                <li><strong>EQ Preset:</strong> Surgical (narrow, deep cuts) or Heavy (wider, moderate cuts).</li>
              </ul>
            </Section>
          </TabsContent>

          <TabsContent value="modes" className="mt-4 space-y-4">
            <Section title="Operation Modes">
              <ul className="space-y-3">
                <li>
                  <strong>Feedback Hunt:</strong> Default mode for general feedback detection during soundcheck. 
                  Balanced sensitivity for typical live sound scenarios.
                </li>
                <li>
                  <strong>Vocal Ring Assist:</strong> Higher sensitivity for detecting subtle resonant rings 
                  in vocal mics. Use when fine-tuning monitor mixes or tracking down low-level rings.
                </li>
                <li>
                  <strong>Music-Aware:</strong> Reduced sensitivity to avoid false positives from sustained 
                  musical notes. Use during performance or when music is playing.
                </li>
                <li>
                  <strong>Aggressive:</strong> Maximum sensitivity for finding every potential problem. 
                  May produce more false positives. Best for initial system tuning.
                </li>
                <li>
                  <strong>Calibration:</strong> Highest sensitivity mode for system calibration and 
                  ringing out monitors. Use with pink noise or slow gain sweeps.
                </li>
              </ul>
            </Section>

            <Section title="Choosing a Mode">
              <ul className="space-y-2">
                <li>Soundcheck with no music: <strong>Feedback Hunt</strong></li>
                <li>Monitor ringing: <strong>Vocal Ring Assist</strong> or <strong>Calibration</strong></li>
                <li>During performance: <strong>Music-Aware</strong></li>
                <li>Initial system setup: <strong>Aggressive</strong> or <strong>Calibration</strong></li>
              </ul>
            </Section>
          </TabsContent>

          <TabsContent value="readings" className="mt-4 space-y-4">
            <Section title="Issue Card Details">
              <ul className="space-y-2">
                <li><strong>Frequency (Hz):</strong> The detected problem frequency</li>
                <li><strong>Pitch:</strong> Musical note equivalent (e.g., A4, C#3)</li>
                <li><strong>Level:</strong> Amplitude in dB</li>
                <li><strong>Q:</strong> Estimated bandwidth/sharpness of the resonance</li>
                <li><strong>Growth:</strong> Rate of amplitude change (dB/s) - positive indicates building feedback</li>
              </ul>
            </Section>

            <Section title="EQ Recommendations">
              <ul className="space-y-2">
                <li>
                  <strong>GEQ:</strong> Nearest ISO band and suggested cut depth. 
                  Apply to your 31-band graphic EQ.
                </li>
                <li>
                  <strong>PEQ:</strong> Precise frequency, Q value, and gain for parametric EQ. 
                  Filter types: bell (standard), notch (very narrow), HPF/LPF (filters).
                </li>
              </ul>
            </Section>

            <Section title="Severity Levels">
              <ul className="space-y-2">
                <li><strong className="text-red-500">RUNAWAY:</strong> Active feedback that is rapidly increasing - address immediately</li>
                <li><strong className="text-orange-500">GROWING:</strong> Feedback that is building but not yet critical</li>
                <li><strong className="text-yellow-500">RESONANCE:</strong> Stable resonant peak that could become feedback</li>
                <li><strong className="text-purple-500">POSSIBLE_RING:</strong> Subtle ring that may need attention</li>
                <li><strong className="text-cyan-500">WHISTLE:</strong> Detected whistle or sibilance (may be intentional)</li>
                <li><strong className="text-green-500">INSTRUMENT:</strong> Likely musical content, not feedback</li>
              </ul>
            </Section>

            <Section title="Status Indicators">
              <ul className="space-y-2">
                <li><strong>Noise Floor:</strong> Current ambient noise level. Issues must exceed this to be detected.</li>
                <li><strong>Resolution:</strong> Frequency resolution in Hz per FFT bin. Lower = more precise.</li>
              </ul>
            </Section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}
