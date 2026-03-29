// src/components/generator/ai/AIEnhanceLightbox.tsx

import { useEffect, useRef, useState } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AICategoryPicker } from './AICategoryPicker';
import { AIPromptBuilder } from './AIPromptBuilder';
import { AILoadingState } from './AILoadingState';
import { AIResultComparison } from './AIResultComparison';
import { AICreditsDisplay } from './AICreditsDisplay';
import { ArrowLeft, Info, Sparkles } from 'lucide-react';
import type { AIWizardStep } from '@/types/aiEnhance';

interface AIEnhanceLightboxProps {
  /** Base64 data URL of the current canvas image to enhance */
  currentImage: string | null;
}

const STEP_ORDER: AIWizardStep[] = ['category', 'prompt', 'loading', 'result'];

export function AIEnhanceLightbox({ currentImage }: AIEnhanceLightboxProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const {
    isLightboxOpen,
    closeLightbox,
    wizardStep,
    setWizardStep,
    selectedCategory,
    selectedMode,
    isEnhancing,
    enhancedImage,
    handlePromptBack,
  } = useAIEnhance();

  // Always use the latest image (enhanced or original) for both display and AI input.
  // If the user has accepted a previous enhancement (e.g., background), subsequent
  // enhancements (e.g., clothing) must build on that result to preserve prior work.
  const activeImage = enhancedImage ?? currentImage;

  useEffect(() => {
    if (!isLightboxOpen) {
      setIsInfoOpen(false);
    }
  }, [isLightboxOpen]);

  useEffect(() => {
    if (!isInfoOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!infoRef.current?.contains(event.target as Node)) {
        setIsInfoOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsInfoOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isInfoOpen]);

  const handleBack = () => {
    if (wizardStep === 'result') {
      setWizardStep('prompt');
    } else if (wizardStep === 'prompt') {
      // Delegate to context — it knows the prompt sub-step
      handlePromptBack();
    }
  };

  const showBack = (wizardStep === 'prompt' || wizardStep === 'result') && !isEnhancing;
  const currentStepIndex = STEP_ORDER.indexOf(wizardStep);

  // Dynamic title
  const categoryLabel = selectedCategory
    ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
    : '';
  const displayTitle =
    wizardStep === 'category'
      ? 'Enhance with AI'
      : wizardStep === 'prompt'
        ? selectedMode === 'create_new'
          ? `New ${categoryLabel}`
          : `${categoryLabel} Style`
        : wizardStep === 'loading'
          ? 'Creating...'
          : 'Your Enhancement';

  // Custom header: [Back + Credits] [Title + dots] [Info]  (close button added by Lightbox)
  const header = (
    <div className="ai-wizard-header">
      {/* Left: back button + credits */}
      <div className="ai-wizard-header-left">
        {showBack ? (
          <button
            className="ai-wizard-back"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        ) : null}
        <AICreditsDisplay />
      </div>

      {/* Center: title + step dots */}
      <div className="ai-wizard-header-center">
        <h2 className="ai-wizard-title">{displayTitle}</h2>
        <div className="ai-wizard-steps">
          {STEP_ORDER.map((step, i) => (
            <div
              key={step}
              className={`ai-wizard-dot ${
                i === currentStepIndex
                  ? 'ai-wizard-dot--active'
                  : i < currentStepIndex
                    ? 'ai-wizard-dot--done'
                    : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right: info tooltip */}
      <div className="ai-wizard-header-right">
        <div
          ref={infoRef}
          className={`ai-info-tooltip-wrapper${isInfoOpen ? ' ai-info-tooltip-wrapper--open' : ''}`}
        >
          <button
            type="button"
            className="ai-info-btn"
            aria-label="AI Enhance info"
            aria-expanded={isInfoOpen}
            aria-haspopup="dialog"
            onClick={() => setIsInfoOpen((open) => !open)}
          >
            <Info size={14} />
          </button>
          <div className="ai-info-tooltip">
            <div className="ai-info-tooltip-eyebrow">
              <Sparkles size={12} />
              <span>AI Enhance</span>
            </div>
            <ul className="ai-info-tooltip-list">
              <li>Transform selected parts of your Wojak with AI.</li>
              <li>Each generation costs 1 credit.</li>
              <li>Enhance background first, because background is locked after clothing or head edits.</li>
              <li>Accepted AI images stay saved in your portfolio.</li>
              <li>Accepted edits become your active export and mint version.</li>
              <li>AI enhancements change NFT metadata and contribute to type, nature, and ability.</li>
              <li>You can reset anytime to return to your original layers.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Lightbox
      isOpen={isLightboxOpen}
      onClose={closeLightbox}
      headerContent={header}
      contentClassName="ai-enhance-lightbox"
      size="xl"
    >
      {/* Accent line */}
      <div className="ai-wizard-accent" />

      {/* Wizard steps */}
      <div className="flex flex-col gap-2 sm:gap-4 mt-1 sm:mt-2">
        {wizardStep === 'category' && (
          <AICategoryPicker currentImage={activeImage} />
        )}
        {wizardStep === 'prompt' && (
          <AIPromptBuilder currentImage={activeImage} />
        )}
        {wizardStep === 'loading' && (
          <AILoadingState currentImage={activeImage} />
        )}
        {wizardStep === 'result' && (
          <AIResultComparison currentImage={activeImage} />
        )}
      </div>
    </Lightbox>
  );
}
