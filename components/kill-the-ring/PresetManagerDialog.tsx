// Preset management dialog for saving, loading, and deleting presets
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, Copy } from 'lucide-react'
import { PresetManager, BUILT_IN_PRESETS, type DetectionPreset } from '@/lib/dsp/presets'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DetectorSettings } from '@/types/advisory'

interface PresetManagerDialogProps {
  currentSettings: Partial<DetectorSettings>
  onPresetSelected: (preset: DetectionPreset) => void
}

export function PresetManagerDialog({
  currentSettings,
  onPresetSelected,
}: PresetManagerDialogProps) {
  const [open, setOpen] = useState(false)
  const [customPresets, setCustomPresets] = useState(() => PresetManager.loadCustomPresets())
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return

    const preset = PresetManager.savePreset({
      name: newPresetName,
      description: newPresetDescription,
      useCase: 'Custom configuration',
      tags: ['custom'],
      ...currentSettings,
    })

    setCustomPresets(PresetManager.loadCustomPresets())
    setNewPresetName('')
    setNewPresetDescription('')
    setShowSaveForm(false)
  }

  const handleDeletePreset = (presetId: string) => {
    PresetManager.deletePreset(presetId)
    setCustomPresets(PresetManager.loadCustomPresets())
  }

  const handleLoadPreset = (preset: DetectionPreset) => {
    onPresetSelected(preset)
    setOpen(false)
  }

  const allPresets = [...Object.values(BUILT_IN_PRESETS), ...customPresets]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Detection Presets</DialogTitle>
          <DialogDescription>
            Choose a preset or create a custom one from your current settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="built-in" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="built-in">Built-in</TabsTrigger>
            <TabsTrigger value="custom">Custom ({customPresets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="built-in" className="mt-4">
            <ScrollArea className="h-80">
              <div className="space-y-2 pr-4">
                {Object.values(BUILT_IN_PRESETS).map(preset => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onSelect={() => handleLoadPreset(preset)}
                    onDelete={undefined}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-3">
            {showSaveForm ? (
              <Card className="p-4 border-primary/50 bg-primary/5">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Preset Name</label>
                    <Input
                      placeholder="e.g., My PA Setup"
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Description</label>
                    <Textarea
                      placeholder="Describe when to use this preset..."
                      value={newPresetDescription}
                      onChange={e => setNewPresetDescription(e.target.value)}
                      className="h-16 text-xs resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveForm(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveCurrentAsPreset}
                      disabled={!newPresetName.trim()}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Save Preset
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveForm(true)}
                className="w-full h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Save Current Settings as Preset
              </Button>
            )}

            <ScrollArea className="h-80">
              <div className="space-y-2 pr-4">
                {customPresets.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No custom presets yet. Save your current settings to create one.
                  </div>
                ) : (
                  customPresets.map(preset => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onSelect={() => handleLoadPreset(preset)}
                      onDelete={() => handleDeletePreset(preset.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface PresetCardProps {
  preset: DetectionPreset
  onSelect: () => void
  onDelete?: () => void
}

function PresetCard({ preset, onSelect, onDelete }: PresetCardProps) {
  return (
    <Card className="p-3 hover:bg-muted/50 transition-colors">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-sm font-semibold">{preset.name}</h4>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
          {preset.category === 'built-in' && (
            <Badge variant="secondary" className="text-[10px]">
              Built-in
            </Badge>
          )}
        </div>

        {preset.tags && preset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {preset.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
          {preset.feedbackThresholdDb !== undefined && (
            <div>
              <span className="text-muted-foreground">Feedback:</span>{' '}
              <span className="font-mono">{preset.feedbackThresholdDb}dB</span>
            </div>
          )}
          {preset.ringThresholdDb !== undefined && (
            <div>
              <span className="text-muted-foreground">Ring:</span>{' '}
              <span className="font-mono">{preset.ringThresholdDb}dB</span>
            </div>
          )}
          {preset.mode && (
            <div>
              <span className="text-muted-foreground">Mode:</span>{' '}
              <span className="font-mono capitalize">{preset.mode}</span>
            </div>
          )}
          {preset.fftSize && (
            <div>
              <span className="text-muted-foreground">FFT:</span>{' '}
              <span className="font-mono">{preset.fftSize}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-between pt-1">
          <Button variant="default" size="sm" onClick={onSelect} className="flex-1 h-7 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Apply
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
