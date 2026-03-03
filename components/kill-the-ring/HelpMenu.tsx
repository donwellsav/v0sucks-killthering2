'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { HelpCircle, Layout, BookOpen, Calculator, BookMarked } from 'lucide-react'

type HelpTab = 'guide' | 'overview' | 'math' | 'glossary'

const TABS: { id: HelpTab; label: string; icon: React.ReactNode }[] = [
  { id: 'guide',    label: 'GUI Guide', icon: <Layout className="h-3 w-3" /> },
  { id: 'overview', label: 'Overview',  icon: <BookOpen className="h-3 w-3" /> },
  { id: 'math',     label: 'The Math',  icon: <Calculator className="h-3 w-3" /> },
  { id: 'glossary', label: 'Glossary',  icon: <BookMarked className="h-3 w-3" /> },
]

export function HelpMenu() {
  const [open, setOpen]           = useState(false)
  const [activeTab, setActiveTab] = useState<HelpTab>('guide')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          suppressHydrationWarning
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Help</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden"
        aria-describedby={undefined}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0 flex-shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Kill The Ring — Help &amp; Reference
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border flex-shrink-0 px-2 pt-3 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed">

          {/* ═══════════════════ GUI GUIDE ═══════════════════ */}
          {activeTab === 'guide' && (
            <div className="space-y-8">

              <div>
                <h2 className="font-semibold text-base mb-1">Interface Layout</h2>
                <p className="text-muted-foreground text-xs mb-4">
                  A complete map of every zone. Labels match the reference cards below.
                </p>

                {/* ── Diagram ── */}
                <div className="rounded-lg border border-border overflow-hidden text-[10px] font-mono select-none">

                  {/* Top toolbar */}
                  <div className="bg-muted/60 border-b border-border px-3 py-1.5 flex items-center justify-between">
                    <span className="text-primary font-bold tracking-widest">KILL THE RING</span>
                    <div className="flex gap-1.5 text-muted-foreground">
                      {['Settings', 'History', 'Notepad', 'Help'].map(l => (
                        <span key={l} className="border border-border rounded px-1.5 py-0.5">{l}</span>
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex" style={{ minHeight: 200 }}>

                    {/* ── Left sidebar ── */}
                    <div className="flex flex-col border-r border-border bg-card/40" style={{ width: '30%' }}>

                      {/* A — Algorithm Status */}
                      <div className="border-b border-border px-2 py-1.5 bg-primary/10">
                        <div className="text-primary font-bold">A  Algorithm Status</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          <span className="border border-primary/40 rounded px-1 text-primary/70">MSD</span>
                          <span className="border border-border rounded px-1 text-muted-foreground">PHASE</span>
                          <span className="border border-green-500/40 rounded px-1 text-green-500/70">SPEECH</span>
                        </div>
                      </div>

                      {/* B — Input Gain */}
                      <div className="border-b border-border px-2 py-1.5 bg-card/30">
                        <div className="text-foreground/70 font-bold">B  Input Gain</div>
                        <div className="mt-1 h-2 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-green-500/60 rounded" style={{ width: '68%' }} />
                        </div>
                        <div className="text-muted-foreground mt-0.5">−12 dBFS  |  +15 dB trim</div>
                      </div>

                      {/* C — Active Issues */}
                      <div className="flex-1 px-2 py-1.5">
                        <div className="text-foreground/70 font-bold mb-1">C  Active Issues</div>
                        <div className="space-y-0.5">
                          <div className="border border-destructive/50 rounded px-1 py-0.5 text-destructive/80">
                            500 Hz · RUNAWAY
                          </div>
                          <div className="border border-yellow-500/40 rounded px-1 py-0.5 text-yellow-500/70">
                            2.4 kHz · RING
                          </div>
                          <div className="border border-border rounded px-1 py-0.5 text-muted-foreground">
                            8.1 kHz · WHISTLE
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Right: graphs ── */}
                    <div className="flex-1 flex flex-col">

                      {/* Tab chips */}
                      <div className="flex border-b border-border bg-muted/30 px-2 pt-1 gap-1 flex-shrink-0">
                        <span className="border-b-2 border-primary text-primary px-2 py-0.5 font-bold">RTA</span>
                        <span className="border-b-2 border-transparent text-muted-foreground px-2 py-0.5">GEQ</span>
                        <span className="border-b-2 border-transparent text-muted-foreground px-2 py-0.5">Controls</span>
                      </div>

                      {/* D — Main graph */}
                      <div className="flex-1 relative bg-[#0a0a0a] border-b border-border">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-muted-foreground/40 text-lg font-bold">D  Main Graph Panel</span>
                        </div>
                        {/* Simulated RTA bars */}
                        <div className="absolute bottom-1 left-4 right-4 flex items-end gap-px" style={{ height: 44 }}>
                          {[10,14,8,22,18,12,30,24,16,10,20,15,9,18,13,8,6,10,7,5].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t-sm"
                              style={{
                                height: `${h * 3}%`,
                                background: h > 22 ? 'rgba(239,68,68,0.7)' : h > 15 ? 'rgba(234,179,8,0.6)' : 'rgba(99,102,241,0.5)',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* E + F — Bottom panels */}
                      <div className="flex" style={{ height: 52 }}>
                        <div className="flex-1 border-r border-border bg-card/20 flex items-center justify-center">
                          <span className="text-muted-foreground/50">E  Bottom Left</span>
                        </div>
                        <div className="flex-1 bg-card/20 flex items-center justify-center">
                          <span className="text-muted-foreground/50">F  Bottom Right</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* G — Status bar */}
                  <div className="border-t border-border bg-muted/40 px-3 py-1 flex gap-4 text-muted-foreground">
                    <span>G  <span className="text-green-500">LIVE</span></span>
                    <span>48 kHz · 4096 FFT · 11.7 Hz/bin</span>
                    <span>Floor: −72 dBFS</span>
                  </div>
                </div>
              </div>

              {/* ── Zone reference cards ── */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b border-border pb-1">Zone Reference</h3>

                <ZoneCard label="A" title="Algorithm Status Bar" accent="border-primary/30 bg-primary/10 text-primary">
                  Permanently visible at the top of the left sidebar. Shows the active detection
                  algorithm (MSD, Phase, Combined, or Auto), the detected content type (Speech,
                  Music, Compressed, Unknown), MSD frame accumulation count, and whether
                  dynamic compression is detected in the input signal. Use Settings &rarr;
                  Display &rarr; Show Algorithm Scores to reveal detailed numeric breakdowns.
                </ZoneCard>

                <ZoneCard label="B" title="Input Gain &amp; Level Meter" accent="border-blue-500/30 bg-blue-500/10 text-blue-400">
                  Drag the handle to trim the input signal before analysis (−40 dB to +40 dB,
                  default +15 dB). The horizontal bar shows real-time peak level in dBFS. Aim
                  for peaks around −12 dBFS during normal programme. Does not affect your
                  hardware gain — it is a digital analysis offset only.
                </ZoneCard>

                <ZoneCard label="C" title="Active Issues List" accent="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                  All currently detected feedback events sorted by severity. Each row shows
                  frequency, severity badge (RUNAWAY, GROWING, RESONANCE, RING, WHISTLE), and
                  classification label. <strong className="text-foreground">Apply</strong> pins
                  the frequency to the EQ Notepad.{' '}
                  <strong className="text-foreground">Dismiss</strong> hides it for this
                  session. RUNAWAY events pulse red and should be addressed immediately.
                </ZoneCard>

                <ZoneCard label="D" title="Main Graph Panel" accent="border-green-500/30 bg-green-500/10 text-green-400">
                  The large upper display. Switch between three views using the tab chips:
                  <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground text-xs">
                    <li>
                      <strong className="text-foreground">RTA</strong> — Real-Time Spectrum
                      Analyzer. Frequency on X (log, 20 Hz–20 kHz), amplitude on Y (dBFS).
                      Detected peaks are colour-coded by severity.
                    </li>
                    <li>
                      <strong className="text-foreground">GEQ</strong> — 31-Band Graphic EQ
                      view. Each ISO band shows the recommended notch depth. Taller bar = deeper
                      cut suggested.
                    </li>
                    <li>
                      <strong className="text-foreground">Controls</strong> — Start/Stop,
                      mode selector, frequency range, threshold sliders, and algorithm toggles.
                    </li>
                  </ul>
                </ZoneCard>

                <ZoneCard label="E / F" title="Bottom Panels" accent="border-purple-500/30 bg-purple-500/10 text-purple-400">
                  Two independently configurable smaller panels below the main graph. Each has
                  its own tab chip row (RTA, GEQ, Controls). By default E shows GEQ and F shows
                  Controls. They share the same live data as the main panel and update
                  simultaneously.
                </ZoneCard>

                <ZoneCard label="G" title="Status Bar" accent="border-border bg-muted/40 text-muted-foreground">
                  Shows running state, sample rate, FFT size, frequency resolution per bin, and
                  the adaptively estimated noise floor. The noise floor is measured continuously
                  and used to set the minimum detection threshold automatically.
                </ZoneCard>
              </div>

              {/* ── Header toolbar ── */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm border-b border-border pb-1">Header Toolbar</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Settings', desc: 'Full configuration. Detection thresholds, display options, room acoustic parameters (RT60, room dimensions), EQ advisor style, and algorithm tuning.' },
                    { label: 'History',  desc: 'Session log of all past detected issues with timestamps. Review a show or compare runs.' },
                    { label: 'Notepad',  desc: 'EQ Notepad. Applied issues appear here as pinned frequency cuts. Export as text for your console operator.' },
                    { label: 'Help',     desc: 'This panel.' },
                  ].map(item => (
                    <div key={item.label} className="rounded border border-border p-3 bg-card/30">
                      <div className="font-medium text-xs mb-1">{item.label}</div>
                      <div className="text-muted-foreground text-xs">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ OVERVIEW ═══════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-base mb-2">What is Kill The Ring?</h2>
                <p className="text-muted-foreground">
                  Kill The Ring is a browser-based acoustic feedback detection and analysis tool
                  for live sound engineers. It processes live microphone or line audio, identifies
                  feedback frequencies in real time using four independent peer-reviewed
                  algorithms, and provides actionable EQ recommendations to ring out a PA system
                  before or during a show.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Quick Start</h3>
                <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                  <li>Open <strong className="text-foreground">Settings</strong> and enter your room dimensions and RT60 if known — this improves acoustic context accuracy.</li>
                  <li>Set <strong className="text-foreground">Input Gain</strong> (Zone B) so peaks read around −12 dBFS during normal programme.</li>
                  <li>Press <strong className="text-foreground">Start</strong> in the Controls tab.</li>
                  <li>Run pink noise or programme material through the PA. Walk the room.</li>
                  <li>As issues appear in the sidebar (Zone C), press <strong className="text-foreground">Apply</strong> to note them, then notch those frequencies on your console GEQ.</li>
                  <li>Repeat until no new issues appear at operating gain.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Detection Pipeline</h3>
                <div className="space-y-2">
                  {[
                    { n: '1', title: 'FFT Analysis',            desc: 'Audio is windowed with a Hann function and transformed to the frequency domain using a 4096-point FFT at 48 kHz (11.7 Hz per bin).' },
                    { n: '2', title: 'Peak Detection',          desc: 'Local maxima above the adaptive noise floor are identified. Each peak is tracked across frames to build history of persistence, growth rate, and Q factor.' },
                    { n: '3', title: 'Multi-Algorithm Scoring', desc: 'Four algorithms — MSD, Phase Coherence, Spectral Flatness, and Comb Pattern — independently score each peak. See The Math tab for details.' },
                    { n: '4', title: 'Content-Aware Fusion',    desc: 'Scores are fused using weighted combination. Weights shift with detected content type (speech, music, compressed) to minimise false positives.' },
                    { n: '5', title: 'Acoustic Context',        desc: 'Room parameters (Schroeder frequency, modal density, reverberation Q) adjust probability estimates — a peak consistent with a room mode is less likely to be flagged.' },
                    { n: '6', title: 'Classification',          desc: 'The final probability maps to severity (RUNAWAY, GROWING, RESONANCE, RING, WHISTLE) and an EQ recommendation is generated.' },
                  ].map(item => (
                    <div key={item.n} className="flex gap-3 rounded border border-border p-3 bg-card/30">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{item.n}</div>
                      <div>
                        <div className="font-medium text-xs mb-0.5">{item.title}</div>
                        <div className="text-muted-foreground text-xs">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Operation Modes</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Feedback Hunt', desc: 'Default. Balanced sensitivity for general PA soundcheck. Good across speech and music.' },
                    { name: 'Aggressive',    desc: 'Maximum sensitivity for initial system calibration and ring-out.' },
                    { name: 'Vocal Ring',    desc: 'Tuned for speech frequencies (200 Hz–8 kHz). Reduces false positives from low-end room modes.' },
                    { name: 'Music-Aware',   desc: 'Reduced sensitivity during live performance. Increases thresholds to avoid reacting to loud sustained musical notes.' },
                    { name: 'Calibration',   desc: 'Ultra-sensitive. Use during initial setup to find every resonance before doors open.' },
                  ].map(m => (
                    <div key={m.name} className="rounded border border-border p-3 bg-card/30">
                      <div className="font-medium text-xs mb-0.5 text-primary">{m.name}</div>
                      <div className="text-muted-foreground text-xs">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ THE MATH ═══════════════════ */}
          {activeTab === 'math' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-semibold text-base mb-1">Detection Algorithms</h2>
                <p className="text-muted-foreground text-xs">
                  All four algorithms run simultaneously. Their scores are fused using
                  content-aware weights shown in section 5 below.
                </p>
              </div>

              {/* 1. MSD */}
              <MathSection title="1. Magnitude Slope Deviation (MSD)" badge="DAFx-16">
                <p className="text-muted-foreground text-xs mb-3">
                  Feedback amplitude grows at a near-constant rate in the dB domain — its
                  second derivative is close to zero. Music varies irregularly. MSD measures
                  the variance of the frame-to-frame magnitude slope.
                </p>
                <MathBlock>{`// For each frequency bin b over N frames:
slope[i]   = mag[i] − mag[i−1]          // first difference (dB/frame)
mean_slope = mean(slope)
MSD        = mean( (slope[i] − mean_slope)² )  // slope variance

// Energy gate (prevents false positives on silent bins):
if mean(mag) < −70 dBFS → skip bin

// Feedback score (threshold corrected to 0.1 from legacy 0.8):
feedbackScore = exp(−MSD / 0.1)
// MSD → 0 : score → 1.0 (steady growth = feedback)
// MSD → ∞ : score → 0.0 (irregular = music)`}</MathBlock>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Pill label="Threshold" value="0.1 dB²/frame²" />
                  <Pill label="Silence gate" value="−70 dBFS" />
                  <Pill label="Frame range" value="7 – 30 frames" />
                </div>
              </MathSection>

              {/* 2. Phase */}
              <MathSection title="2. Phase Coherence" badge="KU Leuven 2025 Eq. 4">
                <p className="text-muted-foreground text-xs mb-3">
                  A feedback tone has a fixed phase relationship across consecutive frames —
                  the inter-frame phase difference Δφ is nearly constant. Music has random Δφ.
                  Coherence is the magnitude of the mean phasor of all Δφ values.
                </p>
                <MathBlock>{`// Frame-to-frame phase differences (wrapped to [−π, π]):
Δφ[i] = φ[i] − φ[i−1],  wrapped to [−π, π]

// Mean phasor magnitude:
coherence = | (1/N) · Σ exp(j·Δφ[i]) |
           = sqrt( mean(cos Δφ)² + mean(sin Δφ)² )

// coherence ≈ 1.0  →  phase-locked  →  feedback
// coherence ≈ 0.0  →  random phase  →  music / noise`}</MathBlock>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Pill label="High (feedback)" value="≥ 0.70" />
                  <Pill label="Medium" value="0.50 – 0.69" />
                  <Pill label="Low (music)" value="< 0.30" />
                </div>
              </MathSection>

              {/* 3. Spectral Flatness */}
              <MathSection title="3. Spectral Flatness &amp; Kurtosis" badge="ISO 26101">
                <p className="text-muted-foreground text-xs mb-3">
                  Feedback produces a near-pure tone with very low spectral flatness and very
                  high excess kurtosis in the region around the peak. Music has moderate
                  flatness and near-Gaussian kurtosis.
                </p>
                <MathBlock>{`// Over ±10 bins around the peak (linear power):
geometric_mean  = exp( mean( log(power[i]) ) )
arithmetic_mean = mean( power[i] )
flatness        = geometric_mean / arithmetic_mean
//   → 0 = pure tone (spike)     → 1 = white noise (flat)

// Excess kurtosis (Fisher definition):
m2       = mean( (x − μ)² )
m4       = mean( (x − μ)⁴ )
kurtosis = m4 / m2² − 3
//   → 0 = Gaussian    → >> 0 = heavy-tailed / spiky

// Combined feedback score:
feedbackScore = (1 − flatness / 0.30) × 0.6
              + min(kurtosis / 10, 1)   × 0.4`}</MathBlock>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Pill label="Pure tone flatness" value="< 0.05" />
                  <Pill label="Music flatness" value="≈ 0.30" />
                  <Pill label="High kurtosis" value="> 10" />
                </div>
              </MathSection>

              {/* 4. Comb */}
              <MathSection title="4. Comb Filter Pattern Detection" badge="DBX paper">
                <p className="text-muted-foreground text-xs mb-3">
                  An acoustic feedback loop between a speaker and microphone separated by
                  distance d creates a comb filter with peaks at integer multiples of the
                  fundamental spacing Δf. Three or more matching peaks confirm a loop.
                </p>
                <MathBlock>{`// Acoustic path length from frequency spacing:
d = c / Δf       // c = 343 m/s (open acoustic path)
// Note: formula was previously d = c / (2·Δf) — that form
// applies to closed-tube standing waves, not an open PA loop.

// Pattern matching:
for each candidate spacing Δf between peak pairs:
  predicted = [ Δf, 2·Δf, 3·Δf, ... ]
  matchCount = peaks within ±5% of any predicted frequency

// Confirmed if matchCount ≥ 3
confidence = matchCount / totalPeaks   // (normalised)`}</MathBlock>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Pill label="Min matching peaks" value="3" />
                  <Pill label="Spacing tolerance" value="±5%" />
                  <Pill label="Max path length" value="50 m" />
                </div>
              </MathSection>

              {/* 5. Fusion */}
              <MathSection title="5. Content-Aware Score Fusion" badge="Internal">
                <p className="text-muted-foreground text-xs mb-3">
                  The four algorithm scores are combined using a weighted sum. Weights shift
                  based on detected content type — e.g. music legitimately triggers high phase
                  coherence, so the phase weight is reduced for music content.
                </p>
                <MathBlock>{`pFeedback = w_msd      · msd_score
           + w_phase     · phase_score
           + w_spectral  · spectral_score
           + w_comb      · comb_score
           + w_classical · classical_score

//           MSD    Phase  Spectral  Comb  Classical
// Default:  0.35   0.30   0.15      0.10  0.10
// Speech:   0.45   0.25   0.15      0.05  0.10
// Music:    0.20   0.40   0.15      0.10  0.15
// Compressed: 0.15 0.45   0.20      0.10  0.10`}</MathBlock>
              </MathSection>

              {/* Room acoustics */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b border-border pb-1">Room Acoustic Adjustments</h3>
                <p className="text-muted-foreground text-xs">
                  These corrections are applied to pFeedback after the fusion step to account
                  for room-mode behaviour, which can mimic feedback signatures.
                </p>

                <MathSection title="Schroeder Frequency" badge="Hopkins §1.1">
                  <MathBlock>{`f_S = 2000 · sqrt(T₆₀ / V)
// T₆₀ = reverberation time (s),  V = room volume (m³)
// Clamped to 50–500 Hz
// Sets the boundary between modal (discrete modes)
// and statistical (dense, overlapping modes) behaviour`}</MathBlock>
                </MathSection>

                <MathSection title="Modal Overlap Indicator" badge="Hopkins §1.2.6.7">
                  <MathBlock>{`M_indicator = 1 / Q       // Q = f / Δf₃dB
// M < 0.03  (Q > 33): sharp isolated peak  → more likely feedback
// M ≈ 0.10  (Q ≈ 10): moderate resonance   → ambiguous
// M > 0.33  (Q  < 3): broad, overlapping   → less likely feedback`}</MathBlock>
                </MathSection>

                <MathSection title="Reverberation Q Adjustment" badge="Hopkins §1.2.6.3">
                  <MathBlock>{`// Natural 3 dB bandwidth of a room mode at frequency f:
Δf_room = 6.9 / (π · T₆₀)
Q_room  = π · f · T₆₀ / 6.9

ratio = Q_measured / Q_room

// ratio ≤ 1.0 : no sharper than room decay  → pFeedback − 0.10
// ratio 1–3×  : transitional                → pFeedback + 0.04
// ratio ≥ 3.0 : far sharper than room decay → pFeedback + 0.12`}</MathBlock>
                </MathSection>
              </div>
            </div>
          )}

          {/* ═══════════════════ GLOSSARY ═══════════════════ */}
          {activeTab === 'glossary' && (
            <div className="space-y-3">
              <h2 className="font-semibold text-base mb-3">Glossary</h2>
              {[
                { term: 'Feedback',          def: 'A self-sustaining loop where a microphone picks up its own amplified output from a speaker. Results in a howl or squeal.' },
                { term: 'Ring',              def: 'A sustained resonance that does not yet howl but adds coloration and masks clarity. Typically a lower-severity precursor to full feedback.' },
                { term: 'Runaway',           def: 'Highest severity. The feedback loop has positive gain — the signal is growing frame over frame and will escalate to a howl imminently.' },
                { term: 'Q Factor',          def: 'Quality factor of a resonance. Q = f / Δf₃dB. High Q = narrow, sharp peak. Low Q = broad, gentle peak. Feedback peaks typically have very high Q.' },
                { term: 'RT60 (T₆₀)',        def: 'Reverberation time. Time for sound to decay 60 dB after the source stops. Longer RT60 = more reverberant room. Typical venues: 0.5–2.5 s.' },
                { term: 'Schroeder Frequency', def: 'Transition frequency below which a room behaves modally (discrete modes) and above which it behaves statistically. Typically 100–300 Hz in a performance venue.' },
                { term: 'Modal Density',     def: 'Number of room modes per Hz at a given frequency. Increases with frequency. High modal density makes individual mode identification difficult.' },
                { term: 'MSD',               def: 'Magnitude Slope Deviation. Low MSD means the magnitude at a frequency bin is growing at a constant rate — the signature of feedback. Threshold: 0.1 dB²/frame².' },
                { term: 'Phase Coherence',   def: 'How consistent the inter-frame phase relationship is at a given frequency. Feedback → coherence ≈ 1.0. Music and noise → coherence ≈ 0.' },
                { term: 'Spectral Flatness', def: 'Ratio of geometric to arithmetic mean of power in a spectral region. Near 0 = pure tone (spike). Near 1 = white noise (flat).' },
                { term: 'Comb Filter',       def: 'A filter with regularly spaced peaks and nulls due to the acoustic round-trip delay between speaker and microphone. Spacing reveals the physical path length.' },
                { term: 'Content Type',      def: 'Auto-detected signal type: Speech, Music, Compressed, or Unknown. Determines which fusion weights are applied.' },
                { term: 'Compression',       def: 'Dynamic compression reduces crest factor. Compressed signals can cause false MSD positives — the system detects this and shifts weight to Phase Coherence.' },
                { term: 'GEQ',               def: '31-Band Graphic Equalizer. Standard 1/3-octave ISO bands from 20 Hz to 20 kHz. The primary tool for ringing out a PA.' },
                { term: 'RTA',               def: 'Real-Time Analyzer. Live frequency spectrum display. Frequency on X (log), amplitude on Y (dBFS).' },
                { term: 'dBFS',              def: 'Decibels relative to full scale. 0 dBFS = maximum digital amplitude. Target peaks around −12 to −6 dBFS for clean analysis.' },
                { term: 'Noise Floor',       def: 'Ambient background level in the frequency domain. Estimated adaptively and used to set the minimum detection threshold automatically.' },
              ].map(item => (
                <div key={item.term} className="rounded border border-border p-3 bg-card/30">
                  <div className="font-semibold text-xs text-primary mb-1">{item.term}</div>
                  <div className="text-muted-foreground text-xs">{item.def}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ZoneCard({
  label,
  title,
  accent,
  children,
}: {
  label: string
  title: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded border p-3 text-xs ${accent}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-bold border border-current rounded px-1.5 py-0.5 text-[10px]">{label}</span>
        <span className="font-semibold" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

function MathSection({
  title,
  badge,
  children,
}: {
  title: string
  badge: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded border border-border p-4 bg-card/30 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm" dangerouslySetInnerHTML={{ __html: title }} />
        <Badge variant="outline" className="text-[10px]">{badge}</Badge>
      </div>
      {children}
    </div>
  )
}

function MathBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted/40 rounded p-3 text-[11px] font-mono leading-5 overflow-x-auto whitespace-pre text-muted-foreground border border-border">
      {children}
    </pre>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border p-2 bg-muted/30 text-center">
      <div className="text-muted-foreground text-[10px] mb-0.5">{label}</div>
      <div className="font-mono font-semibold text-xs text-foreground">{value}</div>
    </div>
  )
}
