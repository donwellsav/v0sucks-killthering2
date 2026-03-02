'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DetectorSettings } from '@/types/advisory'

type Slot = 'A' | 'B'

interface SavedConfig {
  name: string
  settings: Partial<DetectorSettings>
  savedAt: number
}

interface ABComparisonProps {
  /** Current active settings */
  currentSettings: DetectorSettings
  /** Callback when switching to a saved config */
  onApplySettings: (settings: Partial<DetectorSettings>) => void
  className?: string
}

/**
 * A/B comparison system for quickly switching between two saved configurations.
 * Useful for fine-tuning detection sensitivity by comparing different settings.
 */
export function ABComparison({
  currentSettings,
  onApplySettings,
  className,
}: ABComparisonProps) {
  const [slotA, setSlotA] = useState<SavedConfig | null>(null)
  const [slotB, setSlotB] = useState<SavedConfig | null>(null)
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null)
  const [isEditing, setIsEditing] = useState<Slot | null>(null)
  const [editName, setEditName] = useState('')

  // Save current settings to a slot
  const saveToSlot = useCallback((slot: Slot) => {
    const config: SavedConfig = {
      name: `Config ${slot}`,
      settings: { ...currentSettings },
      savedAt: Date.now(),
    }
    
    if (slot === 'A') {
      setSlotA(config)
    } else {
      setSlotB(config)
    }
  }, [currentSettings])

  // Apply a saved slot
  const applySlot = useCallback((slot: Slot) => {
    const config = slot === 'A' ? slotA : slotB
    if (config) {
      onApplySettings(config.settings)
      setActiveSlot(slot)
    }
  }, [slotA, slotB, onApplySettings])

  // Toggle between A and B
  const toggle = useCallback(() => {
    if (!slotA || !slotB) return
    
    if (activeSlot === 'A') {
      applySlot('B')
    } else {
      applySlot('A')
    }
  }, [slotA, slotB, activeSlot, applySlot])

  // Clear a slot
  const clearSlot = useCallback((slot: Slot) => {
    if (slot === 'A') {
      setSlotA(null)
      if (activeSlot === 'A') setActiveSlot(null)
    } else {
      setSlotB(null)
      if (activeSlot === 'B') setActiveSlot(null)
    }
  }, [activeSlot])

  // Rename a slot
  const startRename = (slot: Slot) => {
    const config = slot === 'A' ? slotA : slotB
    if (config) {
      setIsEditing(slot)
      setEditName(config.name)
    }
  }

  const finishRename = (slot: Slot) => {
    if (slot === 'A' && slotA) {
      setSlotA({ ...slotA, name: editName || 'Config A' })
    } else if (slot === 'B' && slotB) {
      setSlotB({ ...slotB, name: editName || 'Config B' })
    }
    setIsEditing(null)
    setEditName('')
  }

  // Format settings summary
  const formatSettingsSummary = (config: SavedConfig): string => {
    const parts: string[] = []
    const s = config.settings
    
    if (s.feedbackThresholdDb !== undefined) {
      parts.push(`Thr: ${s.feedbackThresholdDb}dB`)
    }
    if (s.minFrequency !== undefined && s.maxFrequency !== undefined) {
      parts.push(`${s.minFrequency}-${s.maxFrequency}Hz`)
    }
    if (s.mode) {
      parts.push(s.mode)
    }
    
    return parts.slice(0, 3).join(' | ')
  }

  const renderSlot = (slot: Slot, config: SavedConfig | null) => {
    const isActive = activeSlot === slot
    const canApply = config !== null
    
    return (
      <div
        className={cn(
          'flex-1 p-3 rounded-lg border transition-all',
          isActive && 'border-primary bg-primary/10',
          !isActive && config && 'border-border bg-card/50 hover:border-primary/50',
          !config && 'border-dashed border-border/50 bg-card/20'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          {isEditing === slot ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => finishRename(slot)}
              onKeyDown={(e) => e.key === 'Enter' && finishRename(slot)}
              className="w-full bg-transparent border-b border-primary text-sm font-medium focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => config && startRename(slot)}
              className="text-sm font-medium hover:text-primary transition-colors"
              disabled={!config}
            >
              {config?.name ?? `Slot ${slot}`}
            </button>
          )}
          <span
            className={cn(
              'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {slot}
          </span>
        </div>

        {config ? (
          <>
            <div className="text-[10px] text-muted-foreground mb-2 line-clamp-1">
              {formatSettingsSummary(config)}
            </div>
            <div className="flex gap-1">
              <Button
                variant={isActive ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 h-6 text-[10px]"
                onClick={() => applySlot(slot)}
                disabled={isActive}
              >
                {isActive ? 'Active' : 'Apply'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[10px]"
                onClick={() => saveToSlot(slot)}
                title="Overwrite with current settings"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-[10px] text-destructive hover:text-destructive"
                onClick={() => clearSlot(slot)}
                title="Clear slot"
              >
                X
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[10px]"
            onClick={() => saveToSlot(slot)}
          >
            Save Current to {slot}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          A/B Comparison
        </span>
        {slotA && slotB && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] font-bold"
            onClick={toggle}
          >
            Toggle A/B
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {renderSlot('A', slotA)}
        {renderSlot('B', slotB)}
      </div>

      {/* Quick tip */}
      <div className="text-[9px] text-muted-foreground text-center">
        Save settings to A, adjust, save to B, then toggle to compare
      </div>
    </div>
  )
}
