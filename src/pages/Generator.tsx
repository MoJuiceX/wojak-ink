/**
 * Wojak Generator Page
 *
 * Layer-based avatar composition (Base, Clothes, Mouth, Mask, Eyes, Head, Background, etc.).
 * Phase 1: Redesigned layout - 45/55 split on desktop, 3-col mobile grid.
 */

import { useState, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Images, Wand2, X, Zap } from 'lucide-react';
import { safeStorage } from '@/utils/safeStorage';
import './Generator.css';
import { PageTransition } from '@/components/layout/PageTransition';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GeneratorProvider, useGenerator } from '@/contexts/GeneratorContext';
import { AIEnhanceProvider, useAIEnhance } from '@/contexts/AIEnhanceContext';
import {
  PreviewWithControls,
  LayerTabs,
  TraitSelector,
  ActionBar,
  FavoritesModal,
  ExportPanel,
  StickyMiniPreview,
  GeneratorRightPanel,
  GeneratorMobileColorPanel,
} from '@/components/generator';
import { MetadataPreview } from '@/components/generator/MetadataPreview';
import { PageSEO } from '@/components/seo';

// Lazy-load AI gallery — only shown when user opens it
const AICreationsGallery = lazy(() => import('@/components/generator/ai/AICreationsGallery').then(m => ({ default: m.AICreationsGallery })));

type RightPanelMode = 'colors' | 'metadata';

function GeneratorErrorBanner() {
  const { generatorError, clearGeneratorError } = useGenerator();
  if (!generatorError) return null;
  return (
    <div
      className="card-static card-error flex items-center justify-between gap-3 p-3 mb-4"
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

/** Promo banner — 50% off AI credits (2x credits for same price). Ends April 1, 2026. */
const PROMO_END = new Date('2026-04-01T00:00:00Z');

function AIPromoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    const stored = safeStorage.getItem('ai_promo_dismissed');
    return stored === 'true';
  });

  if (dismissed || Date.now() > PROMO_END.getTime()) return null;

  const daysLeft = Math.max(0, Math.ceil((PROMO_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleDismiss = () => {
    setDismissed(true);
    safeStorage.setItem('ai_promo_dismissed', 'true');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden mb-3"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)',
        border: '1px solid rgba(255, 107, 0, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 1rem',
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(255, 255, 255, 0.08)' }}
        aria-label="Dismiss"
      >
        <X size={12} style={{ color: 'var(--color-white-60)' }} />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: 'rgba(255, 107, 0, 0.2)' }}>
          <Zap size={16} className="text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            AI Enhancement — 50% Off
          </p>
          <p className="text-xs text-secondary">
            Get <strong>2x credits</strong> for the same price. {daysLeft} day{daysLeft !== 1 ? 's' : ''} left.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function GeneratorContent() {
  // Use 1024px breakpoint to match Generator.css media queries
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { isInitialized, generatorError } = useGenerator();
  const { isAIEnhancedMode, enhancedCategories, resetToLayers, openLightbox } = useAIEnhance();
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('colors');
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [showCreationsGallery, setShowCreationsGallery] = useState(false);

  // Bottom nav now visible on generator — height calc in Generator.css accounts for it

  const hasError = !isInitialized && generatorError;

  const mainContent = hasError ? (
    <div
      className="card-static card-error p-6 text-center mb-4"
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
      <AIPromoBanner />
      <div className="generator-content">
        {/* Left: Preview Section */}
        <div className="generator-preview">
          {/* Category Tabs on top — locked in AI Enhanced mode */}
          <div className={`generator-categories${isAIEnhancedMode ? ' generator-ai-locked' : ''}`}>
            <LayerTabs />
          </div>

          {/* Preview Canvas with zoom and background controls */}
          <div className="generator-preview-canvas-wrapper">
            <PreviewWithControls className="w-full" />
          </div>

          {/* Action Bar on bottom (both desktop and mobile) */}
          <div className="generator-actions">
            <ActionBar
              {...(isDesktop ? {
                rightPanelMode,
                onToggleRightPanel: () => setRightPanelMode((m) => m === 'colors' ? 'metadata' : 'colors'),
              } : {})}
            />
          </div>

        </div>

        {/* Right: Grid (3 cols) + Details/Colors panel — with AI overlay when enhanced */}
        <div className={`generator-options${isAIEnhancedMode ? ' generator-options--ai-mode' : ''}`}>
          {/* Grid wrapper — gives overlay a reference frame centered on the grid only */}
          <div className="generator-options-grid-wrapper">
            <div className="generator-options-grid-container">
              <TraitSelector />
            </div>

            {/* AI Enhanced Mode overlay — centered on trait grid */}
            {isAIEnhancedMode && (
              <div className="generator-ai-overlay">
                <div className="generator-ai-overlay-content">
                  <Sparkles size={28} className="text-accent" />
                  <h3 className="generator-ai-overlay-title">AI Enhanced</h3>
                  <p className="text-secondary text-sm">
                    {[...enhancedCategories].join(' \u00B7 ')}
                  </p>
                  <div className="flex flex-col gap-2 mt-3 w-full" style={{ maxWidth: 220 }}>
                    <button
                      className="btn btn-primary text-sm"
                      onClick={openLightbox}
                    >
                      <Wand2 size={14} />
                      <span>Continue Enhancing</span>
                    </button>
                    <button
                      className="btn btn-secondary text-sm"
                      onClick={() => setShowCreationsGallery(true)}
                    >
                      <Images size={14} />
                      <span>AI Creations</span>
                    </button>
                    <button
                      className="btn btn-ghost text-sm"
                      onClick={resetToLayers}
                    >
                      <RotateCcw size={14} />
                      <span>Reset to Layers</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile only: color picker and G2 panel in their own visible box below the grid */}
          {!isDesktop && <GeneratorMobileColorPanel />}
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

      {/* AI Creations Gallery — lazy-loaded, mounted only when open */}
      {showCreationsGallery && (
        <Suspense fallback={null}>
          <AICreationsGallery
            isOpen={showCreationsGallery}
            onClose={() => setShowCreationsGallery(false)}
          />
        </Suspense>
      )}
    </>
  );

  return (
    <PageTransition>
      <PageSEO
        title="Wojak Avatar Generator - Create Custom NFT Characters"
        description="Design your own Wojak avatar with our layer-based customization system. Choose from hundreds of traits including heads, eyes, mouths, clothing, and backgrounds. Save favorites and export high-quality images."
        path="/generator"
      />
      <div className="generator-page brand-premium-shell brand-premium-generator">
        <GeneratorErrorBanner />

        {/* Mobile: single scroll container so preview can scroll away and mini preview can show */}
        {!isDesktop ? (
          <div
            ref={mobileScrollRef}
            className="generator-scroll-view"
            role="region"
            aria-label="Generator content"
          >
            {mainContent}
          </div>
        ) : (
          mainContent
        )}
      </div>

      <FavoritesModal />
      <ExportPanel />

      {!isDesktop && (
        <StickyMiniPreview scrollContainerRef={mobileScrollRef} />
      )}
    </PageTransition>
  );
}

export default function Generator() {
  return (
    <GeneratorProvider>
      <AIEnhanceProvider>
        <GeneratorContent />
      </AIEnhanceProvider>
    </GeneratorProvider>
  );
}
