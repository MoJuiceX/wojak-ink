// src/components/generator/ai/AIPromptBuilder.tsx

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { AI_PRESETS, getRandomPrompt } from '@/config/aiEnhancePresets';
import { AI_CATEGORIES } from '@/types/aiEnhance';

const MAX_PROMPT_LENGTH = 200;

interface AIPromptBuilderProps {
  currentImage: string | null;
}

export function AIPromptBuilder({ currentImage }: AIPromptBuilderProps) {
  const { selectedCategory, submitEnhance, isEnhancing, enhanceError, clearError, balance } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [promptText, setPromptText] = useState('');

  if (!selectedCategory) return null;

  const presets = AI_PRESETS[selectedCategory] ?? [];
  const categoryConfig = AI_CATEGORIES[selectedCategory];

  const handlePresetClick = (prompt: string) => {
    setPromptText(prompt);
    clearError();
  };

  const handleRandomize = () => {
    const random = getRandomPrompt(selectedCategory);
    setPromptText(random);
    clearError();
  };

  const handleSubmit = () => {
    if (!currentImage || !promptText.trim() || isEnhancing) return;
    submitEnhance(currentImage, selectedCategory, promptText.trim());
  };

  const canSubmit = promptText.trim().length > 0 && !isEnhancing && balance >= 1 && currentImage;

  return (
    <div className="flex flex-col gap-4">
      {/* Category header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{categoryConfig.icon}</span>
        <span className="font-semibold">{categoryConfig.label}</span>
        <span className="text-secondary text-xs">
          {categoryConfig.freedom === 'enhance' ? '(enhance existing)' : '(full freedom)'}
        </span>
      </div>

      {/* Presets */}
      <div>
        <p className="text-secondary text-xs mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <motion.button
              key={preset.prompt}
              className="ai-preset-btn"
              onClick={() => handlePresetClick(preset.prompt)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              {preset.label}
            </motion.button>
          ))}
          <motion.button
            className="ai-preset-btn"
            onClick={handleRandomize}
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            title="Random prompt"
          >
            🎲 Random
          </motion.button>
        </div>
      </div>

      {/* Freeform input */}
      <div>
        <textarea
          className="input w-full"
          rows={3}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder={
            categoryConfig.freedom === 'enhance'
              ? 'Describe how to change the style (e.g. "Add a flame pattern")'
              : 'Describe what you want (e.g. "Cyberpunk city at night")'
          }
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            clearError();
          }}
          disabled={isEnhancing}
        />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-muted">
            {promptText.length}/{MAX_PROMPT_LENGTH}
          </span>
          {enhanceError && (
            <span style={{ color: 'var(--color-error)' }}>{enhanceError}</span>
          )}
        </div>
      </div>

      {/* Submit button */}
      <motion.button
        className="btn btn-primary w-full"
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileHover={canSubmit && !prefersReducedMotion ? { scale: 1.02 } : {}}
        whileTap={canSubmit && !prefersReducedMotion ? { scale: 0.98 } : {}}
      >
        {isEnhancing ? 'Enhancing...' : balance < 1 ? 'No credits — Buy more' : 'Enhance — 1 credit'}
      </motion.button>
    </div>
  );
}
