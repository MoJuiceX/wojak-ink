// src/components/generator/ai/AICategoryPicker.tsx

import { motion, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AI_CATEGORIES } from '@/types/aiEnhance';
import type { AICategory } from '@/types/aiEnhance';

interface AICategoryPickerProps {
  currentImage: string | null;
}

export function AICategoryPicker({ currentImage }: AICategoryPickerProps) {
  const { selectCategory, enhancedCategories } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();

  const categories = Object.entries(AI_CATEGORIES) as [AICategory, typeof AI_CATEGORIES[AICategory]][];

  return (
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
          return (
            <motion.button
              key={key}
              className={`ai-category-btn ${isEnhanced ? 'ai-category-btn--enhanced' : ''}`}
              onClick={() => selectCategory(key)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl ai-category-icon">{config.icon}</span>
                <span className="font-semibold ai-category-text">{config.label}</span>
                {isEnhanced && <span className="text-sm" style={{ color: 'var(--color-success)' }}>&#10003;</span>}
              </div>
              <p className="text-secondary text-xs">
                {config.freedom === 'enhance'
                  ? 'Enhance existing style'
                  : 'Full creative freedom'}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
