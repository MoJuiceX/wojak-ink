/**
 * Quick Start Wizard
 *
 * Inline guided mode for first-time visitors. Walks through 7 category steps
 * using the real TraitSelector so users learn the actual UI.
 *
 * Steps: Eyes, Mouth, Clothes, Head, Face Wear (Mask), Extra (Mask), Background
 * Base is pre-selected as Classic (no choice needed).
 *
 * - Back/forward navigation via step indicator and bottom buttons
 * - "Skip" exits at any step into full generator
 * - "Randomize & Customize" generates random wojak + enters full generator
 * - Selections persist from wizard into full generator
 * - Step position stored in sessionStorage (survives refresh)
 * - Completion stored in localStorage (persists across visits)
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shuffle, SkipForward, Check } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import type { UILayerName } from '@/lib/layerRegistry';
import { markWizardComplete } from './wizardHelpers';

// ============ Constants ============

const WIZARD_STEP_KEY = 'wojak-wizard-step';

interface WizardStep {
  layer: UILayerName;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { layer: 'Eyes', title: 'Eyes', description: 'Choose your expression' },
  { layer: 'MouthBase', title: 'Mouth', description: 'Pick a mouth' },
  { layer: 'Clothes', title: 'Clothes', description: 'Dress your Wojak' },
  { layer: 'Head', title: 'Head', description: 'Choose headgear' },
  { layer: 'Mask', title: 'Extras', description: 'Add face accessories' },
  { layer: 'Background', title: 'Background', description: 'Set the scene' },
];

function getSavedStep(): number {
  try {
    const saved = sessionStorage.getItem(WIZARD_STEP_KEY);
    if (saved !== null) {
      const step = parseInt(saved, 10);
      if (step >= 0 && step < WIZARD_STEPS.length) return step;
    }
  } catch {
    // Ignore
  }
  return 0;
}

function saveStep(step: number): void {
  try {
    sessionStorage.setItem(WIZARD_STEP_KEY, String(step));
  } catch {
    // Ignore
  }
}

// ============ Step Indicator ============

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

function StepIndicator({ currentStep, totalSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Wizard steps">
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isClickable = i <= currentStep;

        return (
          <button
            key={i}
            type="button"
            onClick={() => isClickable && onStepClick(i)}
            disabled={!isClickable}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: isCurrent ? 28 : 20,
              height: isCurrent ? 28 : 20,
              borderRadius: '50%',
              background: isCurrent
                ? 'var(--color-primary)'
                : isCompleted
                  ? 'var(--color-primary)'
                  : 'var(--color-surface)',
              border: isCurrent
                ? '2px solid var(--color-primary)'
                : isCompleted
                  ? '2px solid var(--color-primary)'
                  : '2px solid var(--color-border)',
              opacity: isClickable ? 1 : 0.4,
              cursor: isClickable ? 'pointer' : 'default',
            }}
            aria-label={`Step ${i + 1}: ${WIZARD_STEPS[i].title}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {isCompleted ? (
              <Check size={12} className="text-white" />
            ) : (
              <span
                className="text-xs font-semibold"
                style={{ color: isCurrent ? 'white' : 'var(--color-text-muted)' }}
              >
                {i + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============ Wizard Component ============

interface QuickStartWizardProps {
  onComplete: () => void;
  onSkip: () => void;
  onRandomize: () => void;
}

export function QuickStartWizard({ onComplete, onSkip, onRandomize }: QuickStartWizardProps) {
  const { setActiveLayer } = useGenerator();
  const [currentStep, setCurrentStep] = useState(getSavedStep);

  const step = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  // Sync active layer with wizard step
  useEffect(() => {
    setActiveLayer(step.layer);
    saveStep(currentStep);
  }, [currentStep, step.layer, setActiveLayer]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < WIZARD_STEPS.length) {
      setCurrentStep(stepIndex);
    }
  }, []);

  const goNext = useCallback(() => {
    if (isLastStep) {
      markWizardComplete();
      onComplete();
    } else {
      setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    }
  }, [isLastStep, onComplete]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  return (
    <div className="wizard-overlay flex flex-col gap-3 w-full">
      {/* Step header */}
      <div className="wizard-header flex flex-col items-center gap-2 py-2">
        <StepIndicator
          currentStep={currentStep}
          totalSteps={WIZARD_STEPS.length}
          onStepClick={goToStep}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Step {currentStep + 1} of {WIZARD_STEPS.length}: {step.title}
            </h3>
            <p className="text-xs text-muted mt-0.5">{step.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation + skip buttons */}
      <div className="wizard-nav flex items-center justify-between gap-2 px-2">
        {/* Back button */}
        <button
          type="button"
          onClick={goBack}
          disabled={isFirstStep}
          className="btn btn-ghost text-xs flex items-center gap-1"
          style={{ opacity: isFirstStep ? 0.3 : 1 }}
          aria-label="Previous step"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        {/* Center: skip + randomize */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="btn btn-ghost text-xs flex items-center gap-1"
            aria-label="Skip wizard"
          >
            <SkipForward size={14} />
            Skip
          </button>
          <button
            type="button"
            onClick={onRandomize}
            className="btn btn-ghost text-xs flex items-center gap-1"
            style={{ color: 'var(--color-primary)' }}
            aria-label="Randomize and customize"
          >
            <Shuffle size={14} />
            Randomize
          </button>
        </div>

        {/* Next / Finish button */}
        <button
          type="button"
          onClick={goNext}
          className="btn btn-primary text-xs flex items-center gap-1"
          aria-label={isLastStep ? 'Finish wizard' : 'Next step'}
        >
          {isLastStep ? 'Done' : 'Next'}
          {!isLastStep && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
