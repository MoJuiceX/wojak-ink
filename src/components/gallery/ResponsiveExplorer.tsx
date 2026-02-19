/**
 * ResponsiveExplorer Component
 *
 * Wrapper that switches between mobile modal and desktop panel:
 * - < 1024px: NFTExplorerModal (full-screen, swipe)
 * - >= 1024px: DesktopExplorerPanel (slide-in, thumbnails)
 */

import { lazy, Suspense } from 'react';
import { useIsDesktop } from '@/hooks/useDesktopBreakpoint';
import { NFTExplorerModal } from './NFTExplorerModal';

// Lazy load desktop panel for code splitting
const DesktopExplorerPanel = lazy(() =>
  import('./desktop/DesktopExplorerPanel').then((mod) => ({
    default: mod.DesktopExplorerPanel,
  }))
);

// Loading fallback for desktop panel - centered lightbox style
function DesktopPanelFallback() {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 60,
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />
      {/* Centered lightbox loading state */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 70, padding: '32px' }}
      >
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: '1000px',
            maxWidth: 'calc(100vw - 200px)',
            height: '600px',
            maxHeight: '90vh',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 25px 50px -12px var(--color-black-50)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--color-primary)' }}
          />
        </div>
      </div>
    </>
  );
}

interface ResponsiveExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResponsiveExplorer({ isOpen, onClose }: ResponsiveExplorerProps) {
  const isDesktop = useIsDesktop();

  // Don't render anything if not open
  if (!isOpen) return null;

  if (isDesktop) {
    return (
      <Suspense fallback={<DesktopPanelFallback />}>
        <DesktopExplorerPanel isOpen={isOpen} onClose={onClose} />
      </Suspense>
    );
  }

  return <NFTExplorerModal isOpen={isOpen} onClose={onClose} />;
}

export default ResponsiveExplorer;
