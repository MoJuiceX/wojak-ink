/**
 * Preview with Controls
 *
 * Wraps PreviewCanvas with a fixed checkerboard background.
 * Action bar (Random, Undo, Redo, Save, Export, Copy) is rendered by ActionBar below.
 */

import { PreviewCanvas } from './PreviewCanvas';

const BG_STYLE: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, var(--color-border) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-border) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-border) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-border) 75%)
  `,
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  backgroundColor: 'var(--color-bg)',
};

export function PreviewWithControls({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-2xl flex items-center justify-center"
        style={{
          aspectRatio: '1 / 1',
          ...BG_STYLE,
          border: '2px solid var(--color-border)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.25)',
        }}
      >
        <PreviewCanvas className="w-full h-full" showPlaceholder embedded />
      </div>
    </div>
  );
}

export default PreviewWithControls;
