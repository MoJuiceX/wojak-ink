import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { compositeMaskedEnhancement, compositeOverlay } from '@/lib/aiEnhanceImage';

interface AIResultComparisonProps {
  currentImage: string | null;
}

export function AIResultComparison({ currentImage }: AIResultComparisonProps) {
  const {
    currentResult,
    acceptResult,
    closeLightbox,
    setWizardStep,
    selectedCategory,
    submitEnhance,
    isEnhancing,
    balance,
    characterOverlay,
    targetOverlays,
  } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [shimmerVisible, setShimmerVisible] = useState(true);
  const [compositedPreview, setCompositedPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const buildPreview = async () => {
      if (!currentResult) {
        setCompositedPreview(null);
        return;
      }

      if (currentResult.isBgOnly && characterOverlay) {
        const bgDataUrl = `data:${currentResult.contentType ?? 'image/png'};base64,${currentResult.imageBase64}`;
        const composited = await compositeOverlay(bgDataUrl, characterOverlay);
        if (!cancelled) setCompositedPreview(composited);
        return;
      }

      if (
        currentImage &&
        (currentResult.category === 'clothes' || currentResult.category === 'head')
      ) {
        const targetOverlay = targetOverlays[currentResult.category];
        if (targetOverlay) {
          const enhancedDataUrl = `data:${currentResult.contentType ?? 'image/png'};base64,${currentResult.imageBase64}`;
          const composited = await compositeMaskedEnhancement(currentImage, enhancedDataUrl, targetOverlay);
          if (!cancelled) setCompositedPreview(composited);
          return;
        }
      }

      setCompositedPreview(null);
    };

    void buildPreview();
    return () => {
      cancelled = true;
    };
  }, [currentResult, characterOverlay, currentImage, targetOverlays]);

  if (!currentResult) return null;

  // Show composited preview for backgrounds, raw result for other categories
  const resultImageSrc = compositedPreview ?? `data:${currentResult.contentType ?? 'image/png'};base64,${currentResult.imageBase64}`;

  const handleAcceptAndDone = async () => {
    await acceptResult(currentImage);
    closeLightbox();
  };

  const handleAcceptAndContinue = async () => {
    await acceptResult(currentImage);
    setWizardStep('category');
  };

  const handleRetry = () => {
    if (!currentImage || !selectedCategory || isEnhancing) return;
    submitEnhance(currentImage, selectedCategory, currentResult.prompt);
  };

  const handleReject = () => {
    setWizardStep('prompt');
  };

  const buttonMotion = prefersReducedMotion
    ? {}
    : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } };

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
              className="w-48 h-48 md:w-96 md:h-96 object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        )}

        {/* AI Result */}
        <div className="flex flex-col items-center">
          <p className="ai-result-label mb-2">AI Enhanced</p>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
            <img
              src={resultImageSrc}
              alt="AI Enhanced Wojak"
              className="w-48 h-48 md:w-96 md:h-96 object-contain"
            />
            <AnimatePresence>
              {shimmerVisible && !prefersReducedMotion && (
                <motion.div
                  className="ai-shimmer"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  onAnimationComplete={() => setShimmerVisible(false)}
                  style={{ position: 'absolute', inset: 0 }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Prompt used */}
      <p className="text-muted text-xs text-center">
        &quot;{currentResult.prompt}&quot;
      </p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 w-full md:flex md:gap-3 md:justify-center">
        <motion.button
          type="button"
          className="btn btn-primary"
          onClick={handleAcceptAndDone}
          {...buttonMotion}
        >
          Accept &amp; Done
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-secondary"
          onClick={handleAcceptAndContinue}
          {...buttonMotion}
        >
          Accept &amp; Continue
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-ghost"
          onClick={handleRetry}
          disabled={isEnhancing || balance < 1}
          {...buttonMotion}
        >
          {isEnhancing ? 'Retrying...' : 'Retry (1 credit)'}
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-ghost"
          onClick={handleReject}
          {...buttonMotion}
        >
          Reject
        </motion.button>
      </div>
    </div>
  );
}
