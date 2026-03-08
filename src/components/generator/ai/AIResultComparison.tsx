import { motion, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';

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
  } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();

  if (!currentResult) return null;

  const resultImageSrc = `data:image/png;base64,${currentResult.imageBase64}`;

  const handleAcceptAndDone = () => {
    acceptResult();
    closeLightbox();
  };

  const handleAcceptAndContinue = () => {
    acceptResult();
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
              className="w-48 h-48 md:w-56 md:h-56 object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        )}

        {/* AI Result */}
        <div className="flex flex-col items-center">
          <p className="ai-result-label mb-2">AI Enhanced</p>
          <img
            src={resultImageSrc}
            alt="AI Enhanced Wojak"
            className="w-48 h-48 md:w-56 md:h-56 object-contain"
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
        </div>
      </div>

      {/* Prompt used */}
      <p className="text-muted text-xs text-center">
        &quot;{currentResult.prompt}&quot;
      </p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 w-full md:flex md:gap-3 md:justify-center">
        <motion.button
          className="btn btn-primary"
          onClick={handleAcceptAndDone}
          {...buttonMotion}
        >
          Accept &amp; Done
        </motion.button>
        <motion.button
          className="btn btn-secondary"
          onClick={handleAcceptAndContinue}
          {...buttonMotion}
        >
          Accept &amp; Continue
        </motion.button>
        <motion.button
          className="btn btn-ghost"
          onClick={handleRetry}
          disabled={isEnhancing || balance < 1}
          {...buttonMotion}
        >
          {isEnhancing ? 'Retrying...' : 'Retry (1 credit)'}
        </motion.button>
        <motion.button
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
