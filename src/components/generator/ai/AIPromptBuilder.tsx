// src/components/generator/ai/AIPromptBuilder.tsx

import { motion, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { useGenerator } from '@/contexts/GeneratorContext';
import { isSelectionPathEmpty } from '@/types/generator';
import type { GeneratorLayerName } from '@/lib/memeLayers';
import { AI_CATEGORIES } from '@/types/aiEnhance';
import type { AICategory, AIStyleFamily, AIPresetOption } from '@/types/aiEnhance';
import { AI_PRESET_CATALOG, getRandomPreset } from '@/config/aiEnhancePresets';
import { parseFamilyLabel, getFamilyGradient, getFamilyAccent } from '@/config/aiEnhanceFamilyColors';

/** Layer keys for categories available in the AI wizard. */
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

interface AIPromptBuilderProps {
  currentImage: string | null;
}

export function AIPromptBuilder({ currentImage }: AIPromptBuilderProps) {
  const {
    selectedCategory,
    selectedMode,
    setSelectedMode,
    promptSubStep,
    setPromptSubStep,
    selectedFamily,
    setSelectedFamily,
    selectedOption,
    setSelectedOption,
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

  const isBackgroundCategory = selectedCategory === 'background';

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
    setPromptSubStep('family');
  };

  const handleFamilySelect = (family: AIStyleFamily) => {
    setSelectedFamily(family);
    setSelectedOption(null);
    clearError();
    setPromptSubStep('option');
  };

  const handleSurpriseMe = () => {
    if (!selectedMode) return;
    const result = getRandomPreset(selectedCategory, selectedMode);
    if (result) {
      setSelectedFamily(result.family);
      setSelectedOption(result.option);
      clearError();
      setPromptSubStep('confirm');
    }
  };

  const handleOptionSelect = (option: AIPresetOption) => {
    setSelectedOption(option);
    clearError();
    setPromptSubStep('confirm');
  };

  const handleConfirm = () => {
    if (!currentImage || !selectedOption || isEnhancing) return;
    submitEnhance(currentImage, selectedCategory, selectedOption.prompt);
  };

  // --- Wojak preview (shown on all sub-steps) ---
  const wojakPreview = currentImage ? (
    <div className="ai-prompt-preview">
      <img
        src={currentImage}
        alt="Your Wojak"
        className="ai-prompt-preview-img"
      />
    </div>
  ) : null;

  // --- Sub-step: mode ---
  if (promptSubStep === 'mode') {
    return (
      <div className="ai-prompt-layout">
        {wojakPreview}
        <div className="ai-prompt-content">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              className={`ai-family-card${!hasLayer ? ' ai-family-card--disabled' : ''}`}
              onClick={() => hasLayer && handleModeSelect('enhance')}
              disabled={!hasLayer}
              whileHover={prefersReducedMotion || !hasLayer ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion || !hasLayer ? {} : { scale: 0.97 }}
            >
              <span className="ai-family-emoji">&#10024;</span>
              <span className="ai-family-name">
                {isBackgroundCategory
                  ? (hasLayer ? 'Make it dramatic' : 'Enhance existing')
                  : hasLayer ? `Enhance my ${layerName}` : 'Enhance existing'}
              </span>
              <span className="ai-family-desc">
                {isBackgroundCategory
                  ? (hasLayer ? 'Intensify existing background' : 'No background selected')
                  : hasLayer ? 'Modify existing style' : 'No layer selected'}
              </span>
            </motion.button>

            <motion.button
              type="button"
              className="ai-family-card"
              onClick={() => handleModeSelect('create_new')}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            >
              <span className="ai-family-emoji">&#127195;</span>
              <span className="ai-family-name">
                {isBackgroundCategory ? 'New scene' : `Create new ${categoryConfig.label.toLowerCase()}`}
              </span>
              <span className="ai-family-desc">
                {isBackgroundCategory ? 'Replace with fresh background' : 'Start from scratch'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // --- Sub-step: family ---
  if (promptSubStep === 'family') {
    return (
      <div className="ai-prompt-layout">
        {wojakPreview}
        <div className="ai-prompt-content">
          <div className="grid grid-cols-2 gap-3">
            {families.map((family) => {
              const { emoji, name } = parseFamilyLabel(family.label);
              const gradient = getFamilyGradient(family.label);
              return (
                <motion.button
                  type="button"
                  key={family.label}
                  className="ai-family-card"
                  style={{ '--family-bg': gradient, '--family-accent': getFamilyAccent(family.label) } as React.CSSProperties}
                  onClick={() => handleFamilySelect(family)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                >
                  <span className="ai-family-emoji">{emoji}</span>
                  <span className="ai-family-name">{name}</span>
                </motion.button>
              );
            })}

            {/* Surprise Me */}
            <motion.button
              type="button"
              className="ai-family-card"
              style={{ '--family-bg': 'linear-gradient(135deg, rgba(255, 107, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)', '--family-accent': 'rgba(255, 107, 0, 0.5)' } as React.CSSProperties}
              onClick={handleSurpriseMe}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            >
              <span className="ai-family-emoji">&#127922;</span>
              <span className="ai-family-name">Surprise Me</span>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // --- Sub-step: option ---
  if (promptSubStep === 'option' && selectedFamily) {
    const { emoji, name } = parseFamilyLabel(selectedFamily.label);
    const gradient = getFamilyGradient(selectedFamily.label);
    const accent = getFamilyAccent(selectedFamily.label);
    return (
      <div className="ai-prompt-layout">
        {wojakPreview}
        <div className="ai-prompt-content">
          <div className="ai-option-header" style={{ '--family-bg': gradient } as React.CSSProperties}>
            <span className="ai-option-header-emoji">{emoji}</span>
            <span className="ai-option-header-name">{name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {selectedFamily.options.map((option) => (
              <motion.button
                type="button"
                key={option.label}
                className="ai-preset-btn"
                style={{ '--family-accent': accent } as React.CSSProperties}
                onClick={() => handleOptionSelect(option)}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05, boxShadow: `0 0 12px ${accent}` }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95, boxShadow: '0 0 12px rgba(255, 107, 0, 0.4)' }}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Sub-step: confirm ---
  if (promptSubStep === 'confirm' && selectedOption) {
    const familyParsed = selectedFamily ? parseFamilyLabel(selectedFamily.label) : null;
    const gradient = selectedFamily ? getFamilyGradient(selectedFamily.label) : 'none';
    return (
      <div className="ai-prompt-layout">
        {wojakPreview}
        <div className="ai-prompt-content">
          <div className="ai-confirm-card" style={{ '--family-bg': gradient } as React.CSSProperties}>
            {/* Summary */}
            <div className="ai-confirm-summary">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedMode === 'enhance' ? '\u2728' : '\uD83C\uDD95'}</span>
                <span className="font-semibold">{categoryConfig.label}</span>
              </div>
              {familyParsed && (
                <p className="text-secondary text-sm">{familyParsed.emoji} {familyParsed.name}</p>
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
                type="button"
                className="btn btn-primary w-full"
                onClick={openShop}
                whileHover={!prefersReducedMotion ? { scale: 1.02 } : {}}
                whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}}
              >
                No credits &mdash; Buy more
              </motion.button>
            ) : (
              <motion.button
                type="button"
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
            <p className="ai-confirm-disclaimer">
              Results may vary &mdash; no charge if you discard
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should not reach here normally)
  return null;
}
