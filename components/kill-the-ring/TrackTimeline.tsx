"use client";

import { useRef, useEffect, useCallback } from "react";
import type { TrackedPeak, Classification } from "@/types/advisory";
import { freqToNote } from "@/lib/utils/pitchUtils";

interface TrackTimelineProps {
  tracks: TrackedPeak[];
  width: number;
  height: number;
  timeWindowMs?: number;
}

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  runaway: "#ef4444",
  growing: "#f97316",
  resonance: "#eab308",
  ring: "#a855f7",
  whistle: "#06b6d4",
  instrument: "#22c55e",
  unknown: "#6b7280",
};

export function TrackTimeline({
  tracks,
  width,
  height,
  timeWindowMs = 10000,
}: TrackTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const now = Date.now();
    const minTime = now - timeWindowMs;

    // Draw grid
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;

    // Time grid (vertical lines every second)
    for (let t = 0; t <= timeWindowMs; t += 1000) {
      const x = ((timeWindowMs - t) / timeWindowMs) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Frequency zones (horizontal)
    const freqZones = [100, 250, 500, 1000, 2000, 4000, 8000];
    const minFreqLog = Math.log10(20);
    const maxFreqLog = Math.log10(20000);

    freqZones.forEach((freq) => {
      const freqLog = Math.log10(freq);
      const y = height - ((freqLog - minFreqLog) / (maxFreqLog - minFreqLog)) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#4a4a4a";
      ctx.font = "10px system-ui";
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, 4, y - 2);
    });

    // Draw tracks
    tracks.forEach((track) => {
      if (!track.history || track.history.length < 2) return;

      const color = CLASSIFICATION_COLORS[track.classification];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = track.active ? 1 : 0.4;

      ctx.beginPath();
      let started = false;

      track.history.forEach((point) => {
        if (point.time < minTime) return;

        const x = ((point.time - minTime) / timeWindowMs) * width;
        const freqLog = Math.log10(point.frequency);
        const y = height - ((freqLog - minFreqLog) / (maxFreqLog - minFreqLog)) * height;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw current position marker
      if (track.active && track.history.length > 0) {
        const lastPoint = track.history[track.history.length - 1];
        const x = ((lastPoint.time - minTime) / timeWindowMs) * width;
        const freqLog = Math.log10(lastPoint.frequency);
        const y = height - ((freqLog - minFreqLog) / (maxFreqLog - minFreqLog)) * height;

        // Glow effect for active tracks
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        const note = freqToNote(track.frequency);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px system-ui";
        ctx.fillText(`${note.note}${note.octave}`, x + 8, y + 3);
      }
    });

    ctx.globalAlpha = 1;

    // Time labels
    ctx.fillStyle = "#4a4a4a";
    ctx.font = "10px system-ui";
    ctx.fillText("now", width - 24, height - 4);
    ctx.fillText("-10s", 4, height - 4);
  }, [tracks, width, height, timeWindowMs]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-md"
      aria-label="Track timeline showing frequency history over time"
    />
  );
}
