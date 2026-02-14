/**
 * Slider Component
 *
 * Smooth, accessible range slider with custom styling.
 * Uses local state during dragging for 60fps performance.
 */

import { useState, useRef, useCallback, useEffect, useId } from 'react';

interface SliderProps {
  id?: string;
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function Slider({
  id: propId,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  showValue = true,
  valueFormatter = (v) => `${Math.round(v)}%`,
  className = '',
}: SliderProps) {
  const generatedId = useId();
  const id = propId || generatedId;

  // Local state for smooth dragging
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Sync local value with prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const percentage = ((localValue - min) / (max - min)) * 100;

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return localValue;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const rawValue = min + percent * (max - min);

    // Snap to step
    const snapped = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, snapped));
  }, [min, max, step, localValue]);

  const handleStart = useCallback((clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    const newValue = calculateValue(clientX);
    setLocalValue(newValue);
  }, [disabled, calculateValue]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || disabled) return;
    const newValue = calculateValue(clientX);
    setLocalValue(newValue);
  }, [isDragging, disabled, calculateValue]);

  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onChange(localValue);
    }
  }, [isDragging, localValue, onChange]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  // Global event listeners for dragging outside component
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleEnd();
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX);
    };

    const handleGlobalTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const stepValue = step || (max - min) / 20;
    let newValue = localValue;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(min, localValue - stepValue);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(max, localValue + stepValue);
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      default:
        return;
    }

    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      )}

      {/* Custom slider track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        id={id}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-valuetext={valueFormatter(localValue)}
        aria-disabled={disabled}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onKeyDown={handleKeyDown}
        className={`
          relative flex-1 h-2 rounded-full cursor-pointer select-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-[var(--color-primary)]
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          background: 'var(--color-border)',
          touchAction: 'none',
        }}
      >
        {/* Filled track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${percentage}%`,
            background: 'var(--color-primary)',
            boxShadow: isDragging ? '0 0 12px var(--color-primary)' : 'none',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
          }}
        />

        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{
            left: `${percentage}%`,
            width: isDragging ? '24px' : '20px',
            height: isDragging ? '24px' : '20px',
            borderRadius: '50%',
            background: 'white',
            boxShadow: isDragging
              ? '0 0 0 4px rgba(255, 107, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: isDragging ? 'none' : 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
            willChange: 'left, width, height',
            pointerEvents: 'none',
          }}
        />
      </div>

      {showValue && (
        <span
          className="text-xs font-medium tabular-nums min-w-[40px] text-right"
          style={{ color: isDragging ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
        >
          {valueFormatter(localValue)}
        </span>
      )}
    </div>
  );
}

export default Slider;
