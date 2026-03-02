# Kill The Ring

**Real-time acoustic feedback and ring detection for live sound engineers.**

Kill The Ring analyzes a microphone input in the browser using the Web Audio API, identifies feedback frequencies, resonant rings, and problematic tones, and delivers specific GEQ/PEQ cut recommendations with pitch translation — all without any server round-trips. Default settings are tuned for corporate/conference PA systems with a vocal-focused frequency range of 200 Hz – 8 kHz.

Built by [Don Wells AV](https://donwellsav.com).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [DSP Architecture](#dsp-architecture)
- [Detection Engine](#detection-engine)
- [Operation Modes](#operation-modes)
- [Settings Reference](#settings-reference)
- [EQ Recommendations](#eq-recommendations)
- [Severity Levels](#severity-levels)
- [Logging and Export](#logging-and-export)
- [Session History](#session-history)
- [Default Configuration](#default-configuration)
- [Browser Requirements](#browser-requirements)
- [Development](#development)

---

## Features

- **Real-time FFT spectrum analysis** via Web Audio API (4096, 8192, or 16384 bins)
- **Three simultaneous live visualizations:** RTA Spectrum, 31-Band GEQ, and Waterfall — all switchable and clickable
- **Waterfall time axis** — real elapsed-time gridlines (auto-scaling 1s–30s) instead of fixed labels
- **Adaptive noise floor** — dynamically adjusts to the room environment
- **Peak detection with quadratic interpolation** for sub-bin frequency accuracy
- **Harmonic tracking** — suppresses harmonics (up to 8th) of detected fundamentals to reduce clutter
- **Weighted classifier** — distinguishes acoustic feedback from whistles and instruments using stability, harmonicity, modulation, sideband noise, and growth rate
- **GEQ band mapping** to ISO 31-band center frequencies with cut depth recommendations
- **PEQ recommendations** with filter type (bell/notch/HPF/LPF), Q estimation from −3 dB bandwidth, and gain
- **Pitch translation** — every detected frequency shown as a musical note (e.g. A4, C#3 +15 cents)
- **5 operation modes** from ultra-sensitive calibration to music-aware performance monitoring
- **Auto Music-Aware mode** — automatically switches sensitivity based on signal level vs. noise floor (configurable hysteresis)
- **Frequency range presets** — Vocal / Monitor / Full / Sub quick-switch chips
- **EQ Notepad** — apply cuts from issue cards and accumulate them in a persistent notepad with one-click copy
- **Session history** — per-session frequency histogram (ISO 31-band) with dominant severity coloring and most-active-bands breakdown
- **Session event logger** with CSV, JSON, and plain text export
- **Sidebar detection controls** for real-time threshold adjustment without leaving the workflow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS v4 |
| Audio | Web Audio API (`AnalyserNode`) |
| Visualization | HTML5 Canvas (custom rendering) |
| Database | Neon (PostgreSQL via `@neondatabase/serverless`) |
| State | React hooks (`useState`, `useCallback`, `useRef`) |

No external audio processing libraries. All DSP runs in the browser.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (preferred), npm, or yarn
- A modern browser with Web Audio API support (Chrome, Firefox, Edge, Safari 14.1+)
- Microphone access (HTTPS required in production)

### Installation

```bash
# Clone the repository
git clone https://github.com/donwellsav/v0sucks-killthering2.git
cd v0sucks-killthering2

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), grant microphone permission, and click **Start**.

### Using the shadcn CLI (recommended for fresh install)

```bash
npx shadcn@latest init
```

---

## Project Structure

```
kill-the-ring/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Entry point — renders KillTheRing
│   └── sessions/
│       ├── page.tsx            # Sessions list page
│       └── [id]/
│           └── page.tsx        # Session detail — frequency histogram + stats
├── components/
│   ├── kill-the-ring/
│   │   ├── KillTheRing.tsx       # Main orchestration component
│   │   ├── SpectrumCanvas.tsx    # RTA Spectrum visualization
│   │   ├── GEQBarView.tsx        # 31-Band GEQ bar visualization
│   │   ├── WaterfallCanvas.tsx   # Waterfall history with real time axis
│   │   ├── IssuesList.tsx        # Active issues list with Apply buttons
│   │   ├── EQNotepad.tsx         # Accumulated applied cuts with copy export
│   │   ├── FrequencyHistogram.tsx # ISO 31-band histogram canvas (session detail)
│   │   ├── InputMeterSlider.tsx  # Combined input gain + level meter
│   │   ├── SettingsPanel.tsx     # Advanced settings dialog
│   │   ├── DetectionControls.tsx # Sidebar mode/threshold controls
│   │   ├── HelpMenu.tsx          # Full help documentation dialog
│   │   ├── LogsViewer.tsx        # Session event log dialog with export
│   │   └── SessionsTable.tsx     # Sessions list table with clickable rows
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useAudioAnalyzer.ts     # Main React hook — audio analyzer lifecycle
│   ├── useAdvisoryLogging.ts   # Logs advisories to the event logger
│   └── useAnimationFrame.ts    # rAF utility hook
├── lib/
│   ├── audio/
│   │   └── createAudioAnalyzer.ts   # AudioAnalyzer factory — bridges DSP and React
│   ├── db/
│   │   └── sessions.ts              # Neon DB layer: sessions, events, frequency stats
│   ├── dsp/
│   │   ├── feedbackDetector.ts      # Core FFT analysis and peak detection engine
│   │   ├── classifier.ts            # Weighted feedback/whistle/instrument classifier
│   │   ├── eqAdvisor.ts             # GEQ/PEQ recommendation generator
│   │   ├── trackManager.ts          # Peak track lifecycle management
│   │   └── constants.ts             # ISO bands, severity thresholds, mode presets, freq range presets
│   ├── logging/
│   │   └── eventLogger.ts           # In-session event logger with export
│   └── utils/
│       ├── mathHelpers.ts           # DSP math: median, prefix sums, interpolation
│       └── pitchUtils.ts            # Hz → note/octave/cents conversion
└── types/
    └── advisory.ts                  # All TypeScript types and interfaces
```

---

## DSP Architecture

```
Microphone → MediaStream → AnalyserNode (passive, no output)
                                ↓
                    rafLoop (requestAnimationFrame)
                                ↓
                    analyze() every analysisIntervalMs (20ms default)
                                ↓
              getFloatFrequencyData() → Float32Array (freqDb)
                                ↓
              Apply input gain + A-weighting (optional) + clamp
                                ↓
              Build power array + prefix sum for neighborhood averaging
                                ↓
              Update adaptive noise floor (EMA attack/release)
                                ↓
              For each bin in [startBin, endBin]:
                • Local max check (prominence filter)
                • Neighborhood background level via prefix sum
                • Prominence threshold gate
                • Quadratic interpolation → true frequency + amplitude
                • Hold timer (sustainMs) → confirmed peak
                • Harmonic suppression (up to 8th harmonic, 1.5% tolerance)
                • Q estimation from −3 dB bandwidth
                • onPeakDetected callback → TrackManager
                                ↓
              TrackManager → classify (Classifier) → EQ advisor → Advisory
                                ↓
              React state update → UI render
```

**Key design decision:** The `AnalyserNode` is connected in passive/analysis-only mode — no audio routing to the output. Kill The Ring never affects the actual audio signal.

---

## Detection Engine

### `FeedbackDetector` (`lib/dsp/feedbackDetector.ts`)

The core class wrapping `AnalyserNode`. Key parameters:

| Parameter | Default | Description |
|---|---|---|
| `fftSize` | 8192 | FFT window size. Higher = better low-freq resolution, slower updates |
| `analysisIntervalMs` | 20 ms | How often to run analysis in the rAF loop |
| `sustainMs` | 250 ms | How long a peak must persist before triggering |
| `clearMs` | 400 ms | How long a peak must be absent before clearing |
| `relativeThresholdDb` | 18 dB | Peak must exceed local background by this much |
| `prominenceDb` | 12 dB | Minimum prominence above the neighborhood average |
| `neighborhoodBins` | 8 | Bins each side for background level calculation (±2 excluded) |

### Noise Floor

An adaptive noise floor is estimated using a configurable number of spectral samples across the analysis range. It uses separate attack (200 ms) and release (1000 ms) time constants implemented as exponential moving averages, allowing it to track quiet environments quickly and recover slowly after loud transients.

### Quadratic Interpolation

True peak frequency is estimated using parabolic interpolation between the peak bin and its neighbors, providing sub-bin accuracy that is critical for meaningful musical pitch display.

---

## Operation Modes

| Mode | Threshold | Ring | Growth | Use Case |
|---|---|---|---|---|
| **Feedback Hunt** (default) | 8 dB | 5 dB | 2 dB/s | General PA monitoring and soundcheck |
| **Aggressive** | 6 dB | 3 dB | 1 dB/s | System calibration, pre-show ring-out |
| **Vocal Ring** | 6 dB | 4 dB | 1.5 dB/s | Monitor mix tuning, vocal-focused systems |
| **Music-Aware** | 12 dB | 7 dB | 3 dB/s | During live performance, reduces false positives |
| **Calibration** | 4 dB | 2 dB | 0.5 dB/s | Initial setup with pink noise or gain sweep |

Selecting a mode applies all three thresholds simultaneously. Individual sliders in the sidebar override per-parameter after a mode is selected.

### Auto Music-Aware

The **Auto Music-Aware** toggle watches `spectrum.peak` vs `noiseFloor + hysteresis` and automatically switches the `musicAware` flag on/off with a 1-second debounce. A Speech/Music pill indicator shows the current automatic state. The hysteresis threshold defaults to 15 dB above the noise floor and is adjustable in Settings.

### Frequency Range Presets

Four preset chips instantly update `minFrequency`/`maxFrequency`:

| Preset | Range | Use Case |
|---|---|---|
| Vocal | 200–8000 Hz | Speech PA, vocal monitors (default) |
| Monitor | 300–3000 Hz | Core intelligibility band, monitor wedges |
| Full | 20–20000 Hz | Full-range calibration |
| Sub | 20–250 Hz | Subwoofer monitoring |

---

## Settings Reference

### Analysis Tab

| Setting | Range | Default | Description |
|---|---|---|---|
| FFT Size | 4096 / 8192 / 16384 | 8192 | Frequency resolution vs. response speed |
| Spectrum Smoothing | 0 – 95% | 60% | Frame averaging to reduce visual noise |
| Hold Time | 0.5 – 5 s | 3 s | How long issues remain visible after disappearing |
| Input Gain | 0 – +30 dB | +12 dB | Software boost applied before analysis only |

### Display Tab

| Setting | Range | Default | Description |
|---|---|---|---|
| Graph Label Size | 8 – 26 px | 15 px | Font size for canvas frequency and dB labels |
| Max Issues Shown | 3 – 12 | 6 | Limits the active issues list length |
| EQ Style | Surgical / Heavy | Surgical | Surgical = narrow Q (8–16), Heavy = wide Q (2–4) |

### Sidebar Detection Controls

| Control | Maps To | Range | Default |
|---|---|---|---|
| Mode pills | `mode` | 5 presets | Feedback Hunt |
| Freq Range chips | `minFrequency` / `maxFrequency` | 4 presets | Vocal |
| Auto Music-Aware | `autoMusicAware` | toggle | off |
| Threshold slider | `feedbackThresholdDb` | 2 – 20 dB | 8 dB |
| Ring slider | `ringThresholdDb` | 1 – 12 dB | 5 dB |
| Growth slider | `growthRateThreshold` | 0.5 – 8 dB/s | 2 dB/s |

---

## EQ Recommendations

Every detected advisory includes both GEQ and PEQ recommendations generated by `lib/dsp/eqAdvisor.ts`.

### GEQ

Maps the detected frequency to the nearest **ISO 31-band center frequency** (1/3 octave spacing, 20 Hz – 20 kHz). Suggests a cut depth based on severity and EQ style preset.

### PEQ

Provides exact frequency, Q factor (blended from preset and measured −3 dB bandwidth), gain, and filter type:

- `bell` — standard parametric cut
- `notch` — very narrow, deep cut for runaway feedback
- `HPF` — high-pass filter for sub-80 Hz rumble
- `LPF` — low-pass filter for above 12 kHz

### Cut Depths by Severity

| Severity | Surgical | Heavy |
|---|---|---|
| RUNAWAY | −18 dB | −12 dB |
| GROWING | −9 dB | −6 dB |
| RESONANCE | −4 dB | −3 dB |
| POSSIBLE RING | −3 dB | −3 dB |

### EQ Notepad

Pressing **Apply** on an issue card logs the GEQ band, cut depth, PEQ Q, and gain to the **EQ Notepad** sidebar tab. The notepad accumulates all applied cuts for the session. The **Copy** button exports them as formatted text suitable for pasting into a console note or text file. Applied cuts are stored in component state and cleared on page reload.

---

## Severity Levels

| Level | Color | Meaning |
|---|---|---|
| **RUNAWAY** | Red | Active feedback rapidly increasing — act immediately |
| **GROWING** | Orange | Feedback building, not yet critical |
| **RESONANCE** | Yellow | Stable resonant peak that could become feedback |
| **POSSIBLE RING** | Purple | Subtle ring, may need attention |
| **WHISTLE** | Cyan | Detected whistle or sibilance |
| **INSTRUMENT** | Green | Likely musical content, not feedback |

---

## Logging and Export

`lib/logging/eventLogger.ts` maintains an in-session event log (singleton) that records:

- Analysis start/stop events
- Every detected issue (frequency, amplitude, severity, classification, Q, bandwidth, pitch)
- Settings changes
- Export events

**Export formats:**
- **CSV** — opens in Excel/Sheets; one row per event
- **JSON** — complete data structure for programmatic analysis
- **Plain Text** — formatted human-readable report

Logs are stored in memory for the session duration and cleared on page reload. Export before closing.

Session events are also persisted to the **Neon database** in the `session_events` table and are queryable through the Sessions history page.

---

## Session History

The `/sessions` page lists all recorded sessions. Each row links to a **session detail page** (`/sessions/[id]`) which shows:

- **Stats strip** — total issues, unique frequency bands, hottest frequency, dominant severity
- **Frequency Distribution histogram** — ISO 31-band canvas chart, bar height = event count, bar color = dominant severity
- **Most Active Bands table** — top 5 bands with severity label, proportional bar, and event count
- **Legend** — all detected severities with their counts

The histogram is useful for identifying persistent venue resonances across multiple sessions and building venue-specific EQ starting points.

---

## Default Configuration

Optimized for corporate/conference PA systems with vocal focus:

```
Mode:               Feedback Hunt
Frequency range:    200 Hz – 8 kHz (Vocal preset)
Feedback threshold: 8 dB
Ring threshold:     5 dB
Growth rate:        2 dB/s
FFT size:           8192
Smoothing:          60%
Hold time:          3 s
Input gain:         +12 dB
EQ style:           Surgical
Auto Music-Aware:   off (hysteresis: 15 dB)
```

---

## Browser Requirements

- **Chrome / Edge 89+** — full support, recommended
- **Firefox 76+** — full support
- **Safari 14.1+** — supported; Safari may prompt for mic permission differently
- HTTPS or `localhost` required for `getUserMedia`
- Web Audio API required (all modern browsers)

---

## Development

```bash
# Development server (Turbopack)
pnpm dev

# Type check
pnpm tsc --noEmit

# Build for production
pnpm build

# Start production server
pnpm start
```

### Adding a New Operation Mode

1. Add the mode key to `OperationMode` in `types/advisory.ts`
2. Add mode settings to `OPERATION_MODES` in `lib/dsp/constants.ts`
3. Mode pills are auto-generated from OPERATION_MODES in `DetectionControls.tsx`
4. Add filtering logic to `shouldReportIssue()` in `lib/dsp/classifier.ts`
5. Update the Help menu in `HelpMenu.tsx` and the modes table above

### Modifying Detection Thresholds

All tunable constants live in `lib/dsp/constants.ts`:

- `DEFAULT_SETTINGS` — default values for all `DetectorSettings` fields including `autoMusicAwareHysteresisDb`
- `FREQ_RANGE_PRESETS` — the four frequency range preset definitions
- `SEVERITY_THRESHOLDS` — velocity and Q thresholds for severity classification
- `CLASSIFIER_WEIGHTS` — weighted scoring for feedback vs. whistle vs. instrument
- `EQ_PRESETS` — cut depths and Q factors per preset
- `SPECTRAL_TRENDS` — thresholds for shelf/filter suggestions (rumble, mud, harshness)

### Database

Sessions and events are stored in Neon PostgreSQL. The schema lives in `lib/db/sessions.ts`. Key functions:

- `createSession()` / `endSession()` — session lifecycle
- `insertSessionEvents()` — batch event flush (every 30s)
- `getSessionFrequencyStats()` — ISO 31-band histogram aggregation for session detail page

---

## License

Copyright © Don Wells AV. All rights reserved.
