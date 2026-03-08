// src/components/generator/ai/AIEnhanceLightbox.tsx

import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AICategoryPicker } from './AICategoryPicker';
import { AIPromptBuilder } from './AIPromptBuilder';
import { AILoadingState } from './AILoadingState';
import { AIResultComparison } from './AIResultComparison';
import { AICreditsDisplay } from './AICreditsDisplay';
import { ArrowLeft } from 'lucide-react';
import type { AIWizardStep } from '@/types/aiEnhance';

interface AIEnhanceLightboxProps {
  /** Base64 data URL of the current canvas image to enhance */
  currentImage: string | null;
}

const STEP_ORDER: AIWizardStep[] = ['category', 'prompt', 'loading', 'result'];

export function AIEnhanceLightbox({ currentImage }: AIEnhanceLightboxProps) {
  const {
    isLightboxOpen,
    closeLightbox,
    wizardStep,
    setWizardStep,
    selectedCategory,
    isEnhancing,
  } = useAIEnhance();

  const handleBack = () => {
    if (wizardStep === 'result') setWizardStep('prompt');
    else if (wizardStep === 'prompt') setWizardStep('category');
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
        ? `${categoryLabel} Style`
        : wizardStep === 'loading'
          ? 'Creating...'
          : 'Your Enhancement';

  // Custom header: [Back] [Title + dots] [Credits]  (close button added by Lightbox)
  const header = (
    <div className="ai-wizard-header">
      {/* Left: back button or spacer */}
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

      {/* Right: credits badge */}
      <div className="ai-wizard-header-right">
        <AICreditsDisplay />
      </div>
    </div>
  );

  return (
    <Lightbox
      isOpen={isLightboxOpen}
      onClose={closeLightbox}
      headerContent={header}
      size="lg"
    >
      {/* Accent line */}
      <div className="ai-wizard-accent" />

      {/* Wizard steps */}
      <div className="flex flex-col gap-4 mt-2">
        {wizardStep === 'category' && (
          <AICategoryPicker currentImage={currentImage} />
        )}
        {wizardStep === 'prompt' && (
          <AIPromptBuilder currentImage={currentImage} />
        )}
        {wizardStep === 'loading' && (
          <AILoadingState currentImage={currentImage} />
        )}
        {wizardStep === 'result' && (
          <AIResultComparison currentImage={currentImage} />
        )}
      </div>
    </Lightbox>
  );
}
