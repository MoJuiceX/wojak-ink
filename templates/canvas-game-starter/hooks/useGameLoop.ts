/**
 * useGameLoop Hook
 * Manages the game loop with consistent timing and delta time
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface GameLoopOptions {
  update: (deltaTime: number) => void;
  render: (ctx: CanvasRenderingContext2D, interpolation: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  targetFPS?: number;
  fixedTimeStep?: boolean;
}

interface GameLoopState {
  frameCount: number;
  lastTime: number;
  accumulator: number;
  fps: number;
  fpsUpdateTime: number;
  fpsFrameCount: number;
}

export interface UseGameLoopReturn {
  start: () => void;
  stop: () => void;
  isRunning: boolean;
  getFrameCount: () => number;
  getFps: () => number;
  reset: () => void;
}

export const useGameLoop = (options: GameLoopOptions): UseGameLoopReturn => {
  const { update, render, canvasRef, targetFPS = 60, fixedTimeStep = true } = options;

  const frameTime = 1000 / targetFPS;
  const rafIdRef = useRef<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const stateRef = useRef<GameLoopState>({
    frameCount: 0,
    lastTime: 0,
    accumulator: 0,
    fps: 0,
    fpsUpdateTime: 0,
    fpsFrameCount: 0,
  });

  // Store loop function in a ref to avoid self-reference issues
  const loopRef = useRef<((currentTime: number) => void) | null>(null);

  // Update the loop function ref when dependencies change
  useEffect(() => {
    loopRef.current = (currentTime: number) => {
      const state = stateRef.current;

      // Initialize on first frame
      if (state.lastTime === 0) {
        state.lastTime = currentTime;
        state.fpsUpdateTime = currentTime;
        rafIdRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
        return;
      }

      // Calculate delta time
      const deltaTime = currentTime - state.lastTime;
      state.lastTime = currentTime;

      // FPS calculation
      state.fpsFrameCount++;
      if (currentTime - state.fpsUpdateTime >= 1000) {
        state.fps = state.fpsFrameCount;
        state.fpsFrameCount = 0;
        state.fpsUpdateTime = currentTime;
      }

      if (fixedTimeStep) {
        // Fixed timestep for physics
        state.accumulator += deltaTime;
        while (state.accumulator >= frameTime) {
          update(frameTime);
          state.accumulator -= frameTime;
          state.frameCount++;
        }

        // Calculate interpolation for smooth rendering
        const interpolation = state.accumulator / frameTime;

        // Render
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            render(ctx, interpolation);
          }
        }
      } else {
        // Variable timestep
        update(deltaTime);
        state.frameCount++;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            render(ctx, 1);
          }
        }
      }

      // Continue loop
      rafIdRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
    };
  }, [canvasRef, frameTime, fixedTimeStep, update, render]);

  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      // Reset state for fresh start
      stateRef.current.lastTime = 0;
      rafIdRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
    }
  }, [isRunning]);

  const stop = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    }
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Return useful values via getters to avoid ref access during render
  return {
    start,
    stop,
    isRunning,
    getFrameCount: () => stateRef.current.frameCount,
    getFps: () => stateRef.current.fps,
    reset: () => {
      stateRef.current = {
        frameCount: 0,
        lastTime: 0,
        accumulator: 0,
        fps: 0,
        fpsUpdateTime: 0,
        fpsFrameCount: 0,
      };
    },
  };
};

/**
 * Simple RAF hook for when you just need animation frames
 */
export const useAnimationFrame = (callback: (deltaTime: number) => void) => {
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== 0) {
        const deltaTime = time - lastTimeRef.current;
        callback(deltaTime);
      }
      lastTimeRef.current = time;
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [callback]);
};

/**
 * Pause-aware timeout
 */
export const useGameTimeout = (
  callback: () => void,
  delay: number,
  isPaused: boolean
) => {
  const savedCallback = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const remainingRef = useRef(delay);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Initialize startTimeRef on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isPaused) {
      // Pause: save remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        remainingRef.current -= Date.now() - startTimeRef.current;
      }
    } else {
      // Resume: restart with remaining time
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        savedCallback.current();
      }, remainingRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPaused]);
};
