/**
 * Preview with Controls
 *
 * Wraps PreviewCanvas with a solid background.
 * Action bar (Random, Undo, Redo, Save, Export, Copy) is rendered by ActionBar below.
 */

import { PreviewCanvas } from './PreviewCanvas';

export function PreviewWithControls({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-2xl flex items-center justify-center"
        style={{
          aspectRatio: '1 / 1',
          backgroundColor: 'var(--color-bg)',
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
