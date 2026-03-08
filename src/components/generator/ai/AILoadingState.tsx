import { useState, useEffect, useRef } from 'react';
import { AI_LOADING_MESSAGES } from '@/config/aiLoadingMessages';

const MESSAGE_INTERVAL = 2500; // 2.5 seconds
const FALLBACK_TIMEOUT = 15000; // 15 seconds

interface AILoadingStateProps {
  currentImage: string | null;
}

export function AILoadingState({ currentImage }: AILoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % AI_LOADING_MESSAGES.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Fallback timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, FALLBACK_TIMEOUT);
    return () => clearTimeout(timeout);
  }, []);

  const currentMessage = showFallback
    ? 'Taking longer than usual... hang tight!'
    : AI_LOADING_MESSAGES[messageIndex];

  return (
    <div className="flex flex-col gap-4 md:flex-row items-center">
      {/* Original image */}
      {currentImage && (
        <div className="flex-1 flex justify-center">
          <div>
            <p className="ai-result-label mb-2">Original</p>
            <img
              src={currentImage}
              alt="Original Wojak"
              className="w-48 h-48 md:w-64 md:h-64 object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        </div>
      )}

      {/* Shimmer placeholder */}
      <div className="flex-1 flex justify-center">
        <div>
          <p className="ai-result-label mb-2">AI Enhanced</p>
          <div
            className="ai-shimmer w-48 h-48 md:w-64 md:h-64"
          />
        </div>
      </div>

      {/* Rotating message */}
      <div className="w-full text-center mt-2">
        <p className="text-secondary text-sm">{currentMessage}</p>
      </div>
    </div>
  );
}
