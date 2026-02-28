'use client'

// Help menu for Kill The Ring application
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
        <Button suppressHydrationWarning variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" aria-label="Help">
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg">Kill The Ring Help</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 mb-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="modes">Modes</TabsTrigger>
            <TabsTrigger value="readings">Readings</TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Section title="What is Kill The Ring?">
              <p>
                Kill The Ring is a real-time acoustic feedback detection tool for live sound engineers.
                It analyzes audio input to identify feedback frequencies, resonant rings, and other
                problematic tones, then provides specific EQ recommendations to address them.
                Default settings are optimized for corporate/conference PA systems with a vocal focus (200Hz–8kHz).
              </p>
            </Section>

            <Section title="Quick Start">
              <ol className="list-decimal list-inside space-y-2">
                <li>Click <strong>Start</strong> in the header to begin monitoring</li>
                <li>Detected issues appear in the <strong>Active Issues</strong> sidebar, sorted by frequency</li>
                <li>Each issue card shows frequency, pitch, and recommended GEQ/PEQ cuts</li>
                <li>Tap <strong>Apply</strong> on a card to log the cut — it moves to the <strong>EQ Notepad</strong> tab</li>
                <li>Use the <strong>EQ Notepad</strong> to copy all applied cuts as formatted text</li>
                <li>Use the <strong>Logs</strong> panel to export full session data for reference</li>
                <li>Review past sessions from the <strong>Sessions</strong> page with per-session frequency histograms</li>
              </ol>
            </Section>

            <Section title="Display Areas">
              <ul className="space-y-2">
                <li><strong>Large Panel (top):</strong> The selected graph enlarged for detail. Use the dropdown in the panel header to switch between RTA Spectrum, 31-Band GEQ, and Waterfall. Click any small panel below to enlarge it.</li>
                <li><strong>Small Panels (bottom row):</strong> The two non-active graphs, live and clickable. Click to swap into the large view.</li>
                <li><strong>Left Sidebar — Issues tab:</strong> Active detected issues with Apply buttons. RUNAWAY issues pulse red.</li>
                <li><strong>Left Sidebar — EQ Notepad tab:</strong> Accumulates cuts you have applied. Copy button exports all cuts as text for pasting into console notes.</li>
                <li><strong>Waterfall time axis:</strong> Y-axis shows real elapsed seconds, auto-scaling to the history depth.</li>
              </ul>
            </Section>
          </TabsContent>

          {/* CONTROLS */}
          <TabsContent value="controls" className="mt-4 space-y-4">
            <Section title="Header Controls">
              <ul className="space-y-3">
                <li>
                  <strong>Start / Stop:</strong> Begins or pauses audio analysis. The LIVE indicator appears while running.
                </li>
                <li>
                  <strong>Input Gain (meter slider):</strong> Digital boost applied before analysis (+0 to +30 dB). Increase if feedback is not being detected; reduce if clipping. Does not affect audio output.
                </li>
                <li>
                  <strong>Mode:</strong> Detection sensitivity preset. Default is <strong>Feedback Hunt</strong>. See the Modes tab for details.
                </li>
                <li>
                  <strong>Logs:</strong> Opens the session log viewer with CSV, JSON, and plain text export.
                </li>
                <li>
                  <strong>Sessions:</strong> Navigate to the Sessions page to view frequency histograms and stats for all past sessions.
                </li>
                <li>
                  <strong>Settings:</strong> Advanced analysis and display options (FFT size, smoothing, hold time, EQ style). Detection controls are in the sidebar, not here.
                </li>
              </ul>
            </Section>

            <Section title="Sidebar — Detection Controls">
              <p className="mb-2">These controls are the primary real-time tuning tools. They live in the top half of the left sidebar:</p>
              <ul className="space-y-2">
                <li><strong>Mode dropdown:</strong> Sets the detection sensitivity preset (Feedback Hunt, Aggressive, Vocal Ring, Music-Aware, Calibration).</li>
                <li><strong>Freq Range chips:</strong> Four preset buttons — <em>Vocal</em> (200–8kHz), <em>Monitor</em> (300–3kHz), <em>Full</em> (20–20kHz), <em>Sub</em> (20–250Hz). Instantly updates the analysis frequency window.</li>
                <li><strong>Auto Music-Aware toggle:</strong> When enabled, automatically switches to music-aware mode when the signal rises above the noise floor by the configured hysteresis amount (default: 15 dB). A Speech/Music pill shows the current state. This adapts sensitivity as the band starts and stops playing.</li>
                <li><strong>Threshold:</strong> Primary sensitivity. 4–8 dB for aggressive detection, 10–14 dB balanced, 16+ dB conservative. Default: 8 dB.</li>
                <li><strong>Ring:</strong> Resonance detection sensitivity. 2–4 dB for calibration, 5–7 dB normal use, 8+ dB during shows. Default: 5 dB.</li>
                <li><strong>Growth:</strong> How fast a frequency must grow (dB/s) to be flagged. 0.5–1 dB/s catches feedback early, 3+ dB/s only runaway. Default: 2 dB/s.</li>
              </ul>
            </Section>

            <Section title="Sidebar — Issues Tab">
              <ul className="space-y-2">
                <li>Lists all currently detected issues sorted by frequency (low to high).</li>
                <li>Each card shows the frequency, musical pitch, GEQ band + cut depth, and PEQ Q + gain.</li>
                <li>RUNAWAY issues pulse red with a dB/s velocity counter and predicted time to clip.</li>
                <li><strong>Apply button:</strong> Tap to confirm you have applied the cut. The card fades and the cut logs to the EQ Notepad tab.</li>
              </ul>
            </Section>

            <Section title="Sidebar — EQ Notepad Tab">
              <ul className="space-y-2">
                <li>Accumulates all cuts you have marked as applied during the session.</li>
                <li><strong>Copy:</strong> Copies all cuts as formatted text (frequency, GEQ, PEQ) for pasting into console notes or a text editor.</li>
                <li>Hover over a cut row to reveal the remove button (trash icon).</li>
                <li>Clear button removes all cuts at once.</li>
              </ul>
            </Section>

            <Section title="Settings Panel (gear icon)">
              <p className="mb-2">Advanced settings split into two tabs:</p>
              <ul className="space-y-2">
                <li><strong>Analysis tab:</strong> FFT Size (resolution vs. speed trade-off), Spectrum Smoothing, Hold Time (how long issues stay visible), Input Gain.</li>
                <li><strong>Display tab:</strong> Max Issues Shown (default 6 — focus on worst problems, adjustable to 12), Graph Label Size, EQ Recommendation Style (Surgical = narrow Q / deep cuts, Heavy = wide Q / moderate cuts).</li>
                <li><strong>Reset to PA Defaults:</strong> Restores all settings to Feedback Hunt defaults optimized for corporate/conference PA systems.</li>
              </ul>
            </Section>

            <Section title="Graph Switcher">
              <ul className="space-y-2">
                <li>The large panel header has a <strong>dropdown</strong> to select which graph is enlarged: RTA Spectrum, 31-Band GEQ, or Waterfall.</li>
                <li>The two remaining graphs appear in the bottom row, still live.</li>
                <li>Clicking a small panel also swaps it to the large view with a crossfade transition.</li>
              </ul>
            </Section>
          </TabsContent>

          {/* MODES */}
          <TabsContent value="modes" className="mt-4 space-y-4">
            <Section title="Operation Modes">
              <ul className="space-y-3">
                <li>
                  <strong>Feedback Hunt (Default):</strong> Balanced PA mode. Threshold 8 dB, Ring 5 dB, Growth 2 dB/s. Good general sensitivity with fewer false positives — the recommended starting point.
                </li>
                <li>
                  <strong>Aggressive:</strong> Maximum sensitivity for system calibration and ring-out. Threshold 6 dB, Ring 3 dB, Growth 1 dB/s. Catches feedback early before it becomes audible.
                </li>
                <li>
                  <strong>Vocal Ring:</strong> Tuned for speech frequencies (200 Hz–8 kHz). Threshold 6 dB, Ring 4 dB, Growth 1.5 dB/s. Use when fine-tuning monitor mixes or tracking subtle vocal ring-outs.
                </li>
                <li>
                  <strong>Music-Aware:</strong> Reduced sensitivity to avoid false positives from sustained musical notes. Threshold 12 dB, Ring 7 dB, Growth 3 dB/s, music filter enabled. Use during performance. Can also be triggered automatically via the <em>Auto Music-Aware</em> toggle in the sidebar.
                </li>
                <li>
                  <strong>Calibration:</strong> Ultra-sensitive for initial system setup and ringing out monitors. Threshold 4 dB, Ring 2 dB, Growth 0.5 dB/s. Use with pink noise or slow gain sweeps.
                </li>
              </ul>
            </Section>

            <Section title="Auto Music-Aware">
              <p className="mb-2">
                The <strong>Auto Music-Aware</strong> toggle in the sidebar automatically switches sensitivity based on signal level — no manual mode change required during a show:
              </p>
              <ul className="space-y-2">
                <li>When signal rises more than <strong>15 dB above the noise floor</strong>, the system enters music-aware mode (band is playing).</li>
                <li>When signal drops back below that threshold for 1 second, it returns to the current base mode (band has stopped).</li>
                <li>A <strong>Speech / Music</strong> pill next to the toggle shows the current automatic state.</li>
                <li>The 15 dB hysteresis value can be adjusted in Settings.</li>
              </ul>
            </Section>

            <Section title="Frequency Range Presets">
              <p className="mb-2">Four quick-switch range chips narrow or widen the detection window:</p>
              <ul className="space-y-2">
                <li><strong>Vocal</strong> — 200 Hz – 8 kHz. Default. Speech PA and vocal monitors.</li>
                <li><strong>Monitor</strong> — 300 Hz – 3 kHz. Focused on the core speech intelligibility band. Tightest window, fewest distractions.</li>
                <li><strong>Full</strong> — 20 Hz – 20 kHz. Full-range system calibration. Catches sub-bass rumble and high-frequency feedback.</li>
                <li><strong>Sub</strong> — 20 Hz – 250 Hz. Low-frequency subwoofer monitoring only.</li>
              </ul>
            </Section>

            <Section title="Choosing a Mode">
              <ul className="space-y-2">
                <li>Default / general soundcheck: <strong>Feedback Hunt</strong></li>
                <li>Initial system setup / ring-out: <strong>Calibration</strong> or <strong>Aggressive</strong></li>
                <li>Monitor tuning: <strong>Vocal Ring</strong></li>
                <li>During live performance: <strong>Music-Aware</strong> or enable <strong>Auto Music-Aware</strong></li>
                <li>Full system analysis: <strong>Feedback Hunt</strong> + <em>Full</em> freq range</li>
              </ul>
            </Section>
          </TabsContent>

          {/* READINGS */}
          <TabsContent value="readings" className="mt-4 space-y-4">
            <Section title="Issue Card Details">
              <ul className="space-y-2">
                <li><strong>Frequency (Hz):</strong> The detected problem frequency</li>
                <li><strong>Pitch:</strong> Musical note equivalent (e.g., A4, C#3)</li>
                <li><strong>Level (dB):</strong> Amplitude of the detected peak</li>
                <li><strong>Q:</strong> Estimated bandwidth/sharpness of the resonance</li>
                <li><strong>Growth (dB/s):</strong> Rate of amplitude change — positive means building feedback</li>
              </ul>
            </Section>

            <Section title="EQ Recommendations">
              <ul className="space-y-2">
                <li><strong>GEQ:</strong> Nearest ISO 31-band center frequency and suggested cut depth. Apply to your graphic EQ.</li>
                <li><strong>PEQ:</strong> Precise frequency, Q value, and gain for parametric EQ. Filter types: bell (standard), notch (very narrow peaks).</li>
                <li><strong>EQ Style:</strong> Surgical uses narrow Q (8–16) with deeper cuts. Heavy uses wider Q (2–4) with moderate cuts. Configurable in Settings.</li>
              </ul>
            </Section>

            <Section title="Severity Levels">
              <ul className="space-y-2">
                <li><strong className="text-red-500">RUNAWAY:</strong> Active feedback rapidly increasing — address immediately</li>
                <li><strong className="text-orange-500">GROWING:</strong> Feedback building but not yet critical</li>
                <li><strong className="text-yellow-500">RESONANCE:</strong> Stable resonant peak that could become feedback</li>
                <li><strong className="text-purple-500">POSSIBLE RING:</strong> Subtle ring that may need attention</li>
                <li><strong className="text-cyan-500">WHISTLE:</strong> Detected whistle or sibilance</li>
                <li><strong className="text-green-500">INSTRUMENT:</strong> Likely musical content, not feedback</li>
              </ul>
            </Section>

            <Section title="Header Status Indicators">
              <ul className="space-y-2">
                <li><strong>FFT pt @ kHz:</strong> Current FFT size and sample rate (e.g., 8192pt @ 48.0kHz)</li>
                <li><strong>Floor: dB:</strong> Adaptive noise floor — issues must exceed this to be detected</li>
                <li><strong>LIVE pulse:</strong> Confirms analysis is actively running</li>
              </ul>
            </Section>
          </TabsContent>

          {/* TIPS */}
          <TabsContent value="tips" className="mt-4 space-y-4">
            <Section title="Workflow Best Practices">
              <ol className="list-decimal list-inside space-y-2">
                <li>Start with <strong>Calibration</strong> mode during initial system setup and ring-out</li>
                <li>Switch to <strong>Feedback Hunt</strong> for general PA monitoring (the default balanced mode)</li>
                <li>Ring out monitors one at a time, addressing the worst frequencies first</li>
                <li>Tap <strong>Apply</strong> on each card as you make the cut — the EQ Notepad tracks your work</li>
                <li>Apply cuts conservatively — start with 3 dB and increase only if needed</li>
                <li>Enable <strong>Auto Music-Aware</strong> so sensitivity adjusts automatically when the band plays</li>
                <li>Use <strong>PEQ</strong> recommendations for surgical cuts; <strong>GEQ</strong> for broader room resonances</li>
                <li>Use the <strong>EQ Notepad Copy</strong> button to paste all applied cuts into your console notes</li>
                <li>Export logs after the session so you have a record of every detected frequency</li>
                <li>Review the <strong>Sessions</strong> page frequency histogram to spot venue resonances across multiple gigs</li>
              </ol>
            </Section>

            <Section title="Getting Better Results">
              <ul className="space-y-2">
                <li><strong>Position matters:</strong> Place your analysis mic where feedback occurs — at the monitor or near the PA</li>
                <li><strong>Gain staging:</strong> Ensure the signal is strong but not clipping. Adjust Input Gain in the header.</li>
                <li><strong>Start quiet:</strong> Begin with lower system gain and slowly increase while monitoring</li>
                <li><strong>One change at a time:</strong> Apply one EQ cut, then observe before making more changes</li>
                <li><strong>Watch Growth:</strong> Positive dB/s values mean action is needed before the feedback builds</li>
                <li><strong>Use Hold Time:</strong> Increase to 3–5 s in Settings when making reference cuts so issues stay visible</li>
                <li><strong>Freq Range presets:</strong> Switch to <em>Full</em> for initial calibration, then narrow to <em>Vocal</em> during the show</li>
              </ul>
            </Section>

            <Section title="Common Feedback Frequency Ranges">
              <ul className="space-y-2">
                <li><strong>200–500 Hz:</strong> Muddy buildup, boxy vocals, room modes (vocal focus lower range)</li>
                <li><strong>500 Hz–1 kHz:</strong> Nasal/honky tones, vocal feedback zone</li>
                <li><strong>1–3 kHz:</strong> Presence/intelligibility range, harsh feedback</li>
                <li><strong>3–6 kHz:</strong> Sibilance, cymbal harshness, piercing feedback</li>
                <li><strong>6–8 kHz:</strong> Air/brightness, high-frequency ringing (vocal focus upper range)</li>
              </ul>
            </Section>

            <Section title="EQ Cut Guidelines">
              <ul className="space-y-2">
                <li><strong>Narrow Q (8–16):</strong> Isolated feedback — surgical removal with minimal tonal impact</li>
                <li><strong>Medium Q (2–4):</strong> Resonant room modes — broader control</li>
                <li><strong>Wide Q (0.5–1):</strong> Tonal shaping — affects overall character</li>
                <li><strong>Rule of thumb:</strong> Start with half the recommended cut depth, then adjust</li>
              </ul>
            </Section>
          </TabsContent>

          {/* TROUBLESHOOT */}
          <TabsContent value="troubleshoot" className="mt-4 space-y-4">
            <Section title="No Audio Input">
              <ul className="space-y-2">
                <li>Check browser microphone permissions (camera/mic icon in the address bar)</li>
                <li>Ensure the correct input device is selected in your system audio settings</li>
                <li>Try refreshing the page and granting permissions again</li>
                <li>Microphone access requires HTTPS in most browsers</li>
              </ul>
            </Section>

            <Section title="Too Many False Positives">
              <ul className="space-y-2">
                <li>Switch to <strong>Music-Aware</strong> mode during performance</li>
                <li>Raise <strong>Threshold</strong> in the sidebar (try 10–14 dB)</li>
                <li>Raise <strong>Ring</strong> sensitivity (try 6–8 dB)</li>
                <li>Raise <strong>Growth</strong> rate (try 2–3 dB/s)</li>
              </ul>
            </Section>

            <Section title="Missing Feedback Detection">
              <ul className="space-y-2">
                <li>Lower <strong>Threshold</strong> in the sidebar (try 4–6 dB)</li>
                <li>Increase <strong>Input Gain</strong> in the header if the signal level is low</li>
                <li>Switch to <strong>Aggressive</strong> or <strong>Calibration</strong> mode</li>
                <li>Increase <strong>FFT Size</strong> to 16384 in Settings for better low-frequency resolution</li>
              </ul>
            </Section>

            <Section title="Slow or Laggy Display">
              <ul className="space-y-2">
                <li>Reduce <strong>FFT Size</strong> to 4096 in Settings for faster processing</li>
                <li>Increase <strong>Spectrum Smoothing</strong> to reduce visual noise load</li>
                <li>Close other browser tabs to free CPU resources</li>
              </ul>
            </Section>

            <Section title="Issues Disappearing Too Quickly">
              <ul className="space-y-2">
                <li>Increase <strong>Hold Time</strong> in Settings (default: 3 s, try 4–5 s for reference cuts)</li>
              </ul>
            </Section>
          </TabsContent>

          {/* TECHNICAL */}
          <TabsContent value="technical" className="mt-4 space-y-4">
            <Section title="Analysis Engine">
              <ul className="space-y-2">
                <li><strong>FFT Analysis:</strong> Fast Fourier Transform via Web Audio API. Default 8192 bins at 48 kHz = ~5.9 Hz resolution.</li>
                <li><strong>Peak Detection:</strong> Identifies local maxima exceeding the adaptive noise floor and detection threshold</li>
                <li><strong>Track Persistence:</strong> Peaks are tracked across frames to distinguish sustained feedback from transients. Association tolerance: 50 cents.</li>
                <li><strong>Harmonic Filtering:</strong> Suppresses harmonics (up to 8th) of detected fundamentals to reduce clutter</li>
                <li><strong>Duplicate Merging:</strong> Peaks within 50 cents are merged to prevent redundant advisories</li>
              </ul>
            </Section>

            <Section title="Default Configuration (PA-Optimised)">
              <ul className="space-y-2">
                <li><strong>Mode:</strong> Feedback Hunt</li>
                <li><strong>Frequency range:</strong> 200 Hz – 8 kHz (vocal-focused)</li>
                <li><strong>Feedback threshold:</strong> 8 dB</li>
                <li><strong>Ring threshold:</strong> 5 dB</li>
                <li><strong>Growth rate:</strong> 2 dB/s</li>
                <li><strong>FFT size:</strong> 8192</li>
                <li><strong>Smoothing:</strong> 60%</li>
                <li><strong>Hold time:</strong> 3 s</li>
                <li><strong>Input gain:</strong> +18 dB</li>
                <li><strong>EQ style:</strong> Surgical</li>
              </ul>
            </Section>

            <Section title="Detection Algorithm">
              <ul className="space-y-2">
                <li><strong>Growth Rate:</strong> Amplitude change over time (dB/s). Runaway threshold: 8 dB/s, Growing: 2 dB/s.</li>
                <li><strong>Q Estimation:</strong> Derived from peak width at −3 dB points</li>
                <li><strong>Noise Floor:</strong> Adaptive measurement using lower percentile of spectral energy</li>
                <li><strong>Classification:</strong> Weighted scoring across stability, harmonicity, modulation, sideband noise, and growth rate</li>
              </ul>
            </Section>

            <Section title="GEQ Band Mapping">
              <p className="mb-2">Detected frequencies map to the nearest ISO 31-band center frequency:</p>
              <p className="text-xs font-mono bg-muted p-2 rounded leading-relaxed">
                20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1k, 1.25k, 1.6k, 2k, 2.5k, 3.15k, 4k, 5k, 6.3k, 8k, 10k, 12.5k, 16k, 20k Hz
              </p>
            </Section>

            <Section title="Browser Requirements">
              <ul className="space-y-2">
                <li><strong>Web Audio API + getUserMedia:</strong> Required for real-time audio processing</li>
                <li><strong>Supported:</strong> Chrome 74+, Firefox 76+, Safari 14.1+, Edge 79+</li>
                <li><strong>Sample rate:</strong> Uses system default (typically 44.1 kHz or 48 kHz)</li>
                <li><strong>HTTPS:</strong> Required for microphone access in production</li>
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
