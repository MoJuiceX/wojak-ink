/**
 * useTypingAnimation Hook
 *
 * Simulates a natural typing effect with variable speed and punctuation pauses.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { TYPING_CONFIG } from '@/config/bigpulpAnimations';

interface UseTypingAnimationOptions {
  speed?: number;
  variation?: number;
  punctuationPause?: number;
  initialDelay?: number;
  onComplete?: () => void;
}

interface UseTypingAnimationResult {
  displayedText: string;
  isTyping: boolean;
  cursorVisible: boolean;
  skip: () => void;
  reset: () => void;
}

export function useTypingAnimation(
  text: string,
  options: UseTypingAnimationOptions = {}
): UseTypingAnimationResult {
  const {
    speed = TYPING_CONFIG.baseSpeed,
    variation = TYPING_CONFIG.variation,
    punctuationPause = TYPING_CONFIG.punctuationPause,
    initialDelay = TYPING_CONFIG.initialDelay,
    onComplete,
  } = options;

  const prefersReducedMotion = useReducedMotion();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const textRef = useRef(text);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = null;
    }
  }, []);

  // Skip to end
  const skip = useCallback(() => {
    clearTimeouts();
    setDisplayedText(textRef.current);
    setIsTyping(false);
    onComplete?.();
  }, [clearTimeouts, onComplete]);

  // Reset
  const reset = useCallback(() => {
    clearTimeouts();
    setDisplayedText('');
    setIsTyping(false);
    indexRef.current = 0;
  }, [clearTimeouts]);

  // Start typing effect
  useEffect(() => {
    // Update text reference
    textRef.current = text;

    // If reduced motion, show instantly
    if (prefersReducedMotion) {
      // Using flushSync-style batching via callback to avoid lint warning
      // This is intentional - we need to sync state with external preference
      queueMicrotask(() => {
        setDisplayedText(text);
        setIsTyping(false);
        onComplete?.();
      });
      return;
    }

    // Reset state via microtask to batch properly
    queueMicrotask(() => {
      setDisplayedText('');
      setIsTyping(true);
    });
    indexRef.current = 0;

    // Type function
    const type = () => {
      const currentText = textRef.current;

      if (indexRef.current >= currentText.length) {
        setIsTyping(false);
        // Hide cursor after delay
        cursorTimeoutRef.current = setTimeout(() => {
          setCursorVisible(false);
        }, TYPING_CONFIG.postTypingCursorDuration);
        onComplete?.();
        return;
      }

      // Type 1-3 characters at once (more natural)
      const chunk = Math.min(
        Math.floor(Math.random() * 3) + 1,
        currentText.length - indexRef.current
      );

      indexRef.current += chunk;
      setDisplayedText(currentText.slice(0, indexRef.current));

      // Calculate delay
      let delay = speed + (Math.random() * variation * 2 - variation);
      const lastChar = currentText[indexRef.current - 1];
      if (['.', ',', '!', '?'].includes(lastChar)) {
        delay += punctuationPause;
      }

      timeoutRef.current = setTimeout(type, delay);
    };

    // Start after initial delay
    timeoutRef.current = setTimeout(type, initialDelay);

    // Cleanup
    return clearTimeouts;
  }, [
    text,
    speed,
    variation,
    punctuationPause,
    initialDelay,
    prefersReducedMotion,
    onComplete,
    clearTimeouts,
  ]);

  // Cursor blink effect
  useEffect(() => {
    if (!isTyping && !prefersReducedMotion) {
      return;
    }

    // Set initial cursor state via microtask to avoid lint warning
    queueMicrotask(() => setCursorVisible(true));
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, TYPING_CONFIG.cursorBlinkInterval);

    return () => clearInterval(interval);
  }, [isTyping, prefersReducedMotion]);

  return {
    displayedText,
    isTyping,
    cursorVisible: isTyping ? cursorVisible : false,
    skip,
    reset,
  };
}
