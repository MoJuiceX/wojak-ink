import { useState, useEffect } from 'react';
import { AI_LOADING_MESSAGES } from '@/config/aiLoadingMessages';

const MESSAGE_INTERVAL = 2500; // 2.5 seconds
const FALLBACK_TIMEOUT = 15000; // 15 seconds

interface AILoadingStateProps {
  currentImage: string | null;
}

export function AILoadingState({ currentImage }: AILoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

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
    <div className="flex flex-col gap-4 items-center">
      {/* Side-by-side images */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6 items-center justify-center">
        {/* Original */}
        {currentImage && (
          <div className="flex flex-col items-center">
            <p className="ai-result-label mb-2">Original</p>
            <img
              src={currentImage}
              alt="Original Wojak"
              className="w-48 h-48 md:w-56 md:h-56 object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        )}

        {/* Shimmer placeholder */}
        <div className="flex flex-col items-center">
          <p className="ai-result-label mb-2">AI Enhanced</p>
          <div className="ai-shimmer w-48 h-48 md:w-56 md:h-56" />
        </div>
      </div>

      {/* Rotating message */}
      <p className="text-secondary text-sm text-center">{currentMessage}</p>
    </div>
  );
}
