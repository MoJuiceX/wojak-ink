/**
 * useGamePerformance Hook
 *
 * Performance monitoring for games.
 * Tracks FPS, frame time, and memory usage.
 * Warns when performance drops below acceptable levels.
 */

import { useRef, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  droppedFrames: number;
}

interface UseGamePerformanceOptions {
  enabled?: boolean;
  warnThreshold?: number;
  onPerformanceWarning?: (metrics: PerformanceMetrics) => void;
}

export function useGamePerformance(options: UseGamePerformanceOptions = {}) {
  const {
    enabled = import.meta.env.DEV,
    warnThreshold = 50,
    onPerformanceWarning,
  } = options;

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const droppedFramesRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  const measureFrame = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const frameDelta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Count dropped frames (frame took longer than 20ms = below 50fps)
    if (frameDelta > 20) {
      droppedFramesRef.current++;
    }

    frameCountRef.current++;
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastTimeRef.current = now;

      // Warn if FPS drops below threshold
      if (fpsRef.current < warnThreshold) {
        const metrics = getMetrics();
        console.warn(`[Performance] FPS dropped to ${fpsRef.current}`, metrics);
        onPerformanceWarning?.(metrics);
      }

      // Reset dropped frames counter each second
      droppedFramesRef.current = 0;
    }
  }, [enabled, warnThreshold, onPerformanceWarning]);

  const getMetrics = useCallback((): PerformanceMetrics => {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
    return {
      fps: fpsRef.current,
      frameTime: 1000 / fpsRef.current,
      memoryUsage: memory?.usedJSHeapSize,
      droppedFrames: droppedFramesRef.current,
    };
  }, []);

  const reset = useCallback(() => {
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
    fpsRef.current = 60;
    droppedFramesRef.current = 0;
    lastFrameTimeRef.current = performance.now();
  }, []);

  return {
    measureFrame,
    getMetrics,
    reset,
    fps: fpsRef,
  };
}

export default useGamePerformance;
