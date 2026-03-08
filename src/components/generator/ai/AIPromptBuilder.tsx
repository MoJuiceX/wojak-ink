// src/components/generator/ai/AIPromptBuilder.tsx

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { useGenerator } from '@/contexts/GeneratorContext';
import { isSelectionPathEmpty } from '@/types/generator';
import type { GeneratorLayerName } from '@/lib/memeLayers';
import { AI_CATEGORIES } from '@/types/aiEnhance';
import type { AICategory, AIStyleFamily, AIPresetOption } from '@/types/aiEnhance';
import { AI_PRESET_CATALOG, getRandomPreset } from '@/config/aiEnhancePresets';

type PromptSubStep = 'mode' | 'family' | 'option' | 'confirm';

/** Layer keys for categories available in the AI wizard (facewear excluded). */
const CATEGORY_LAYER_KEYS: Partial<Record<AICategory, GeneratorLayerName[]>> = {
  clothes: ['Clothes'],
  head: ['Head'],
  background: ['Background'],
};

/** Extract a display name from a layer path like 'layers/Head/crown.png' -> 'Crown' */
function layerDisplayName(path: string | undefined): string {
  if (!path) return '';
  const filename = path.split('/').pop()?.replace('.png', '')?.replace(/-/g, ' ') ?? '';
  return filename.charAt(0).toUpperCase() + filename.slice(1);
}

/** Inline back button for internal sub-navigation */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="text-secondary text-xs cursor-pointer hover:text-white mb-3 flex items-center gap-1"
      onClick={onClick}
    >
      &larr; Back
    </button>
  );
}

interface AIPromptBuilderProps {
  currentImage: string | null;
}

export function AIPromptBuilder({ currentImage }: AIPromptBuilderProps) {
  const {
    selectedCategory,
    selectedMode,
    setSelectedMode,
    setWizardStep,
    submitEnhance,
    isEnhancing,
    enhanceError,
    clearError,
    balance,
    openShop,
  } = useAIEnhance();
  const { selectedLayers } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  // Determine if the user has a layer selected for this category
  const hasLayer = (() => {
    if (!selectedCategory) return false;
    const keys = CATEGORY_LAYER_KEYS[selectedCategory] ?? [];
    return keys.some((k) => !isSelectionPathEmpty(selectedLayers[k]));
  })();

  // Should we skip the mode sub-step?
  const shouldSkipMode = selectedCategory === 'background' || !hasLayer;

  // Compute initial sub-step: if mode should be skipped, start at 'family'
  const [subStep, setSubStep] = useState<PromptSubStep>(() =>
    shouldSkipMode ? 'family' : 'mode'
  );
  const [selectedFamily, setSelectedFamily] = useState<AIStyleFamily | null>(null);
  const [selectedOption, setSelectedOption] = useState<AIPresetOption | null>(null);

  // When shouldSkipMode is true and we haven't set mode yet, set it synchronously
  // before render. This is safe because setSelectedMode is a context setter and
  // we're calling it only when mode is null (first render for this category).
  if (shouldSkipMode && !selectedMode) {
    setSelectedMode('create_new');
  }

  // Get the layer display name for the enhance card
  const layerName = (() => {
    if (!selectedCategory) return '';
    const keys = CATEGORY_LAYER_KEYS[selectedCategory] ?? [];
    for (const k of keys) {
      const path = selectedLayers[k];
      if (!isSelectionPathEmpty(path)) return layerDisplayName(path);
    }
    return '';
  })();

  // Get families for the current category and mode
  const families = (() => {
    if (!selectedCategory || !selectedMode) return [];
    const presets = AI_PRESET_CATALOG[selectedCategory];
    if (!presets) return [];
    return (selectedMode === 'enhance' ? presets.enhance : presets.create_new) ?? [];
  })();

  if (!selectedCategory) return null;

  const categoryConfig = AI_CATEGORIES[selectedCategory];

  // --- Handlers ---

  const handleModeSelect = (mode: 'enhance' | 'create_new') => {
    setSelectedMode(mode);
    clearError();
    setSubStep('family');
  };

  const handleFamilySelect = (family: AIStyleFamily) => {
    setSelectedFamily(family);
    setSelectedOption(null);
    clearError();
    setSubStep('option');
  };

  const handleSurpriseMe = () => {
    if (!selectedMode) return;
    const result = getRandomPreset(selectedCategory, selectedMode);
    if (result) {
      setSelectedFamily(result.family);
      setSelectedOption(result.option);
      clearError();
      setSubStep('confirm');
    }
  };

  const handleOptionSelect = (option: AIPresetOption) => {
    setSelectedOption(option);
    clearError();
    setSubStep('confirm');
  };

  const handleConfirm = () => {
    if (!currentImage || !selectedOption || isEnhancing) return;
    submitEnhance(currentImage, selectedCategory, selectedOption.prompt);
  };

  const handleInternalBack = () => {
    clearError();
    if (subStep === 'confirm') {
      setSubStep('option');
    } else if (subStep === 'option') {
      setSelectedFamily(null);
      setSelectedOption(null);
      setSubStep('family');
    } else if (subStep === 'family') {
      if (shouldSkipMode) {
        // Go back to category (parent handles this)
        setWizardStep('category');
      } else {
        setSubStep('mode');
      }
    }
  };

  // --- Sub-step: mode ---
  if (subStep === 'mode' && !shouldSkipMode) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            className="ai-category-btn"
            onClick={() => handleModeSelect('enhance')}
            whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl ai-category-icon">&#10024;</span>
              <span className="font-semibold ai-category-text">Enhance my {layerName}</span>
            </div>
            <p className="text-secondary text-xs">Modify existing style</p>
          </motion.button>

          <motion.button
            className="ai-category-btn"
            onClick={() => handleModeSelect('create_new')}
            whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl ai-category-icon">&#127195;</span>
              <span className="font-semibold ai-category-text">Create new {categoryConfig.label.toLowerCase()}</span>
            </div>
            <p className="text-secondary text-xs">Start from scratch</p>
          </motion.button>
        </div>
      </div>
    );
  }

  // --- Sub-step: family ---
  if (subStep === 'family') {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={handleInternalBack} />
        <div className="grid grid-cols-2 gap-3">
          {families.map((family) => {
            const emoji = family.label.charAt(0);
            const name = family.label.slice(2).trim();
            return (
              <motion.button
                key={family.label}
                className="ai-category-btn"
                onClick={() => handleFamilySelect(family)}
                whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl ai-category-icon">{emoji}</span>
                  <span className="font-semibold ai-category-text">{name}</span>
                </div>
              </motion.button>
            );
          })}

          {/* Surprise Me */}
          <motion.button
            className="ai-category-btn"
            onClick={handleSurpriseMe}
            whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl ai-category-icon">&#127922;</span>
              <span className="font-semibold ai-category-text">Surprise Me</span>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // --- Sub-step: option ---
  if (subStep === 'option' && selectedFamily) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={handleInternalBack} />
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{selectedFamily.label.charAt(0)}</span>
          <span className="font-semibold">{selectedFamily.label.slice(2).trim()}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {selectedFamily.options.map((option) => (
            <motion.button
              key={option.label}
              className="ai-preset-btn"
              onClick={() => handleOptionSelect(option)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // --- Sub-step: confirm ---
  if (subStep === 'confirm' && selectedOption) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={handleInternalBack} />
        <div className="ai-confirm-card p-4 flex flex-col gap-3">
          {/* Summary */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedMode === 'enhance' ? '\u2728' : '\uD83C\uDD95'}</span>
              <span className="font-semibold">{categoryConfig.label}</span>
            </div>
            {selectedFamily && (
              <p className="text-secondary text-sm">{selectedFamily.label}</p>
            )}
            <p className="text-sm">{selectedOption.label}</p>
          </div>

          <hr className="ai-confirm-divider" />

          {/* Error */}
          {enhanceError && (
            <p className="text-sm text-error">{enhanceError}</p>
          )}

          {/* Action button */}
          {balance < 1 ? (
            <motion.button
              className="btn btn-primary w-full"
              onClick={openShop}
              whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
              whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
            >
              No credits &mdash; Buy more
            </motion.button>
          ) : (
            <motion.button
              className="btn btn-primary w-full"
              onClick={handleConfirm}
              disabled={isEnhancing || !currentImage}
              whileHover={!isEnhancing && !prefersReducedMotion ? { scale: 1.02 } : {}}
              whileTap={!isEnhancing && !prefersReducedMotion ? { scale: 0.98 } : {}}
            >
              {isEnhancing ? 'Enhancing...' : 'Enhance \u2014 1 credit'}
            </motion.button>
          )}

          {/* Disclaimer */}
          <p className="ai-confirm-disclaimer text-muted text-xs text-center">
            Results may vary &mdash; no charge if you discard
          </p>
        </div>
      </div>
    );
  }

  // Fallback (should not reach here normally)
  return null;
}
