import { streamText, tool, convertToModelMessages } from 'ai'
import { z } from 'zod'
import type { Advisory } from '@/types/advisory'

// Context passed from client
interface AnalysisContext {
  advisories: Advisory[]
  settings: {
    mode: string
    feedbackThresholdDb: number
    ringThresholdDb: number
    growthRateThreshold: number
    musicAware: boolean
    eqPreset: string
  }
  isRunning: boolean
}

interface AgentConfig {
  model: string
  temperature: number
  systemPrompt: string
}

// Helper to format frequency for display
function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(2)}kHz`
  }
  return `${hz.toFixed(0)}Hz`
}

// Helper to get pitch name from frequency
function getPitchName(hz: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const a4 = 440
  const semitones = 12 * Math.log2(hz / a4)
  const noteIndex = Math.round(semitones) + 9 // A4 is index 9
  const octave = Math.floor((noteIndex + 3) / 12) + 4
  const note = noteNames[((noteIndex % 12) + 12) % 12]
  const cents = Math.round((semitones - Math.round(semitones)) * 100)
  const centsStr = cents >= 0 ? `+${cents}` : `${cents}`
  return `${note}${octave} (${centsStr}c)`
}

// Build context-aware system prompt
function buildSystemPrompt(basePrompt: string, context: AnalysisContext): string {
  let contextInfo = '\n\n---\nCURRENT SYSTEM STATE:\n'
  
  if (!context.isRunning) {
    contextInfo += '⚠️ Analysis is currently STOPPED. No live data available.\n'
  } else {
    contextInfo += `✓ Analysis is RUNNING in "${context.settings.mode}" mode.\n`
    contextInfo += `Settings: Feedback threshold ${context.settings.feedbackThresholdDb}dB, Ring threshold ${context.settings.ringThresholdDb}dB, EQ preset: ${context.settings.eqPreset}\n`
  }
  
  if (context.advisories.length > 0) {
    contextInfo += `\nACTIVE ISSUES (${context.advisories.length}):\n`
    context.advisories.forEach((adv, i) => {
      const pitch = getPitchName(adv.trueFrequencyHz)
      contextInfo += `${i + 1}. ${adv.severity} ${adv.label} at ${formatFrequency(adv.trueFrequencyHz)} (${pitch})\n`
      contextInfo += `   Amplitude: ${adv.trueAmplitudeDb.toFixed(1)}dB, Q: ${adv.qEstimate.toFixed(1)}, Growth: ${adv.velocityDbPerSec.toFixed(1)}dB/s\n`
      contextInfo += `   Suggested: ${adv.advisory.peq.type} cut ${Math.abs(adv.advisory.peq.gainDb).toFixed(1)}dB at ${formatFrequency(adv.advisory.peq.hz)} Q=${adv.advisory.peq.q.toFixed(1)}\n`
    })
  } else if (context.isRunning) {
    contextInfo += '\n✓ No feedback issues currently detected.\n'
  }
  
  return basePrompt + contextInfo
}

export async function POST(req: Request) {
  const body = await req.json() as {
    messages?: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>
    context: AnalysisContext
    agentSettings: AgentConfig
  }

  const { context, agentSettings } = body
  const messages = Array.isArray(body.messages) ? body.messages : []

  // Define tools for the sound engineer assistant
  const tools = {
    analyzeCurrentIssues: tool({
      description: 'Analyze the current feedback issues detected by the system and provide a summary',
      inputSchema: z.object({
        focusOn: z.enum(['all', 'worst', 'growing', 'resonance']).default('all').describe('Which issues to focus the analysis on'),
      }),
      execute: async ({ focusOn }) => {
        if (!context.isRunning) {
          return { summary: 'Analysis is not running. Start the analyzer to detect feedback issues.' }
        }
        
        let issues = context.advisories
        if (focusOn === 'worst') {
          issues = issues.filter(a => a.severity === 'RUNAWAY' || a.severity === 'GROWING')
        } else if (focusOn === 'growing') {
          issues = issues.filter(a => a.velocityDbPerSec > 1)
        } else if (focusOn === 'resonance') {
          issues = issues.filter(a => a.label === 'POSSIBLE_RING' || a.severity === 'RESONANCE')
        }
        
        if (issues.length === 0) {
          return { summary: `No ${focusOn === 'all' ? '' : focusOn + ' '}issues detected at this moment.` }
        }
        
        return {
          count: issues.length,
          issues: issues.map(a => ({
            frequency: `${formatFrequency(a.trueFrequencyHz)} (${getPitchName(a.trueFrequencyHz)})`,
            severity: a.severity,
            type: a.label,
            amplitude: `${a.trueAmplitudeDb.toFixed(1)}dB`,
            qFactor: a.qEstimate.toFixed(1),
            growthRate: `${a.velocityDbPerSec.toFixed(1)}dB/s`,
            suggestedCut: `${Math.abs(a.advisory.peq.gainDb).toFixed(1)}dB at ${formatFrequency(a.advisory.peq.hz)} Q=${a.advisory.peq.q.toFixed(1)}`,
          })),
          recommendation: issues.length > 3 
            ? 'Multiple issues detected. Consider addressing the highest amplitude ones first.'
            : 'Focus on the detected frequencies for immediate cuts.',
        }
      },
    }),

    suggestEQCuts: tool({
      description: 'Generate specific EQ cut recommendations based on detected issues',
      inputSchema: z.object({
        style: z.enum(['surgical', 'heavy', 'auto']).default('auto').describe('EQ cut style - surgical (narrow/deep) or heavy (wide/moderate)'),
        maxCuts: z.number().min(1).max(10).default(5).describe('Maximum number of cuts to suggest'),
      }),
      execute: async ({ style, maxCuts }) => {
        if (context.advisories.length === 0) {
          return { message: 'No issues detected to generate EQ recommendations.' }
        }
        
        const effectiveStyle = style === 'auto' ? context.settings.eqPreset : style
        const sorted = [...context.advisories].sort((a, b) => b.trueAmplitudeDb - a.trueAmplitudeDb)
        const topIssues = sorted.slice(0, maxCuts)
        
        return {
          style: effectiveStyle,
          cuts: topIssues.map(a => {
            const q = effectiveStyle === 'surgical' ? Math.max(a.qEstimate, 8) : Math.min(a.qEstimate, 4)
            const gain = effectiveStyle === 'surgical' 
              ? Math.min(-6, a.advisory.peq.gainDb * 1.2)
              : Math.max(-4, a.advisory.peq.gainDb * 0.8)
            
            return {
              frequency: formatFrequency(a.trueFrequencyHz),
              pitch: getPitchName(a.trueFrequencyHz),
              gain: `${gain.toFixed(1)}dB`,
              q: q.toFixed(1),
              priority: a.severity === 'RUNAWAY' ? 'URGENT' : a.severity === 'GROWING' ? 'HIGH' : 'NORMAL',
              geqBand: `${a.advisory.geq.bandHz}Hz (Band ${a.advisory.geq.bandIndex + 1})`,
            }
          }),
          note: effectiveStyle === 'surgical' 
            ? 'Surgical cuts: Narrow bandwidth, deeper cuts. Minimizes tonal impact.'
            : 'Heavy cuts: Wider bandwidth, moderate depth. Faster to dial in.',
        }
      },
    }),

    explainIssue: tool({
      description: 'Explain what a specific frequency issue means and why it might be occurring',
      inputSchema: z.object({
        frequencyHz: z.number().describe('The frequency in Hz to explain'),
      }),
      execute: async ({ frequencyHz }) => {
        const issue = context.advisories.find(a => 
          Math.abs(a.trueFrequencyHz - frequencyHz) < 50
        )
        
        const pitch = getPitchName(frequencyHz)
        let explanation = `Frequency: ${formatFrequency(frequencyHz)} (${pitch})\n\n`
        
        // Common frequency ranges
        if (frequencyHz < 250) {
          explanation += 'LOW FREQUENCY RANGE: Often caused by proximity effect, stage rumble, or HVAC. Consider HPF on vocals.'
        } else if (frequencyHz < 500) {
          explanation += 'LOW-MID RANGE: "Boxy" or "muddy" frequencies. Common in small rooms with parallel walls.'
        } else if (frequencyHz < 1000) {
          explanation += 'MID RANGE: Nasal/honky frequencies. Often related to vocal mic placement or room modes.'
        } else if (frequencyHz < 2500) {
          explanation += 'UPPER-MID RANGE: Critical for speech intelligibility. Feedback here often from monitors.'
        } else if (frequencyHz < 5000) {
          explanation += 'PRESENCE RANGE: Harsh or piercing. Common feedback frequency for dynamic mics.'
        } else {
          explanation += 'HIGH FREQUENCY RANGE: Sibilance and air. Usually from condenser mics or tweeters.'
        }
        
        if (issue) {
          explanation += `\n\nDetected as: ${issue.label} (${issue.severity})`
          explanation += `\nQ Factor: ${issue.qEstimate.toFixed(1)} - ${issue.qEstimate > 10 ? 'Very narrow (likely feedback)' : issue.qEstimate > 5 ? 'Moderate width' : 'Wide (possibly resonance)'}`
          explanation += `\nGrowth Rate: ${issue.velocityDbPerSec.toFixed(1)}dB/s - ${issue.velocityDbPerSec > 3 ? 'Fast buildup (act quickly!)' : issue.velocityDbPerSec > 1 ? 'Moderate growth' : 'Stable/slow'}`
        }
        
        return { explanation }
      },
    }),

    getSessionSummary: tool({
      description: 'Provide a summary of the current session and detected patterns',
      inputSchema: z.object({}),
      execute: async () => {
        const summary = {
          status: context.isRunning ? 'Running' : 'Stopped',
          mode: context.settings.mode,
          totalIssues: context.advisories.length,
          byType: {
            feedback: context.advisories.filter(a => a.label === 'ACOUSTIC_FEEDBACK').length,
            whistle: context.advisories.filter(a => a.label === 'WHISTLE').length,
            ring: context.advisories.filter(a => a.label === 'POSSIBLE_RING').length,
            instrument: context.advisories.filter(a => a.label === 'INSTRUMENT').length,
          },
          bySeverity: {
            runaway: context.advisories.filter(a => a.severity === 'RUNAWAY').length,
            growing: context.advisories.filter(a => a.severity === 'GROWING').length,
            resonance: context.advisories.filter(a => a.severity === 'RESONANCE').length,
          },
          frequencyRanges: {
            low: context.advisories.filter(a => a.trueFrequencyHz < 500).length,
            mid: context.advisories.filter(a => a.trueFrequencyHz >= 500 && a.trueFrequencyHz < 2000).length,
            high: context.advisories.filter(a => a.trueFrequencyHz >= 2000).length,
          },
        }
        
        let recommendation = ''
        if (summary.frequencyRanges.low > summary.frequencyRanges.mid + summary.frequencyRanges.high) {
          recommendation = 'Many low-frequency issues detected. Check for proximity effect, rumble, or consider high-pass filters.'
        } else if (summary.bySeverity.runaway > 0) {
          recommendation = 'URGENT: Runaway feedback detected. Address immediately to prevent system damage.'
        } else if (summary.byType.ring > summary.byType.feedback) {
          recommendation = 'More resonances than feedback. Room treatment or notch filters may help long-term.'
        }
        
        return { ...summary, recommendation }
      },
    }),
  }

  // Build the context-aware system prompt
  const systemPrompt = buildSystemPrompt(agentSettings.systemPrompt, context)

  // Convert UIMessages to model messages and stream the response
  const result = streamText({
    model: agentSettings.model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    temperature: agentSettings.temperature,
    maxSteps: 5, // Allow multiple tool calls per response
  })

  return result.toUIMessageStreamResponse()
}
