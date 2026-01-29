/**
 * Theme Card Component
 *
 * Individual theme selection card with preview swatch.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import type { SettingsThemeConfig } from '@/types/settings';
import {
  themeCardVariants,
  themePreviewGlowVariants,
  checkmarkVariants,
} from '@/config/settingsAnimations';

interface ThemeCardProps {
  theme: SettingsThemeConfig;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${theme.name} theme`}
      onClick={onSelect}
      variants={prefersReducedMotion ? undefined : themeCardVariants}
      initial="initial"
      animate="animate"
      whileHover={prefersReducedMotion ? undefined : 'hover'}
      whileTap={prefersReducedMotion ? undefined : 'tap'}
      className={`
        relative p-4 rounded-xl text-left transition-all glass hover-lift glow-section
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-[var(--color-brand-primary)]
        ${isSelected ? 'ring-2 ring-[var(--color-brand-primary)]' : ''}
      `}
      style={{
        background: 'var(--color-glass-bg)',
        border: isSelected
          ? '2px solid var(--color-brand-primary)'
          : '1px solid var(--color-border)',
        boxShadow: isSelected
          ? '0 0 20px rgba(var(--color-brand-primary-rgb, 255, 107, 0), 0.2)'
          : 'none',
      }}
    >
      {/* Preview swatch with centered emoji */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              background: theme.preview.gradient || theme.preview.background,
              border: `2px solid ${theme.preview.accent}`,
            }}
          >
            {/* Centered emoji */}
            <span className="text-2xl" role="img" aria-hidden="true">
              {theme.icon}
            </span>
          </div>

          {/* Glow effect for special themes */}
          {theme.hasGlow && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              variants={themePreviewGlowVariants}
              initial="initial"
              animate="animate"
              style={{
                background: `radial-gradient(circle, ${theme.preview.accent}40 0%, transparent 70%)`,
                filter: 'blur(4px)',
              }}
            />
          )}

          {/* Special sparkle indicator */}
          {theme.isSpecial && (
            <div className="absolute -top-1 -right-1">
              <Sparkles
                size={14}
                style={{ color: theme.preview.accent }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Theme info */}
      <div className="mt-3 text-center">
        <h3
          className="text-sm font-semibold whitespace-nowrap"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {theme.name}
        </h3>
        <p
          className="text-xs mt-0.5 whitespace-nowrap"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {theme.description}
        </p>
      </div>

      {/* Selected checkmark */}
      <motion.div
        className="absolute bottom-3 right-3"
        variants={checkmarkVariants}
        initial="hidden"
        animate={isSelected ? 'visible' : 'hidden'}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-brand-primary)' }}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </div>
      </motion.div>
    </motion.button>
  );
}

export default ThemeCard;
