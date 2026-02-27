"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, RotateCcw } from "lucide-react";
import type { DetectorSettings, OperationMode } from "@/types/advisory";
import { DEFAULT_SETTINGS, OPERATION_MODES } from "@/lib/dsp/constants";

interface SettingsPanelProps {
  settings: DetectorSettings;
  onSettingsChange: (settings: Partial<DetectorSettings>) => void;
  onReset: () => void;
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onReset,
}: SettingsPanelProps) {
  const handleModeChange = (mode: OperationMode) => {
    const modeSettings = OPERATION_MODES[mode];
    onSettingsChange({
      mode,
      feedbackThresholdDb: modeSettings.feedbackThreshold,
      ringThresholdDb: modeSettings.ringThreshold,
      growthRateThreshold: modeSettings.growthRateThreshold,
      musicAware: modeSettings.musicAware,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Open settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-card">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            KillTheRing2 Settings
          </SheetTitle>
          <SheetDescription>
            Configure detection parameters, thresholds, and display options.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="detection" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="detection" className="space-y-6 mt-4">
            {/* Operation Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Operation Mode</Label>
              <Select
                value={settings.mode}
                onValueChange={(v) => handleModeChange(v as OperationMode)}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedbackHunt">
                    Feedback Hunt (Default)
                  </SelectItem>
                  <SelectItem value="vocalRing">Vocal Ring Assist</SelectItem>
                  <SelectItem value="musicAware">Music-Aware</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.mode === "feedbackHunt" &&
                  "Standard mode for detecting runaway feedback during soundcheck."}
                {settings.mode === "vocalRing" &&
                  "Sensitive mode for subtle vocal resonances and rings."}
                {settings.mode === "musicAware" &&
                  "Instrument-friendly mode that respects musical content."}
                {settings.mode === "aggressive" &&
                  "Maximum sensitivity for problematic rooms."}
                {settings.mode === "calibration" &&
                  "Shows all detected peaks for system tuning."}
              </p>
            </div>

            {/* Feedback Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Feedback Threshold</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.feedbackThresholdDb} dB
                </span>
              </div>
              <Slider
                value={[settings.feedbackThresholdDb]}
                onValueChange={([v]) =>
                  onSettingsChange({ feedbackThresholdDb: v })
                }
                min={6}
                max={24}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum dB above noise floor to detect feedback (lower = more
                sensitive)
              </p>
            </div>

            {/* Ring Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ring Threshold</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.ringThresholdDb} dB
                </span>
              </div>
              <Slider
                value={[settings.ringThresholdDb]}
                onValueChange={([v]) =>
                  onSettingsChange({ ringThresholdDb: v })
                }
                min={3}
                max={15}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Threshold for subtle ring detection in Vocal Ring mode
              </p>
            </div>

            {/* Growth Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Growth Rate Threshold</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.growthRateThreshold.toFixed(1)} dB/s
                </span>
              </div>
              <Slider
                value={[settings.growthRateThreshold]}
                onValueChange={([v]) =>
                  onSettingsChange({ growthRateThreshold: v })
                }
                min={1}
                max={10}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Rate of amplitude increase to classify as runaway feedback
              </p>
            </div>

            {/* Music Aware Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Music-Aware Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use instrument classifier to avoid false positives
                </p>
              </div>
              <Switch
                checked={settings.musicAware}
                onCheckedChange={(v) => onSettingsChange({ musicAware: v })}
              />
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-6 mt-4">
            {/* FFT Size */}
            <div className="space-y-2">
              <Label htmlFor="fftSize">FFT Size</Label>
              <Select
                value={settings.fftSize.toString()}
                onValueChange={(v) =>
                  onSettingsChange({ fftSize: parseInt(v) as 4096 | 8192 | 16384 })
                }
              >
                <SelectTrigger id="fftSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4096">4096 (Fast, ~5.9 Hz/bin)</SelectItem>
                  <SelectItem value="8192">
                    8192 (Default, ~2.9 Hz/bin)
                  </SelectItem>
                  <SelectItem value="16384">
                    16384 (High-res, ~1.5 Hz/bin)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher FFT = better frequency resolution but more latency
              </p>
            </div>

            {/* Smoothing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Smoothing</Label>
                <span className="text-sm text-muted-foreground">
                  {(settings.smoothingTimeConstant * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[settings.smoothingTimeConstant]}
                onValueChange={([v]) =>
                  onSettingsChange({ smoothingTimeConstant: v })
                }
                min={0}
                max={0.95}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Min/Max Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minFreq">Min Frequency (Hz)</Label>
                <Input
                  id="minFreq"
                  type="number"
                  value={settings.minFrequency}
                  onChange={(e) =>
                    onSettingsChange({
                      minFrequency: Math.max(20, parseInt(e.target.value) || 20),
                    })
                  }
                  min={20}
                  max={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFreq">Max Frequency (Hz)</Label>
                <Input
                  id="maxFreq"
                  type="number"
                  value={settings.maxFrequency}
                  onChange={(e) =>
                    onSettingsChange({
                      maxFrequency: Math.min(
                        20000,
                        parseInt(e.target.value) || 20000
                      ),
                    })
                  }
                  min={1000}
                  max={20000}
                />
              </div>
            </div>

            {/* Max Displayed Issues */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max Displayed Issues</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.maxDisplayedIssues}
                </span>
              </div>
              <Slider
                value={[settings.maxDisplayedIssues]}
                onValueChange={([v]) =>
                  onSettingsChange({ maxDisplayedIssues: v })
                }
                min={3}
                max={12}
                step={1}
                className="w-full"
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Hold Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hold Time</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.holdTimeMs} ms
                </span>
              </div>
              <Slider
                value={[settings.holdTimeMs]}
                onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
                min={500}
                max={5000}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How long to keep showing an issue after it disappears
              </p>
            </div>

            {/* Noise Floor Decay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Noise Floor Decay</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.noiseFloorDecay.toFixed(3)}
                </span>
              </div>
              <Slider
                value={[settings.noiseFloorDecay]}
                onValueChange={([v]) =>
                  onSettingsChange({ noiseFloorDecay: v })
                }
                min={0.99}
                max={0.999}
                step={0.001}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Rate at which estimated noise floor decays (higher = slower
                adaptation)
              </p>
            </div>

            {/* Peak Merge Distance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Peak Merge (cents)</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.peakMergeCents} cents
                </span>
              </div>
              <Slider
                value={[settings.peakMergeCents]}
                onValueChange={([v]) =>
                  onSettingsChange({ peakMergeCents: v })
                }
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Merge peaks within this many cents as the same issue
              </p>
            </div>

            {/* EQ Preset */}
            <div className="space-y-2">
              <Label htmlFor="eqPreset">EQ Advisory Preset</Label>
              <Select
                value={settings.eqPreset}
                onValueChange={(v) =>
                  onSettingsChange({ eqPreset: v as "surgical" | "heavy" })
                }
              >
                <SelectTrigger id="eqPreset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">
                    Surgical (Narrow, Deep)
                  </SelectItem>
                  <SelectItem value="heavy">Heavy (Wide, Moderate)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Surgical: Q 8-16, -6 to -12 dB | Heavy: Q 2-4, -3 to -6 dB
              </p>
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={onReset}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
