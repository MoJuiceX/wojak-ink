/**
 * Dropdown Component
 *
 * Accessible dropdown select with keyboard navigation.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { dropdownVariants, dropdownItemVariants } from '@/config/settingsAnimations';

interface DropdownOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface DropdownProps<T extends string> {
  id: string;
  label?: string;
  description?: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function Dropdown<T extends string>({
  id,
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}: DropdownProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const descriptionId = description ? `${id}-description` : undefined;
  const listboxId = `${id}-listbox`;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(!isOpen);
          setFocusedIndex(options.findIndex((opt) => opt.value === value));
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.findIndex((opt) => opt.value === value));
        } else {
          setFocusedIndex((prev) => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.findIndex((opt) => opt.value === value));
        } else {
          setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  };

  const handleOptionClick = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="block text-sm font-medium mb-1 text-primary"
        >
          {label}
        </label>
      )}
      {description && (
        <p
          id={descriptionId}
          className="text-xs mb-2 text-muted"
        >
          {description}
        </p>
      )}

      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-describedby={descriptionId}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
          text-sm text-left transition-colors text-primary
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-[var(--color-primary)]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span className="truncate">{selectedOption?.label || 'Select...'}</span>
        <ChevronDown
          size={16}
          className={`transition-transform text-muted ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-activedescendant={
              focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined
            }
            variants={prefersReducedMotion ? undefined : dropdownVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="absolute z-50 w-full mt-1 py-1 rounded-lg overflow-hidden shadow-lg"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {options.map((option, index) => (
              <motion.li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                variants={prefersReducedMotion ? undefined : dropdownItemVariants}
                onClick={() => handleOptionClick(option.value)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`
                  px-3 py-2 cursor-pointer transition-colors
                  ${focusedIndex === index ? 'bg-[var(--color-surface-hover)]' : ''}
                `}
                style={{
                  background:
                    option.value === value
                      ? 'var(--color-surface)'
                      : focusedIndex === index
                        ? 'var(--color-surface-hover)'
                        : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate text-primary"
                    >
                      {option.label}
                    </p>
                    {option.description && (
                      <p
                        className="text-xs truncate mt-0.5 text-muted"
                      >
                        {option.description}
                      </p>
                    )}
                  </div>
                  {option.value === value && (
                    <Check
                      size={16}
                      className="text-accent"
                    />
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dropdown;
