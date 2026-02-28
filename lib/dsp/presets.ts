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
    description: 'Aggressive detection for main PA system feedback control. Fast response, catches feedback early.',
    useCase: 'Live sound reinforcement, main speaker feedback hunting, initial system ring-out',
    tags: ['live', 'pa', 'aggressive', 'fast'],
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
    description: 'Balanced detection with music awareness. Reduces false positives during performance.',
    useCase: 'Stage monitor feedback control during live performance, wedge tuning',
    tags: ['monitors', 'balanced', 'performance', 'wedge'],
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
    description: 'High-resolution analysis for controlled environments. Maximum frequency precision.',
    useCase: 'Studio recording, controlled room setup, acoustic analysis, room tuning',
    tags: ['studio', 'controlled', 'sensitive', 'hi-res'],
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
    description: 'Optimized for subtle vocal mic ringing. Catches problematic frequencies before full feedback.',
    useCase: 'Vocal microphone ringing detection, handheld mic tuning, lavalier feedback control',
    tags: ['vocal', 'sensitive', 'ring', 'mic'],
    mode: 'vocalRing',
    feedbackThresholdDb: 11,
    ringThresholdDb: 4,
    growthRateThreshold: 1,
    musicAware: true,
    fftSize: 8192,
  },
  'quick-scan': {
    id: 'quick-scan',
    name: 'Quick Scan',
    category: 'built-in',
    description: 'Fast overview mode for initial problem identification. Less precise but faster response.',
    useCase: 'Initial system check, quick problem identification, troubleshooting',
    tags: ['fast', 'scan', 'overview'],
    mode: 'aggressive',
    feedbackThresholdDb: 8,
    ringThresholdDb: 4,
    growthRateThreshold: 1.5,
    musicAware: false,
    fftSize: 4096,
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
