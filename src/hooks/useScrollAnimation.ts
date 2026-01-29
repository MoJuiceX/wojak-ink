/**
 * Scroll Animation Hook
 *
 * Intersection Observer based scroll animations.
 *
 * GUIDELINES:
 * 1. Threshold: 0.1-0.2 (trigger when 10-20% visible)
 * 2. Once: true for most cases (don't re-animate)
 * 3. Stagger: 50-100ms between list items
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If reduced motion, show immediately
    if (prefersReducedMotion) {
      queueMicrotask(() => {
        setIsVisible(true);
        setHasAnimated(true);
      });
      return;
    }

    // If already animated and triggerOnce, don't observe
    if (hasAnimated && triggerOnce) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasAnimated(true);
          }

          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, delay, hasAnimated, prefersReducedMotion]);

  // Animation variants based on visibility
  const animationProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
      };
    }

    return {
      initial: { opacity: 0, y: 20 },
      animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
      transition: { duration: 0.4, ease: 'easeOut' },
    };
  }, [isVisible, prefersReducedMotion]);

  return {
    ref,
    isVisible,
    hasAnimated,
    animationProps,
  };
}

// Stagger animation for lists
export function useStaggerAnimation(
  _itemCount: number,
  options: UseScrollAnimationOptions & { stagger?: number } = {}
) {
  const { stagger = 50, ...scrollOptions } = options;
  const { ref, isVisible } = useScrollAnimation(scrollOptions);
  const prefersReducedMotion = useReducedMotion();

  const containerProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {};
    }

    return {
      initial: 'hidden',
      animate: isVisible ? 'visible' : 'hidden',
      variants: {
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger / 1000,
          },
        },
      },
    };
  }, [isVisible, stagger, prefersReducedMotion]);

  const itemProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
      };
    }

    return {
      variants: {
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: 'easeOut' },
        },
      },
    };
  }, [prefersReducedMotion]);

  return {
    ref,
    isVisible,
    containerProps,
    itemProps,
  };
}

export default useScrollAnimation;
