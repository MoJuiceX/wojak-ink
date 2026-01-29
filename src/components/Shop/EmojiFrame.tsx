/* eslint-disable react-refresh/only-export-components */
/**
 * EmojiFrame Component
 *
 * Renders a frame with emojis arranged around the border.
 * Used for Legend Emoji Frames in the shop.
 */

import React from 'react';
import './EmojiFrame.css';

interface EmojiFrameProps {
  emoji: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// Emoji mapping for frame css classes
export const EMOJI_FRAME_MAP: Record<string, string> = {
  'frame-emoji-crown': '👑',
  'frame-emoji-tophat': '🎩',
  'frame-emoji-cookie': '🍪',
  'frame-emoji-frog': '🐸',
  'frame-emoji-goose': '🪿',
  'frame-emoji-trophy': '🏆',
  'frame-emoji-fire': '🔥',
};

export const EmojiFrame: React.FC<EmojiFrameProps> = ({
  emoji,
  children,
  size = 'medium',
  className = '',
}) => {
  // Determine how many emojis we need based on size
  const repeatCount = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const emojiString = emoji.repeat(repeatCount);

  // Calculate dimensions based on size
  const dimensions = {
    small: { width: 60, height: 60, fontSize: 8 },
    medium: { width: 80, height: 80, fontSize: 10 },
    large: { width: 120, height: 120, fontSize: 14 },
  }[size];

  return (
    <div className={`emoji-frame-container emoji-frame-${size} ${className}`}>
      {/* SVG frame with emojis on path */}
      <svg
        className="emoji-frame-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Rectangular path around the border */}
          <path
            id={`frame-path-${size}`}
            d="M 5,5 L 95,5 L 95,95 L 5,95 Z"
            fill="none"
          />
        </defs>
        <text
          className="emoji-frame-text"
          style={{ fontSize: `${dimensions.fontSize}px` }}
        >
          <textPath href={`#frame-path-${size}`} startOffset="0%">
            {emojiString}
          </textPath>
        </text>
      </svg>

      {/* Content inside the frame */}
      <div className="emoji-frame-content">
        {children}
      </div>
    </div>
  );
};

export default EmojiFrame;
