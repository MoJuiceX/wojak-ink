/**
 * Wojak Generator Page
 *
 * 6-layer avatar composition system with trait selection.
 * Phase 1: Redesigned layout - 45/55 split on desktop, 3-col mobile grid.
 */

import './Generator.css';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { GeneratorProvider } from '@/contexts/GeneratorContext';
import {
  PreviewCanvas,
  LayerTabs,
  TraitSelector,
  ActionBar,
  FavoritesModal,
  ExportPanel,
  StickyMiniPreview,
} from '@/components/generator';
import { PageSEO } from '@/components/seo';
import { InfoButton } from '@/components/common/InfoButton';

function GeneratorContent() {
  const { isDesktop } = useLayout();

  return (
    <PageTransition>
      <PageSEO
        title="Wojak Avatar Generator - Create Custom NFT Characters"
        description="Design your own Wojak avatar with our 6-layer customization system. Choose from hundreds of traits including heads, eyes, mouths, clothing, and backgrounds. Save favorites and export high-quality images."
        path="/generator"
      />
      <div className="generator-page">
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

            {/* Preview Canvas */}
            <div className="generator-preview-canvas">
              <PreviewCanvas className="w-full" />
            </div>

            {/* Desktop: Action Bar on bottom */}
            {isDesktop && (
              <div className="generator-actions">
                <ActionBar />
              </div>
            )}

            {/* Mobile: Category Tabs on bottom */}
            {!isDesktop && (
              <div className="generator-categories">
                <LayerTabs />
              </div>
            )}
          </div>

          {/* Divider (desktop only) */}
          {isDesktop && <div className="generator-divider" />}

          {/* Right: Options Grid Section */}
          <div className="generator-options">
            {/* Options Grid */}
            <div className="generator-options-grid-container">
              <TraitSelector />
            </div>
          </div>
        </div>

        {/* Mobile footer info - only on mobile */}
        {!isDesktop && (
          <div className="text-center py-4 px-4">
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Create your own unique Wojak using layers by{' '}
              <a
                href="https://x.com/MoJuiceX"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                @MoJuiceX
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <FavoritesModal />
      <ExportPanel />

      {/* Mobile sticky preview */}
      {!isDesktop && <StickyMiniPreview />}
      <InfoButton page="generator" />
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
