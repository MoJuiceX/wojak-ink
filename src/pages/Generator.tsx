/**
 * Wojak Generator Page
 *
 * Layer-based avatar composition (Base, Clothes, Mouth, Mask, Eyes, Head, Background, etc.).
 * Phase 1: Redesigned layout - 45/55 split on desktop, 3-col mobile grid.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Generator.css';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { GeneratorProvider, useGenerator } from '@/contexts/GeneratorContext';
import {
  PreviewWithControls,
  LayerTabs,
  TraitSelector,
  ActionBar,
  FavoritesModal,
  ExportPanel,
  StickyMiniPreview,
  GeneratorRightPanel,
} from '@/components/generator';
import { MetadataPreview } from '@/components/generator/MetadataPreview';
import { PageSEO } from '@/components/seo';

type RightPanelMode = 'colors' | 'metadata';

function GeneratorErrorBanner() {
  const { generatorError, clearGeneratorError } = useGenerator();
  if (!generatorError) return null;
  return (
    <div
      className="card-static flex items-center justify-between gap-3 p-3 mb-4"
      style={{
        borderLeft: '4px solid var(--color-error)',
        background: 'var(--color-error-10)',
      }}
      role="alert"
    >
      <span className="text-secondary flex-1 text-sm">{generatorError}</span>
      <button
        type="button"
        onClick={clearGeneratorError}
        className="btn btn-ghost text-sm shrink-0"
        aria-label="Dismiss error"
      >
        Dismiss
      </button>
    </div>
  );
}

function GeneratorContent() {
  const { isDesktop } = useLayout();
  const { isInitialized, generatorError } = useGenerator();
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('colors');

  return (
    <PageTransition>
      <PageSEO
        title="Wojak Avatar Generator - Create Custom NFT Characters"
        description="Design your own Wojak avatar with our layer-based customization system. Choose from hundreds of traits including heads, eyes, mouths, clothing, and backgrounds. Save favorites and export high-quality images."
        path="/generator"
      />
      <div className="generator-page">
        {/* Error banner: init failure, export/save errors */}
        <GeneratorErrorBanner />

        {/* When init failed, show refresh prompt and hide main UI */}
        {!isInitialized && generatorError ? (
          <div
            className="card-static p-6 text-center mb-4"
            style={{ borderLeft: '4px solid var(--color-error)' }}
          >
            <p className="text-secondary mb-2">The generator could not load. You can try refreshing the page.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Refresh page
            </button>
          </div>
        ) : (
        <>
        <div className="generator-content">
          {/* Left: Preview Section with Category Tabs */}
          <div className="generator-preview">
            {/* Mobile: Action Bar on top */}
            {!isDesktop && (
              <div className="generator-actions">
                <ActionBar />
              </div>
            )}

            {/* Desktop: Category Tabs on top */}
            {isDesktop && (
              <div className="generator-categories">
                <LayerTabs />
              </div>
            )}

            {/* Preview Canvas with zoom and background controls */}
            <div className="generator-preview-canvas-wrapper">
              <PreviewWithControls className="w-full" />
            </div>

            {/* Desktop: Action Bar on bottom */}
            {isDesktop && (
              <div className="generator-actions">
                <ActionBar
                  rightPanelMode={rightPanelMode}
                  onToggleRightPanel={() => setRightPanelMode((m) => m === 'colors' ? 'metadata' : 'colors')}
                  />
              </div>
            )}

            {/* Mobile: Category Tabs on bottom */}
            {!isDesktop && (
              <div className="generator-categories">
                <LayerTabs />
              </div>
            )}

          </div>

          {/* Right: Grid (3 cols) + Details/Colors panel (desktop) or just options (mobile) */}
          <div className="generator-options">
            {/* Options Grid — 3 columns on desktop */}
            <div className="generator-options-grid-container">
              <TraitSelector />
            </div>
            {/* Desktop: 4th column = colors/details or metadata preview */}
            {isDesktop && (
              <div className="generator-details-panel">
                <AnimatePresence mode="wait" initial={false}>
                  {rightPanelMode === 'metadata' ? (
                    <motion.div
                      key="metadata"
                      initial={{ x: 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 40, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-3 h-full"
                    >
                      <MetadataPreview
                        onSwitchToColors={() => setRightPanelMode('colors')}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="colors"
                      initial={{ x: -40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -40, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-3 h-full"
                    >
                      <GeneratorRightPanel />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile footer info - only on mobile */}
        {!isDesktop && (
          <div className="text-center py-4 px-4">
            <p
              className="text-sm text-secondary"
            >
              Create your own unique Wojak using layers by{' '}
              <a
                href="https://x.com/MoJuiceX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent"
              >
                @MoJuiceX
              </a>
            </p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Modals */}
      <FavoritesModal />
      <ExportPanel />

      {/* Mobile sticky preview */}
      {!isDesktop && <StickyMiniPreview />}
    </PageTransition>
  );
}

export default function Generator() {
  return (
    <GeneratorProvider>
      <GeneratorContent />
    </GeneratorProvider>
  );
}
