/**
 * Toggle Component
 *
 * Accessible pill-shaped toggle switch.
 */

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ToggleProps {
  id: string;
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeConfig = {
  small: {
    trackWidth: 48,
    trackHeight: 22,
    thumbSize: 16,
    thumbOffset: 3,
    fontSize: '8px',
    labelPadding: '5px',
  },
  medium: {
    trackWidth: 52,
    trackHeight: 24,
    thumbSize: 18,
    thumbOffset: 3,
    fontSize: '9px',
    labelPadding: '6px',
  },
  large: {
    trackWidth: 56,
    trackHeight: 26,
    thumbSize: 20,
    thumbOffset: 3,
    fontSize: '9px',
    labelPadding: '6px',
  },
};

export const Toggle = memo(function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'medium',
  className = '',
}: ToggleProps) {
  const prefersReducedMotion = useReducedMotion();
  const descriptionId = description ? `${id}-description` : undefined;

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium cursor-pointer text-primary"
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={descriptionId}
              className="text-xs mt-0.5 text-muted"
            >
              {description}
            </p>
          )}
        </div>
      )}

      <div
        id={id}
        role="switch"
        tabIndex={disabled ? -1 : 0}
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descriptionId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: `${config.trackWidth}px`,
          height: `${config.trackHeight}px`,
          borderRadius: '9999px',
          background: checked
            ? 'var(--color-primary)'
            : 'var(--color-white-10)',
          flexShrink: 0,
          outline: 'none',
          transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            fontSize: config.fontSize,
            fontWeight: 600,
            lineHeight: 1,
            color: checked ? 'var(--color-text)' : 'var(--color-white-40)',
            left: checked ? config.labelPadding : undefined,
            right: checked ? undefined : config.labelPadding,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {checked ? 'ON' : 'OFF'}
        </span>
        <motion.div
          style={{
            position: 'absolute',
            width: `${config.thumbSize}px`,
            height: `${config.thumbSize}px`,
            top: `${config.thumbOffset}px`,
            borderRadius: '9999px',
            background: 'white',
          }}
          animate={{
            left: checked
              ? `${config.trackWidth - config.thumbSize - config.thumbOffset}px`
              : `${config.thumbOffset}px`,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0.05 }
              : { type: 'spring', stiffness: 500, damping: 30 }
          }
          aria-hidden="true"
        />
      </div>
    </div>
  );
});

export default Toggle;
