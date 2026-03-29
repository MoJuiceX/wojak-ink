// src/components/generator/ai/AICategoryPicker.tsx

import { motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { useGenerator } from '@/contexts/GeneratorContext';
import { AI_CATEGORIES, AI_WIZARD_CATEGORIES } from '@/types/aiEnhance';
import type { AICategory } from '@/types/aiEnhance';
import { getAIEnhanceRestriction } from '@/lib/aiEnhanceRules';

interface AICategoryPickerProps {
  currentImage: string | null;
}

export function AICategoryPicker({ currentImage }: AICategoryPickerProps) {
  const { selectCategory, enhancedCategories } = useAIEnhance();
  const { isLayerDisabled, getDisabledReason, g2Selections } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  const isHeadDisabled = isLayerDisabled('Head');
  const aiRestriction = getAIEnhanceRestriction(g2Selections);
  const restrictedCategories = new Set(aiRestriction?.blockedCategories ?? []);

  // Background must be enhanced first — disable if clothing or head was already enhanced
  const hasNonBgEnhancement = enhancedCategories.has('clothes') || enhancedCategories.has('head');
  const hasNoEnhancements = enhancedCategories.size === 0;

  const categories = AI_WIZARD_CATEGORIES.map((key) => [key, AI_CATEGORIES[key]] as [AICategory, typeof AI_CATEGORIES[AICategory]]);

  return (
    <div className="flex flex-col gap-4">
      {/* Info banner — shown before first enhancement */}
      {hasNoEnhancements && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{
            background: 'rgba(255, 107, 0, 0.08)',
            border: '1px solid rgba(255, 107, 0, 0.15)',
          }}
        >
          <Info size={14} className="text-accent shrink-0 mt-0.5" />
          <span className="text-secondary">
            Enhance the <strong className="text-accent">background first</strong> — once you enhance clothing or headwear, background enhancement is no longer available.
          </span>
        </div>
      )}

      {aiRestriction && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{
            background: 'rgba(255, 107, 0, 0.08)',
            border: '1px solid rgba(255, 107, 0, 0.15)',
          }}
        >
          <Info size={14} className="text-accent shrink-0 mt-0.5" />
          <span className="text-secondary">
            {aiRestriction.reason}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Preview */}
        {currentImage && (
          <div className="flex-shrink-0 flex justify-center md:w-1/3">
            <img
              src={currentImage}
              alt="Current Wojak"
              className="w-48 h-48 md:w-full md:h-auto object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>
        )}

        {/* Category grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
        {categories.map(([key, config]) => {
          const isEnhanced = enhancedCategories.has(key);
          const isBgLockedOut = key === 'background' && hasNonBgEnhancement && !enhancedCategories.has('background');
          const isTraitRestricted = restrictedCategories.has(key);
          const isDisabled = (key === 'head' && isHeadDisabled) || isBgLockedOut || isTraitRestricted;
          const disabledReason = isTraitRestricted
            ? aiRestriction?.reason
            : isBgLockedOut
              ? 'Enhance background before clothing or head'
              : isDisabled
                ? (getDisabledReason('Head') || 'Head disabled by suit')
                : undefined;
          return (
            <motion.button
              type="button"
              key={key}
              className={`ai-category-btn ${isEnhanced ? 'ai-category-btn--enhanced' : ''} ${isDisabled ? 'ai-category-btn--disabled' : ''}`}
              onClick={() => !isDisabled && selectCategory(key)}
              whileHover={prefersReducedMotion || isDisabled ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion || isDisabled ? {} : { scale: 0.97 }}
              disabled={isDisabled}
              title={disabledReason}
            >
              {isTraitRestricted && (
                <span className="ai-category-restriction-toggle" aria-hidden="true">
                  <Info size={12} />
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl ai-category-icon">{config.icon}</span>
                <span className="font-semibold ai-category-text">{config.label}</span>
                {isEnhanced && <span className="text-sm text-success">&#10003;</span>}
              </div>
              <p className="text-secondary text-xs">
                {isTraitRestricted
                  ? 'These layers are too special for quality purposes.'
                  : isBgLockedOut
                  ? 'Enhance background first'
                  : isDisabled
                    ? 'Suit includes helmet'
                    : config.freedom === 'enhance'
                      ? 'Enhance existing style'
                      : 'Full creative freedom'}
              </p>
              {isTraitRestricted && (
                <p className="ai-category-restriction-copy">
                  They are disabled for AI enhancement. Come back later.
                </p>
              )}
            </motion.button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
