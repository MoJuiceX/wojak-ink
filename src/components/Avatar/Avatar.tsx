/**
 * Avatar Component
 *
 * Displays user avatars with support for emoji and NFT types.
 *
 * Tiered Avatar System:
 * - Emoji avatars: Standard styling (no visual difference between default/custom)
 * - NFT avatars: Premium gold glow effects + verified badge
 */

import React, { useMemo, useState } from 'react';
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

const PUBLIC_IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
] as const;

const CUSTOM_PINATA_GATEWAY = (import.meta.env.VITE_PINATA_GATEWAY as string | undefined)?.trim();

function toCandidateList(rawValue: string): string[] {
  const raw = rawValue.trim();
  if (!raw) return [];

  if (!raw.startsWith('[')) {
    return [raw];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
  } catch {
    // Fallback to raw string below.
  }

  return [raw];
}

function extractCidAndPath(input: string): { cid: string; path: string } | null {
  const value = input.trim();
  if (!value) return null;

  const ipfsMatch = value.match(/^ipfs:\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (ipfsMatch) {
    return {
      cid: ipfsMatch[1],
      path: ipfsMatch[2] || '',
    };
  }

  try {
    const url = new URL(value);
    const pathStyle = url.pathname.match(/^\/ipfs\/([^/?#]+)(\/[^?#]*)?/i);
    if (pathStyle) {
      return {
        cid: pathStyle[1],
        path: pathStyle[2] || '',
      };
    }

    const hostParts = url.hostname.split('.');
    if (hostParts.length > 0) {
      const first = hostParts[0];
      const looksLikeCid = /^baf[a-z0-9]+$/i.test(first) || /^Qm[a-zA-Z0-9]+$/.test(first);
      if (looksLikeCid) {
        return {
          cid: first,
          path: url.pathname || '',
        };
      }
    }
  } catch {
    // Non-URL string.
  }

  return null;
}

function buildGatewayUrls(cid: string, path: string): string[] {
  const normalizedPath = path || '';
  const urls: string[] = [];

  if (CUSTOM_PINATA_GATEWAY) {
    urls.push(`https://${CUSTOM_PINATA_GATEWAY}/ipfs/${cid}${normalizedPath}`);
  }

  for (const gateway of PUBLIC_IPFS_GATEWAYS) {
    urls.push(`${gateway}${cid}${normalizedPath}`);
  }

  return urls;
}

function buildNftImageSources(rawValue: string): string[] {
  const seen = new Set<string>();
  const sources: string[] = [];

  const pushSource = (url: string) => {
    const cleaned = url.trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    sources.push(cleaned);
  };

  for (const candidate of toCandidateList(rawValue)) {
    const ipfs = extractCidAndPath(candidate);
    if (!ipfs) {
      pushSource(candidate);
      continue;
    }

    const isUnstableGateway = candidate.includes('.ipfs.w3s.link') || candidate.includes('.web.link');

    if (!isUnstableGateway) {
      pushSource(candidate);
    }

    for (const gatewayUrl of buildGatewayUrls(ipfs.cid, ipfs.path)) {
      pushSource(gatewayUrl);
    }
  }

  return sources;
}

interface NftImageProps {
  sources: string[];
  className: string;
  fallbackFontSize: number;
}

const NftImage: React.FC<NftImageProps> = ({ sources, className, fallbackFontSize }) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const currentSrc = sources[sourceIndex];

  if (!currentSrc) {
    return (
      <span className="avatar-content" style={{ fontSize: fallbackFontSize }}>
        🎮
      </span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt="NFT Avatar"
      className={className}
      loading="lazy"
      onError={() => setSourceIndex((prev) => prev + 1)}
    />
  );
};

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
  const nftSources = useMemo(
    () => (isNft ? buildNftImageSources(avatarValue) : []),
    [isNft, avatarValue]
  );

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
        <NftImage
          key={avatarValue}
          sources={nftSources}
          className="avatar-nft-image"
          fallbackFontSize={pixelSize * 0.6}
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
