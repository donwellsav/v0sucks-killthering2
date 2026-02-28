// Preset configuration system for Kill The Ring detection modes

import type { DetectorSettings } from '@/types/advisory'

export interface DetectionPreset extends Partial<DetectorSettings> {
  id: string
  name: string
  description: string
  category: 'built-in' | 'custom'
  useCase: string
  tags: string[]
}

// Built-in presets for common scenarios
export const BUILT_IN_PRESETS: Record<string, DetectionPreset> = {
  'live-pa': {
    id: 'live-pa',
    name: 'Live PA',
    category: 'built-in',
    description: 'Aggressive detection for main PA system feedback control',
    useCase: 'Live sound reinforcement, main speaker feedback hunting',
    tags: ['live', 'pa', 'aggressive'],
    mode: 'feedbackHunt',
    feedbackThresholdDb: 12,
    ringThresholdDb: 6,
    growthRateThreshold: 2,
    musicAware: false,
    fftSize: 8192,
  },
  'stage-monitors': {
    id: 'stage-monitors',
    name: 'Stage Monitors',
    category: 'built-in',
    description: 'Balanced detection with music awareness for monitor mixing',
    useCase: 'Stage monitor feedback control during live performance',
    tags: ['monitors', 'balanced', 'performance'],
    mode: 'musicAware',
    feedbackThresholdDb: 14,
    ringThresholdDb: 7,
    growthRateThreshold: 2.5,
    musicAware: true,
    fftSize: 8192,
  },
  'studio': {
    id: 'studio',
    name: 'Studio',
    category: 'built-in',
    description: 'Sensitive detection for controlled studio environment',
    useCase: 'Studio recording, controlled room setup',
    tags: ['studio', 'controlled', 'sensitive'],
    mode: 'calibration',
    feedbackThresholdDb: 10,
    ringThresholdDb: 5,
    growthRateThreshold: 1.5,
    musicAware: false,
    fftSize: 16384,
  },
  'vocal-ring': {
    id: 'vocal-ring',
    name: 'Vocal Ring Assist',
    category: 'built-in',
    description: 'Optimized for detecting subtle vocal feedback frequencies',
    useCase: 'Vocal microphone ringing detection',
    tags: ['vocal', 'sensitive', 'ring'],
    mode: 'vocalRing',
    feedbackThresholdDb: 11,
    ringThresholdDb: 4,
    growthRateThreshold: 1,
    musicAware: true,
    fftSize: 8192,
  },
}

// Preset management utilities
export const PresetManager = {
  /**
   * Load custom presets from localStorage
   */
  loadCustomPresets(): DetectionPreset[] {
    try {
      const stored = localStorage.getItem('ktr-custom-presets')
      if (!stored) return []
      const presets = JSON.parse(stored) as DetectionPreset[]
      return Array.isArray(presets) ? presets : []
    } catch (error) {
      console.error('[v0] Failed to load custom presets:', error)
      return []
    }
  },

  /**
   * Save custom presets to localStorage
   */
  saveCustomPresets(presets: DetectionPreset[]): void {
    try {
      localStorage.setItem('ktr-custom-presets', JSON.stringify(presets))
    } catch (error) {
      console.error('[v0] Failed to save custom presets:', error)
    }
  },

  /**
   * Get all presets (built-in + custom)
   */
  getAllPresets(): DetectionPreset[] {
    const customPresets = this.loadCustomPresets()
    return [...Object.values(BUILT_IN_PRESETS), ...customPresets]
  },

  /**
   * Save a new custom preset
   */
  savePreset(preset: Omit<DetectionPreset, 'id' | 'category'>): DetectionPreset {
    const customPresets = this.loadCustomPresets()
    const newPreset: DetectionPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      category: 'custom',
    }
    customPresets.push(newPreset)
    this.saveCustomPresets(customPresets)
    return newPreset
  },

  /**
   * Delete a custom preset
   */
  deletePreset(presetId: string): boolean {
    // Cannot delete built-in presets
    if (Object.keys(BUILT_IN_PRESETS).includes(presetId)) {
      return false
    }

    const customPresets = this.loadCustomPresets()
    const filtered = customPresets.filter(p => p.id !== presetId)
    if (filtered.length !== customPresets.length) {
      this.saveCustomPresets(filtered)
      return true
    }
    return false
  },

  /**
   * Get preset by ID
   */
  getPreset(presetId: string): DetectionPreset | undefined {
    return this.getAllPresets().find(p => p.id === presetId)
  },

  /**
   * Update a custom preset
   */
  updatePreset(presetId: string, updates: Partial<DetectionPreset>): boolean {
    // Cannot update built-in presets
    if (Object.keys(BUILT_IN_PRESETS).includes(presetId)) {
      return false
    }

    const customPresets = this.loadCustomPresets()
    const preset = customPresets.find(p => p.id === presetId)
    if (!preset) return false

    Object.assign(preset, updates)
    this.saveCustomPresets(customPresets)
    return true
  },
}

/**
 * Export current settings as a custom preset
 */
export function exportSettingsAsPreset(
  settings: Partial<DetectorSettings>,
  name: string,
  description: string
): DetectionPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    category: 'custom',
    useCase: 'Custom preset',
    tags: ['custom'],
    ...settings,
  }
}
