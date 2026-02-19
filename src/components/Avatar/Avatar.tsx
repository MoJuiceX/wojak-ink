/**
 * Avatar Component
 *
 * Displays user avatars with support for emoji and NFT types.
 *
 * Tiered Avatar System:
 * - Emoji avatars: Standard styling (no visual difference between default/custom)
 * - NFT avatars: Premium gold glow effects + verified badge
 */

import React from 'react';
import { AVATAR_SIZES, type AvatarSize } from '../../constants/avatars';
import type { UserAvatar as UserAvatarType } from '@/types/avatar';
import './Avatar.css';

interface AvatarProps {
  // New: accept full avatar object
  avatar?: UserAvatarType;
  // OR legacy props:
  type?: 'emoji' | 'nft';
  value?: string;
  // Common props:
  size?: AvatarSize;
  showBorder?: boolean;
  isNftHolder?: boolean; // Deprecated: use avatar.type === 'nft' instead
  /** Show spinning highlight ring (for featured/top players) */
  highlighted?: boolean;
  /** Show verified badge for NFT avatars (default: true) */
  showBadge?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  type: legacyType,
  value: legacyValue,
  size = 'medium',
  showBorder = true,
  isNftHolder = false,
  highlighted = false,
  showBadge = true,
  onClick,
  className = '',
}) => {
  const pixelSize = AVATAR_SIZES[size];

  // Normalize props - support both new avatar object and legacy props
  const avatarType = avatar?.type || legacyType || 'emoji';
  const avatarValue = avatar?.value || legacyValue || '🎮';
  const isNft = avatarType === 'nft' || isNftHolder;

  const classes = [
    'avatar',
    `avatar-${size}`,
    !isNft ? 'avatar-emoji' : '',
    isNft ? 'avatar-nft' : '',
    isNft && !showBadge ? 'avatar-no-badge' : '',
    highlighted ? 'avatar-highlighted' : '',
    showBorder && !isNft ? 'avatar-bordered' : '',
    onClick ? 'avatar-clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ width: pixelSize, height: pixelSize }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Select avatar' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {avatarType === 'emoji' ? (
        <span className="avatar-content" style={{ fontSize: pixelSize * 0.6 }}>
          {avatarValue}
        </span>
      ) : (
        <img
          src={avatarValue}
          alt="NFT Avatar"
          className="avatar-nft-image"
          loading="lazy"
        />
      )}

      {/* NFT avatars automatically get the verified badge via CSS ::after */}
    </div>
  );
};

// Convenient wrapper using user data
interface UserAvatarProps {
  user: {
    avatar: { type: 'emoji' | 'nft'; value: string };
    walletAddress?: string | null;
  };
  size?: AvatarSize;
  showBorder?: boolean;
  onClick?: () => void;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'medium',
  showBorder = true,
  onClick,
  className,
}) => {
  return (
    <Avatar
      type={user.avatar.type}
      value={user.avatar.value}
      size={size}
      showBorder={showBorder}
      isNftHolder={!!user.walletAddress}
      onClick={onClick}
      className={className}
    />
  );
};

export default Avatar;
