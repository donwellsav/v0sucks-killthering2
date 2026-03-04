// KillTheRing2 Animation Frame Hook - RAF with delta timing for canvas rendering

import { useEffect, useRef, useCallback } from 'react'

export interface AnimationFrameCallback {
  (deltaTime: number, timestamp: number): void
}

export function useAnimationFrame(
  callback: AnimationFrameCallback,
  enabled: boolean = true
): void {
  const callbackRef = useRef<AnimationFrameCallback>(callback)
  const rafIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      lastTimeRef.current = 0
      return
    }

    const loop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current === 0 ? 0 : timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      callbackRef.current(deltaTime, timestamp)

      rafIdRef.current = requestAnimationFrame(loop)
    }

    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      lastTimeRef.current = 0
    }
  }, [enabled])
}

/**
 * Hook for throttled animation frame (e.g., 30fps for spectrum display)
 */
export function useThrottledAnimationFrame(
  callback: AnimationFrameCallback,
  enabled: boolean = true,
  targetFps: number = 30
): void {
  const callbackRef = useRef<AnimationFrameCallback>(callback)
  const rafIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const lastCallTimeRef = useRef<number>(0)
  const frameInterval = 1000 / targetFps

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      lastTimeRef.current = 0
      lastCallTimeRef.current = 0
      return
    }

    const loop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current === 0 ? 0 : timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // Throttle callback invocation
      if (timestamp - lastCallTimeRef.current >= frameInterval) {
        callbackRef.current(deltaTime, timestamp)
        lastCallTimeRef.current = timestamp
      }

      rafIdRef.current = requestAnimationFrame(loop)
    }

    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
      lastTimeRef.current = 0
      lastCallTimeRef.current = 0
    }
  }, [enabled, frameInterval])
}

/**
 * Hook for canvas with automatic device pixel ratio handling
 */
export function useCanvasSetup(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  width: number,
  height: number
): { ctx: CanvasRenderingContext2D | null; scale: number } {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const scaleRef = useRef<number>(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    scaleRef.current = dpr

    // Set display size
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Set actual size in memory (scaled for retina)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)

    // Get context and scale
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctxRef.current = ctx
    }

    return () => {
      ctxRef.current = null
    }
  }, [canvasRef, width, height])

  return { ctx: ctxRef.current, scale: scaleRef.current }
}
