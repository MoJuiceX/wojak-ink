/**
 * Copy Button Component
 *
 * Button that copies text to clipboard with feedback.
 */

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { buttonVariants } from '@/config/hoverEffects';

interface CopyButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  successMessage?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'button';
  className?: string;
}

const sizeConfig = {
  small: { icon: 14, padding: 'p-1.5', text: 'text-xs' },
  medium: { icon: 16, padding: 'p-2', text: 'text-sm' },
  large: { icon: 18, padding: 'p-2.5', text: 'text-base' },
};

export const CopyButton = memo(function CopyButton({
  text,
  label = 'Copy',
  showLabel = false,
  successMessage = 'Copied!',
  size = 'medium',
  variant = 'icon',
  className = '',
}: CopyButtonProps) {
  const { copy, copied } = useCopyToClipboard();
  const prefersReducedMotion = useReducedMotion();
  const config = sizeConfig[size];

  const handleCopy = () => {
    copy(text, { successMessage });
  };

  const Icon = copied ? Check : Copy;
  const displayLabel = copied ? 'Copied!' : label;

  if (variant === 'button') {
    return (
      <motion.button
        type="button"
        onClick={handleCopy}
        className={`
          flex items-center gap-2 ${config.padding} ${config.text}
          rounded-lg font-medium transition-colors
          ${className}
        `}
        style={{
          background: copied ? '#22c55e' : 'var(--color-surface)',
          color: copied ? 'white' : 'var(--color-text-secondary)',
          border: copied ? 'none' : '1px solid var(--color-border)',
        }}
        variants={prefersReducedMotion ? undefined : buttonVariants}
        whileHover={prefersReducedMotion ? undefined : 'hover'}
        whileTap={prefersReducedMotion ? undefined : 'tap'}
        aria-label={displayLabel}
      >
        <Icon size={config.icon} />
        {showLabel && <span>{displayLabel}</span>}
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      className={`
        ${config.padding} rounded-lg transition-colors
        ${className}
      `}
      style={{
        color: copied ? '#22c55e' : 'var(--color-text-muted)',
      }}
      variants={prefersReducedMotion ? undefined : buttonVariants}
      whileHover={prefersReducedMotion ? undefined : 'hover'}
      whileTap={prefersReducedMotion ? undefined : 'tap'}
      aria-label={displayLabel}
      title={displayLabel}
    >
      <Icon size={config.icon} />
    </motion.button>
  );
});

// Copy with truncated text preview
export function CopyText({
  text,
  truncate = true,
  maxLength = 20,
  className = '',
}: {
  text: string;
  truncate?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const displayText =
    truncate && text.length > maxLength
      ? `${text.slice(0, maxLength / 2)}...${text.slice(-maxLength / 2)}`
      : text;

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '8px 12px',
      }}
    >
      <span
        className="font-mono text-sm flex-1 truncate"
        style={{ color: 'var(--color-text-secondary)' }}
        title={text}
      >
        {displayText}
      </span>
      <CopyButton text={text} size="small" />
    </div>
  );
}

export default CopyButton;
