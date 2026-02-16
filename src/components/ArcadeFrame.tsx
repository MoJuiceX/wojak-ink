/**
 * Arcade Frame Component
 *
 * Wraps game content in an arcade cabinet frame overlay.
 * The frame PNG has a transparent screen area where the game shows through.
 *
 * @see claude-specs/28-ARCADE-FRAME-OVERLAY.md
 */

import { HelpCircle, X, Volume2, VolumeX } from 'lucide-react';
import './ArcadeFrame.css';
import { ArcadeButtonLights, type LightSequence, type LightOptions, type PatternName } from './ArcadeButtonLights';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { CRTOverlay } from './arcade/CRTOverlay';

interface ArcadeFrameProps {
  children: React.ReactNode;
  variant?: 'standard' | 'wide';
  /** NEW: Pattern name from pattern library (preferred) */
  lightPattern?: PatternName | null;
  /** LEGACY: Sequence name */
  lightSequence?: LightSequence;
  lightOptions?: LightOptions;
  onLightSequenceComplete?: () => void;
  showIntroButtons?: boolean;
  onHelpClick?: () => void;
  onCloseClick?: () => void;
  isMuted?: boolean;
  onMuteClick?: () => void;
}

/**
 * Standard arcade frame for most games (14 of 15).
 * Uses the full arcade-frame.png with precise screen positioning.
 */
export function ArcadeFrame({
  children,
  variant = 'standard',
  lightPattern,
  lightSequence = 'off',
  lightOptions,
  onLightSequenceComplete,
  showIntroButtons = false,
  onHelpClick,
  onCloseClick,
  isMuted = false,
  onMuteClick,
}: ArcadeFrameProps) {
  // Hide arcade frame buttons on mobile - games provide their own UI
  // Use both hook and direct check for reliability
  const isMobileHook = useIsMobile();
  const isMobileWindow = typeof window !== 'undefined' && window.innerWidth < 768;
  const isMobile = isMobileHook || isMobileWindow;

  // Wide variant for Memory Match (Phase 2 - requires additional assets)
  if (variant === 'wide') {
    return <ArcadeFrameWide>{children}</ArcadeFrameWide>;
  }

  return (
    <div className="arcade-frame-container">
      {/* Game renders in the screen area - positioned to match PNG transparency */}
      <div className="arcade-screen">
        {children}
        {/* CRT overlay is experimental; remove if disliked. Enabled via ?crt=1, localStorage, or env var */}
        <CRTOverlay />
      </div>

      {/* Frame PNG overlays on top - clicks pass through to game */}
      <img
        src="/img/arcade-frame_fin.png"
        alt=""
        className="arcade-frame-overlay"
        aria-hidden="true"
        draggable={false}
      />

      {/* Button light overlays - CSS-only glow effects */}
      <ArcadeButtonLights
        pattern={lightPattern}
        sequence={lightSequence}
        options={lightOptions}
        onSequenceComplete={onLightSequenceComplete}
      />

      {/* Intro buttons - positioned under the left red light (desktop only) */}
      {showIntroButtons && !isMobile && (
        <>
          <button
            className="arcade-frame-btn arcade-frame-btn-help"
            onClick={onHelpClick}
            aria-label="How to play"
          >
            <HelpCircle size={20} />
          </button>
          <button
            className="arcade-frame-btn arcade-frame-btn-mute"
            onClick={onMuteClick}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            className="arcade-frame-btn arcade-frame-btn-close"
            onClick={onCloseClick}
            aria-label="Close game"
          >
            <X size={20} />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Wide arcade frame for Memory Match.
 * Uses edge pieces that can stretch to accommodate wider content.
 *
 * NOTE: This requires additional PNG assets to be created:
 * - /public/img/arcade-edge-top.png
 * - /public/img/arcade-edge-bottom.png
 * - /public/img/arcade-edge-left.png
 * - /public/img/arcade-edge-right.png
 */
function ArcadeFrameWide({ children }: { children: React.ReactNode }) {
  // For now, fall back to standard wrapper until edge assets are created
  // See GitHub issue #2
  return (
    <div className="arcade-frame-wide">
      {/* Edge pieces - uncomment when assets are ready */}
      {/*
      <img
        src="/img/arcade-edge-top.png"
        className="arcade-edge arcade-edge-top"
        alt=""
        aria-hidden="true"
      />
      <img
        src="/img/arcade-edge-bottom.png"
        className="arcade-edge arcade-edge-bottom"
        alt=""
        aria-hidden="true"
      />
      <img
        src="/img/arcade-edge-left.png"
        className="arcade-edge arcade-edge-left"
        alt=""
        aria-hidden="true"
      />
      <img
        src="/img/arcade-edge-right.png"
        className="arcade-edge arcade-edge-right"
        alt=""
        aria-hidden="true"
      />
      */}

      {/* Game content - full width until edge assets are ready */}
      <div className="arcade-screen-wide">
        {children}
      </div>
    </div>
  );
}

export default ArcadeFrame;
