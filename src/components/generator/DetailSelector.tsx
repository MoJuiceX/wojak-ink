/**
 * Detail Selector Component
 *
 * Grid of detail/variant options for G2 traits.
 * Shows thumbnails of available detail and variant PNGs.
 */

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ban } from 'lucide-react';
import { resolveGeneratorAssetUrl } from '@/utils/generatorAssetUrl';
import { handleTraitImgError } from '@/utils/traitImgError';

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
  /** Map detail filenames to custom preview image URLs for the picker thumbnails */
  previewOverrides?: Record<string, string>;
  /** Image URLs to render behind each detail option (e.g. base face + topless body + mouth for tattoo composites) */
  underlayImages?: string[];
  /** Zoom level for composite preview (applied to all layers together) */
  compositeZoom?: number;
  /** CSS transform-origin for composite zoom (e.g. 'bottom left' for third quadrant) */
  compositeZoomOrigin?: string;
  /** Per-option transform-origin overrides (keyed by filename) */
  compositeZoomOriginOverrides?: Record<string, string>;
}

export const DetailSelector = memo(function DetailSelector({
  options,
  basePath,
  selectedOption,
  onSelect,
  label = 'Detail',
  allowNone = true,
  zoom,
  previewOverrides,
  underlayImages,
  compositeZoom,
  compositeZoomOrigin,
  compositeZoomOriginOverrides,
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
      <div className="detail-selector-grid">
        {/* None option */}
        {allowNone && (
        <motion.button
          type="button"
          className={`detail-option${!selectedOption ? ' detail-option--selected' : ''} w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center`}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          onClick={() => onSelect(undefined)}
          title="None"
        >
          <Ban
            size={20}
            className={!selectedOption ? '' : 'text-muted'}
          />
        </motion.button>
        )}

        {/* Detail options */}
        {options.map((opt) => {
          const isSelected = selectedOption === opt.file;
          return (
            <motion.button
              type="button"
              key={opt.file}
              className={`detail-option${isSelected ? ' detail-option--selected' : ''} w-14 h-14 rounded-lg overflow-hidden relative`}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
              onClick={() => onSelect(isSelected ? undefined : opt.file)}
              title={opt.name}
            >
              {underlayImages ? (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={compositeZoom ? { transform: `scale(${compositeZoom})`, transformOrigin: compositeZoomOriginOverrides?.[opt.file] ?? compositeZoomOrigin ?? 'center' } : undefined}
                >
                  {underlayImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      crossOrigin="anonymous"
                      loading="lazy"
                      onError={handleTraitImgError}
                    />
                  ))}
                  <img
                    src={previewOverrides?.[opt.file] ?? resolveGeneratorAssetUrl(opt.file, basePath)}
                    alt={opt.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    crossOrigin="anonymous"
                    loading="lazy"
                    onError={handleTraitImgError}
                  />
                </div>
              ) : (
                <img
                  src={previewOverrides?.[opt.file] ?? resolveGeneratorAssetUrl(opt.file, basePath)}
                  alt={opt.name}
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                  style={zoom ? { transform: `scale(${zoom}) translate(-16%, -14%)`, transformOrigin: 'top left' } : undefined}
                  loading="lazy"
                  onError={handleTraitImgError}
                />
              )}
              {isSelected && (
                <motion.div
                  className="detail-option-checkmark absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
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
