/**
 * useAnimatedCounter Hook
 *
 * Animates a number counting up to a target value.
 * Respects reduced motion preferences.
 */

import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';
import { usePrefersReducedMotion } from './useMediaQuery';

interface CounterOptions {
  duration?: number;
  delay?: number;
  decimals?: number;
}

export function useAnimatedCounter(
  target: number,
  options: CounterOptions = {}
): number {
  const { duration = 1, delay = 0, decimals = 0 } = options;
  const prefersReduced = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Skip animation if reduced motion
    if (prefersReduced) {
      queueMicrotask(() => setDisplayValue(target));
      return;
    }

    const controls = animate(0, target, {
      duration,
      delay,
      onUpdate: (value) => {
        setDisplayValue(Number(value.toFixed(decimals)));
      },
    });

    return () => controls.stop();
  }, [target, duration, delay, decimals, prefersReduced]);

  return displayValue;
}

export default useAnimatedCounter;
