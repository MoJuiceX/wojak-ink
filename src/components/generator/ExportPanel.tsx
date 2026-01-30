/**
 * Export Panel Component
 *
 * Premium export modal — clean, minimal, focused.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { renderToCanvas } from '@/services/canvasRenderer';
import type { ExportOptions } from '@/types/generator';
import {
  modalBackdropVariants,
  modalContentVariants,
} from '@/config/generatorAnimations';

interface ExportPanelProps {
  className?: string;
}

export function ExportPanel({ className = '' }: ExportPanelProps) {
  const { isExportOpen, toggleExport, exportWojak, previewImage, favorites, selectedLayers } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  const getNextProjectName = () => {
    const projectNumbers = favorites
      .map((f) => {
        const match = f.name.match(/^Wojak\s*(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const nextNumber = projectNumbers.length > 0 ? Math.max(...projectNumbers) + 1 : 1;
    return `Wojak ${nextNumber}`;
  };

  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filename, setFilename] = useState(getNextProjectName);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isExportOpen) {
      setFilename(getNextProjectName());
      setIncludeBackground(true);
      setLocalPreview(null);
    }
  }, [isExportOpen, favorites.length]);

  // Re-render preview when background toggle changes
  useEffect(() => {
    if (!isExportOpen) return;

    if (includeBackground) {
      // Background on: use the default preview from context
      setLocalPreview(null);
      return;
    }

    // Background off: re-render without background
    let cancelled = false;
    renderToCanvas(selectedLayers, {
      size: 512,
      includeBackground: false,
    })
      .then((result) => {
        if (!cancelled) {
          setLocalPreview(result.dataUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to render no-bg preview:', err);
      });

    return () => { cancelled = true; };
  }, [includeBackground, isExportOpen, selectedLayers]);

  const displayPreview = localPreview || previewImage;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format: 'png',
        size: { preset: '1024' },
        includeBackground,
      };
      await exportWojak(options, filename);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    toggleExport(false);
  };

  return (
    <AnimatePresence>
      {isExportOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 z-50 ${className}`}
            style={{ background: 'rgba(0, 0, 0, 0.75)' }}
            variants={prefersReducedMotion ? undefined : modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 bottom-24 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-md rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            variants={prefersReducedMotion ? undefined : modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Preview - edge-to-edge top with overlaid close button */}
            <div
              className="relative w-full"
              style={{
                aspectRatio: '1 / 1',
                background: !includeBackground
                  ? 'repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, rgba(255,255,255,0.02) 0% 50%) 50% / 16px 16px'
                  : 'transparent',
              }}
            >
              {displayPreview && (
                <img
                  src={displayPreview}
                  alt="Export preview"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Close button - overlaid on image */}
              <button
                className="absolute top-3 right-3 flex items-center justify-center rounded-full transition-colors"
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: 'rgba(255,255,255,0.8)',
                }}
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-4 space-y-3">
              {/* Filename input */}
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Filename"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.select()}
              />

              {/* Background toggle - aligned with input edges */}
              <div className="flex items-center justify-between px-4">
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Background
                </span>
                <div
                  className="relative cursor-pointer"
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '9999px',
                    background: includeBackground
                      ? 'var(--color-brand-primary)'
                      : 'rgba(255,255,255,0.1)',
                    flexShrink: 0,
                  }}
                  onClick={() => setIncludeBackground(!includeBackground)}
                  role="switch"
                  aria-checked={includeBackground}
                  aria-label="Include background"
                >
                  <motion.div
                    style={{
                      position: 'absolute',
                      width: '16px',
                      height: '16px',
                      top: '2px',
                      borderRadius: '9999px',
                      background: 'white',
                    }}
                    animate={{
                      left: includeBackground ? '18px' : '2px',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>

              {/* Download button */}
              <motion.button
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: isExporting
                    ? 'rgba(255,149,0,0.7)'
                    : 'var(--color-brand-primary)',
                  color: 'white',
                  border: 'none',
                  cursor: isExporting ? 'wait' : 'pointer',
                }}
                onClick={handleExport}
                disabled={isExporting}
                whileHover={isExporting ? undefined : { scale: 1.02 }}
                whileTap={isExporting ? undefined : { scale: 0.98 }}
              >
                <Download size={16} />
                {isExporting ? 'Exporting...' : 'Download'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ExportPanel;
