/**
 * Detail Selector Component
 *
 * Grid of detail/variant options for G2 traits.
 * Shows thumbnails of available detail and variant PNGs.
 */

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ban } from 'lucide-react';

interface DetailOption {
  file: string;
  name: string;
}

interface DetailSelectorProps {
  /** Available detail options from the trait manifest */
  options: DetailOption[];
  /** Base path for resolving image URLs */
  basePath: string;
  /** Currently selected option filename */
  selectedOption?: string;
  /** Callback when an option is selected */
  onSelect: (file: string | undefined) => void;
  /** Label */
  label?: string;
  /** If false, hide the "None" option (e.g. SWAT always has a detail) */
  allowNone?: boolean;
  /** Zoom factor for preview images (e.g. 6 = 6x zoom centered on image) */
  zoom?: number;
}

export const DetailSelector = memo(function DetailSelector({
  options,
  basePath,
  selectedOption,
  onSelect,
  label = 'Detail',
  allowNone = true,
  zoom,
}: DetailSelectorProps) {
  const prefersReducedMotion = useReducedMotion();

  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-medium text-secondary">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        {/* None option */}
        {allowNone && (
        <motion.button
          className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: 'var(--color-surface)',
            border: !selectedOption
              ? '2px solid var(--color-primary, #ff6b00)'
              : '1px solid var(--color-border)',
            boxShadow: !selectedOption
              ? '0 0 12px var(--glow-primary, rgba(255,107,0,0.4))'
              : 'none',
          }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          onClick={() => onSelect(undefined)}
          title="None"
          type="button"
        >
          <Ban
            size={20}
            style={{ color: !selectedOption ? 'var(--color-primary, #ff6b00)' : 'var(--color-text-muted)' }}
          />
        </motion.button>
        )}

        {/* Detail options */}
        {options.map((opt) => {
          const isSelected = selectedOption === opt.file;
          return (
            <motion.button
              key={opt.file}
              className="w-14 h-14 rounded-lg overflow-hidden relative"
              style={{
                background: 'var(--color-surface)',
                border: isSelected
                  ? '2px solid var(--color-primary, #ff6b00)'
                  : '1px solid var(--color-border)',
                boxShadow: isSelected
                  ? '0 0 12px var(--glow-primary, rgba(255,107,0,0.4))'
                  : 'none',
              }}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
              onClick={() => onSelect(opt.file)}
              title={opt.name}
              type="button"
            >
              <img
                src={`${basePath}/${opt.file}`}
                alt={opt.name}
                className="w-full h-full object-contain"
                style={zoom ? { transform: `scale(${zoom}) translate(-16%, -14%)`, transformOrigin: 'top left' } : undefined}
                loading="lazy"
              />
              {isSelected && (
                <motion.div
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-primary, #ff6b00)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

export default DetailSelector;
