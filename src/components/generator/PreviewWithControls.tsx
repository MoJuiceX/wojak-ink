/**
 * Preview with Controls
 *
 * Wraps PreviewCanvas with a solid background.
 * When AI Enhanced Mode is active, displays the enhanced image instead of the canvas.
 * Action bar (Random, Undo, Redo, Save, Export, Copy) is rendered by ActionBar below.
 */

import { PreviewCanvas } from './PreviewCanvas';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';

export function PreviewWithControls({ className = '' }: { className?: string }) {
  const { isAIEnhancedMode, enhancedImage } = useAIEnhance();

  return (
    <div className={className}>
      <div
        className="generator-preview-canvas relative overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: '1 / 1',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        {isAIEnhancedMode && enhancedImage ? (
          <img
            src={enhancedImage}
            alt="AI Enhanced Wojak"
            className="w-full h-full object-contain"
          />
        ) : (
          <PreviewCanvas className="w-full h-full" showPlaceholder embedded />
        )}
      </div>
    </div>
  );
}

export default PreviewWithControls;
