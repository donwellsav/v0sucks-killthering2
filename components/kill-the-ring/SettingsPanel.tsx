"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, RotateCcw } from "lucide-react";
import type { DetectorSettings } from "@/types/advisory";

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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* FFT Size */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">FFT Resolution</Label>
            <Select
              value={settings.fftSize.toString()}
              onValueChange={(v) =>
                onSettingsChange({ fftSize: parseInt(v) as 4096 | 8192 | 16384 })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4096">4096 (Fast)</SelectItem>
                <SelectItem value="8192">8192 (Default)</SelectItem>
                <SelectItem value="16384">16384 (Hi-Res)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Smoothing */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Smoothing</Label>
              <span className="text-xs font-mono">{(settings.smoothingTimeConstant * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[settings.smoothingTimeConstant]}
              onValueChange={([v]) => onSettingsChange({ smoothingTimeConstant: v })}
              min={0}
              max={0.95}
              step={0.05}
            />
          </div>

          {/* Hold Time */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Hold Time</Label>
              <span className="text-xs font-mono">{settings.holdTimeMs}ms</span>
            </div>
            <Slider
              value={[settings.holdTimeMs]}
              onValueChange={([v]) => onSettingsChange({ holdTimeMs: v })}
              min={500}
              max={5000}
              step={250}
            />
          </div>

          {/* Max Issues */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Max Issues</Label>
              <span className="text-xs font-mono">{settings.maxDisplayedIssues}</span>
            </div>
            <Slider
              value={[settings.maxDisplayedIssues]}
              onValueChange={([v]) => onSettingsChange({ maxDisplayedIssues: v })}
              min={3}
              max={12}
              step={1}
            />
          </div>

          {/* EQ Preset */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">EQ Preset</Label>
            <Select
              value={settings.eqPreset}
              onValueChange={(v) => onSettingsChange({ eqPreset: v as "surgical" | "heavy" })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surgical">Surgical (Narrow)</SelectItem>
                <SelectItem value="heavy">Heavy (Wide)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset */}
          <Button variant="outline" size="sm" onClick={onReset} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Reset Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
