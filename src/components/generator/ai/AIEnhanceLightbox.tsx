// src/components/generator/ai/AIEnhanceLightbox.tsx

import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AICategoryPicker } from './AICategoryPicker';
import { AIPromptBuilder } from './AIPromptBuilder';
import { AILoadingState } from './AILoadingState';
import { AIResultComparison } from './AIResultComparison';
import { AICreditsDisplay } from './AICreditsDisplay';

interface AIEnhanceLightboxProps {
  /** Base64 of the current canvas image to enhance */
  currentImage: string | null;
}

export function AIEnhanceLightbox({ currentImage }: AIEnhanceLightboxProps) {
  const {
    isLightboxOpen,
    closeLightbox,
    wizardStep,
    setWizardStep,
    selectedCategory,
    isEnhancing,
  } = useAIEnhance();

  const stepTitles: Record<string, string> = {
    category: 'Enhance with AI',
    prompt: `Enhance ${selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : ''}`,
    loading: 'Creating...',
    result: 'Your AI Enhancement',
  };

  const handleBack = () => {
    if (wizardStep === 'result') setWizardStep('prompt');
    else if (wizardStep === 'prompt') setWizardStep('category');
  };

  const showBack = wizardStep === 'prompt' || wizardStep === 'result';

  return (
    <Lightbox
      isOpen={isLightboxOpen}
      onClose={closeLightbox}
      title={stepTitles[wizardStep] ?? 'Enhance with AI'}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Back button + Credits */}
        <div className="flex items-center justify-between">
          <div>
            {showBack && !isEnhancing && (
              <button
                className="btn btn-ghost text-sm"
                onClick={handleBack}
              >
                ← Back
              </button>
            )}
          </div>
          <AICreditsDisplay />
        </div>

        {/* Wizard steps */}
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
