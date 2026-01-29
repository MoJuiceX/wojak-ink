/**
 * FlappyOrange Weather System Hook
 *
 * Manages all weather-related state and effects:
 * - Rain, snow, storm, clear weather
 * - Fog overlay
 * - Lightning bolts
 * - Background birds
 * - Falling leaves
 * - Snow accumulation
 */

import { useRef, useCallback, useState } from 'react';
import {
  WEATHER_CONFIG,
  type WeatherType,
} from '../config';
import type { WeatherState, Snowflake, BackgroundBird, FallingLeaf, LightningBolt, Pipe } from '../types';
import {
  createRainDrops,
  updateRainDrops,
  updateRainSplashes,
  addRainDropsWithCap,
  createSnowflakes,
  updateSnowflakes as updateSnowflakesPure,
  addSnowflakes,
  createFallingLeaf,
  updateFallingLeaves as updateFallingLeavesPure,
  createBirdFlock,
  updateBackgroundBirds as updateBackgroundBirdsPure,
  canSpawnBirdFlock,
} from '../weather';
import {
  drawSnowflakes as drawSnowflakesRenderer,
  drawFog as drawFogRenderer,
  drawSnowAccumulation as drawSnowAccumulationRenderer,
  drawPipeFrost as drawPipeFrostRenderer,
  drawBackgroundBirds as drawBackgroundBirdsRenderer,
  drawFallingLeaves as drawFallingLeavesRenderer,
  drawLightningBolts as drawLightningBoltsRenderer,
  drawRain as drawRainRenderer,
  drawRainSplashes as drawRainSplashesRenderer,
} from '../renderers';

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  foreground: boolean;
}

interface RainSplash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

interface UseFlappyWeatherOptions {
  canvasWidth: number;
  canvasHeight: number;
  triggerScreenShake: (intensity: number, duration: number) => void;
  playTone: (frequency: number, volume: number, duration: number) => void;
  setLightningAlpha: (alpha: number) => void;
  cycleTimeRef: React.RefObject<number>;
}

export function useFlappyWeather({
  canvasWidth,
  canvasHeight,
  triggerScreenShake,
  playTone,
  setLightningAlpha,
  cycleTimeRef,
}: UseFlappyWeatherOptions) {
  // Weather state
  const weatherRef = useRef<WeatherState>({
    current: 'clear',
    intensity: 0,
    windSpeed: 0,
    windDirection: 1,
    transitionProgress: 1,
    nextWeather: null,
    fogIntensity: 0,
    currentSequence: ['clear'],
    sequenceIndex: 0,
    inClearBuffer: false,
  });

  // Weather timing - use lazy initializer to avoid impure Math.random during render
  const [initialWeatherDuration] = useState(() =>
    WEATHER_CONFIG.MIN_WEATHER_DURATION +
    Math.random() * (WEATHER_CONFIG.MAX_WEATHER_DURATION - WEATHER_CONFIG.MIN_WEATHER_DURATION)
  );
  const weatherTimerRef = useRef(initialWeatherDuration);
  const fogTimerRef = useRef(0);

  // Snow state
  const snowAccumulationRef = useRef(0);
  const snowGroundEdgeRef = useRef(0);
  const snowflakesRef = useRef<Snowflake[]>([]);

  // Rain state
  const rainDropsRef = useRef<RainDrop[]>([]);
  const rainSplashesRef = useRef<RainSplash[]>([]);

  // Background elements
  const backgroundBirdsRef = useRef<BackgroundBird[]>([]);
  const fallingLeavesRef = useRef<FallingLeaf[]>([]);
  const lightningBoltsRef = useRef<LightningBolt[]>([]);
  const lastBirdSpawnRef = useRef(0);

  // Get current time-of-day phase
  const getTimeOfDayPhase = useCallback((): 'day' | 'night' | 'dawn' | 'dusk' => {
    const CYCLE_DURATION_MS = 180000; // Match config
    const progress = (cycleTimeRef.current || 0) / CYCLE_DURATION_MS;
    if (progress < 0.5) {
      const dayProgress = progress / 0.5;
      if (dayProgress < 0.12) return 'dawn';
      if (dayProgress > 0.85) return 'dusk';
      return 'day';
    } else {
      const nightProgress = (progress - 0.5) / 0.5;
      if (nightProgress > 0.9) return 'dawn';
      return 'night';
    }
  }, [cycleTimeRef]);

  // Generate lightning bolt
  const generateLightningBolt = useCallback((): LightningBolt => {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let x = canvasWidth * 0.3 + Math.random() * canvasWidth * 0.4;
    let y = 0;
    const endY = canvasHeight * 0.6 + Math.random() * canvasHeight * 0.3;

    while (y < endY) {
      const nextY = y + 15 + Math.random() * 25;
      const nextX = x + (Math.random() - 0.5) * 40;
      segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });

      if (Math.random() < 0.3 && segments.length > 2) {
        const branchEndX = nextX + (Math.random() - 0.5) * 60;
        const branchEndY = nextY + 20 + Math.random() * 30;
        segments.push({ x1: nextX, y1: nextY, x2: branchEndX, y2: branchEndY });
      }

      x = nextX;
      y = nextY;
    }

    return { segments, alpha: 1, startTime: Date.now() };
  }, [canvasWidth, canvasHeight]);

  // Trigger lightning bolt
  const triggerLightningBolt = useCallback(() => {
    lightningBoltsRef.current.push(generateLightningBolt());
    setLightningAlpha(0.8);
    setTimeout(() => setLightningAlpha(0.2), 50);
    setTimeout(() => setLightningAlpha(0.6), 100);
    setTimeout(() => setLightningAlpha(0.1), 150);
    setTimeout(() => setLightningAlpha(0.4), 200);
    setTimeout(() => setLightningAlpha(0), 300);
    setTimeout(() => {
      triggerScreenShake(4, 300);
      playTone(60, 0.15, 400);
    }, 400);
  }, [generateLightningBolt, triggerScreenShake, playTone, setLightningAlpha]);

  // Update lightning bolts
  const updateLightningBolts = useCallback(() => {
    const bolts = lightningBoltsRef.current;
    const now = Date.now();
    for (let i = bolts.length - 1; i >= 0; i--) {
      const age = now - bolts[i].startTime;
      bolts[i].alpha = Math.max(0, 1 - age / 200);
      if (bolts[i].alpha <= 0) {
        bolts.splice(i, 1);
      }
    }
  }, []);

  // Rain operations
  const spawnRainDrops = useCallback((count: number, staggerY: boolean = false) => {
    const newDrops = createRainDrops(count, canvasWidth, canvasHeight, staggerY);
    rainDropsRef.current = addRainDropsWithCap(rainDropsRef.current, newDrops);
  }, [canvasWidth, canvasHeight]);

  const handleUpdateRainDrops = useCallback(() => {
    const groundY = canvasHeight - 20;
    const maxSplashes = 50 - rainSplashesRef.current.length;
    const { drops, newSplashes } = updateRainDrops(
      rainDropsRef.current,
      canvasHeight,
      groundY,
      maxSplashes
    );
    rainDropsRef.current = drops;
    rainSplashesRef.current = [...rainSplashesRef.current, ...newSplashes];
  }, [canvasHeight]);

  const handleUpdateRainSplashes = useCallback(() => {
    rainSplashesRef.current = updateRainSplashes(rainSplashesRef.current);
  }, []);

  // Snow operations
  const spawnSnowflakes = useCallback((count: number, staggerY: boolean = false) => {
    const newFlakes = createSnowflakes(
      count,
      canvasWidth,
      canvasHeight,
      staggerY,
      WEATHER_CONFIG.MAX_SNOWFLAKES,
      snowflakesRef.current.length
    );
    snowflakesRef.current = addSnowflakes(snowflakesRef.current, newFlakes);
  }, [canvasWidth, canvasHeight]);

  const updateSnowflakes = useCallback((deltaTime: number) => {
    const wind = weatherRef.current.windSpeed;
    snowflakesRef.current = updateSnowflakesPure(
      snowflakesRef.current,
      deltaTime,
      wind,
      canvasWidth,
      canvasHeight
    );
  }, [canvasHeight, canvasWidth]);

  // Bird operations
  const spawnBirdFlock = useCallback(() => {
    if (!canSpawnBirdFlock(backgroundBirdsRef.current.length)) return;
    backgroundBirdsRef.current = createBirdFlock(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const updateBackgroundBirds = useCallback((deltaTime: number) => {
    backgroundBirdsRef.current = updateBackgroundBirdsPure(
      backgroundBirdsRef.current,
      deltaTime,
      canvasWidth
    );
  }, [canvasWidth]);

  // Leaf operations
  const spawnFallingLeaf = useCallback(() => {
    if (fallingLeavesRef.current.length >= WEATHER_CONFIG.MAX_LEAVES) return;
    const newLeaf = createFallingLeaf(canvasWidth);
    fallingLeavesRef.current.push(newLeaf);
  }, [canvasWidth]);

  const updateFallingLeaves = useCallback((deltaTime: number) => {
    const wind = weatherRef.current.windSpeed;
    fallingLeavesRef.current = updateFallingLeavesPure(
      fallingLeavesRef.current,
      deltaTime,
      wind,
      canvasHeight
    );
  }, [canvasHeight]);

  // Debug: Manually set weather type
  const setWeatherType = useCallback((type: WeatherType) => {
    const weather = weatherRef.current;
    const isPrecipitating = type === 'rain' || type === 'storm' || type === 'snow';
    weather.current = type;
    weather.intensity = isPrecipitating ? 0 : 1;
    weather.transitionProgress = 1;
    weather.nextWeather = null;
    lightningBoltsRef.current = [];
  }, []);

  // Debug: Toggle fog overlay
  const toggleFog = useCallback(() => {
    const weather = weatherRef.current;
    if (weather.fogIntensity > 0 || fogTimerRef.current > 0) {
      fogTimerRef.current = 0;
    } else {
      fogTimerRef.current = 15000;
    }
  }, []);

  // Draw functions (wrappers)
  const drawSnowflakes = useCallback((ctx: CanvasRenderingContext2D, foregroundOnly?: boolean) => {
    drawSnowflakesRenderer(ctx, snowflakesRef.current, foregroundOnly);
  }, []);

  const drawFog = useCallback((ctx: CanvasRenderingContext2D) => {
    drawFogRenderer(ctx, weatherRef.current.fogIntensity, canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const drawSnowAccumulation = useCallback((ctx: CanvasRenderingContext2D) => {
    drawSnowAccumulationRenderer(ctx, snowAccumulationRef.current, snowGroundEdgeRef.current, canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const drawPipeFrost = useCallback((ctx: CanvasRenderingContext2D, pipes: Pipe[]) => {
    drawPipeFrostRenderer(ctx, pipes, canvasHeight);
  }, [canvasHeight]);

  const drawBackgroundBirds = useCallback((ctx: CanvasRenderingContext2D) => {
    drawBackgroundBirdsRenderer(ctx, backgroundBirdsRef.current);
  }, []);

  const drawFallingLeaves = useCallback((ctx: CanvasRenderingContext2D) => {
    drawFallingLeavesRenderer(ctx, fallingLeavesRef.current);
  }, []);

  const drawLightningBolts = useCallback((ctx: CanvasRenderingContext2D) => {
    drawLightningBoltsRenderer(ctx, lightningBoltsRef.current);
  }, []);

  const drawRain = useCallback((ctx: CanvasRenderingContext2D, foregroundOnly?: boolean) => {
    drawRainRenderer(ctx, rainDropsRef.current, foregroundOnly);
  }, []);

  const drawRainSplashes = useCallback((ctx: CanvasRenderingContext2D) => {
    drawRainSplashesRenderer(ctx, rainSplashesRef.current);
  }, []);

  return {
    // Refs
    weatherRef,
    weatherTimerRef,
    fogTimerRef,
    snowAccumulationRef,
    snowGroundEdgeRef,
    snowflakesRef,
    rainDropsRef,
    rainSplashesRef,
    backgroundBirdsRef,
    fallingLeavesRef,
    lightningBoltsRef,
    lastBirdSpawnRef,

    // Actions
    getTimeOfDayPhase,
    triggerLightningBolt,
    updateLightningBolts,
    spawnRainDrops,
    handleUpdateRainDrops,
    handleUpdateRainSplashes,
    spawnSnowflakes,
    updateSnowflakes,
    spawnBirdFlock,
    updateBackgroundBirds,
    spawnFallingLeaf,
    updateFallingLeaves,
    setWeatherType,
    toggleFog,

    // Renderers
    drawSnowflakes,
    drawFog,
    drawSnowAccumulation,
    drawPipeFrost,
    drawBackgroundBirds,
    drawFallingLeaves,
    drawLightningBolts,
    drawRain,
    drawRainSplashes,
  };
}
