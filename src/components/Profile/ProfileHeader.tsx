/**
 * ProfileHeader Component (SPEC 15)
 *
 * Customizable banner with avatar, username, title, bio, and socials.
 */

import { motion } from 'framer-motion';
import { Twitter, Share2, Edit, MapPin } from 'lucide-react';
import { BigPulp } from '@/components/Shop/BigPulp';
import type { BigPulpMood } from '@/components/Shop/BigPulp';

interface ProfileCustomization {
  banner_style?: string;
  username_color?: string;
  username_style?: string;
  avatar_glow?: string;
  avatar_size?: string;
}

interface ProfileHeaderProps {
  userId: string;
  username: string;
  title?: string;
  bio?: string;
  avatar?: {
    type: 'emoji' | 'nft';
    value: string;
  };
  frame?: {
    id: string;
    css_class: string;
  };
  nameEffect?: {
    id: string;
    css_class: string;
  };
  emojiRing?: Record<string, string>;
  xHandle?: string;
  discord?: string;
  location?: string;
  bigpulp?: {
    hat: string | null;
    mood: string;
    accessory: string | null;
  };
  customization?: ProfileCustomization;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
}

export function ProfileHeader({
  userId,
  username,
  title,
  bio,
  avatar,
  frame,
  nameEffect,
  emojiRing,
  xHandle,
  discord,
  location,
  bigpulp,
  customization,
  isOwnProfile,
  onEdit,
  onShare,
}: ProfileHeaderProps) {
  // userId could be used for future API calls or sharing features
  void userId;
  // Build customization classes
  const glowClass = customization?.avatar_glow ? `avatar-glow-${customization.avatar_glow}` : '';
  const sizeClass = customization?.avatar_size ? `avatar-size-${customization.avatar_size}` : '';

  // Get username style
  const getUsernameStyle = (): React.CSSProperties => {
    if (!customization?.username_color || customization.username_color === 'orange') {
      return {};
    }
    const colorMap: Record<string, string> = {
      white: '#FFFFFF',
      red: '#EF4444',
      yellow: '#FBBF24',
      green: '#22C55E',
      blue: '#3B82F6',
      purple: '#A855F7',
      pink: '#EC4899',
      cyan: '#06B6D4',
      gold: '#FFD700',
    };
    if (customization.username_color.startsWith('gradient-')) {
      return {
        background: 'var(--username-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }
    return { color: colorMap[customization.username_color] };
  };

  // Extract emoji ring values as array
  const emojiRingArray = emojiRing
    ? Object.values(emojiRing).filter(Boolean)
    : [];

  return (
    <motion.div
      className="profile-header-banner"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background glow */}
      <div className="header-glow" />

      {/* Action Buttons */}
      {onShare && (
        <button type="button" className="share-profile-btn" onClick={onShare} title="Share profile" aria-label="Share profile">
          <Share2 size={18} />
        </button>
      )}
      {isOwnProfile && onEdit && (
        <button type="button" className="edit-profile-btn" onClick={onEdit} title="Coming soon" style={{ opacity: 0.5, cursor: 'default' }}>
          <Edit size={16} />
          Edit Profile
        </button>
      )}

      <div className="header-content">
        {/* Avatar Section */}
        <div className={`header-avatar-section ${glowClass} ${sizeClass}`}>
          <motion.div
            className={`header-avatar ${frame?.css_class || ''}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
          >
            {avatar?.type === 'nft' ? (
              <img src={avatar.value} alt={username} />
            ) : (
              <span className="avatar-emoji">{avatar?.value || '🍊'}</span>
            )}
          </motion.div>

          {/* BigPulp Mini */}
          {bigpulp && (
            <motion.div
              className="header-bigpulp-mini"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <BigPulp
                hat={bigpulp.hat}
                mood={bigpulp.mood as BigPulpMood}
                accessory={bigpulp.accessory}
                size="small"
                showDialogue={false}
              />
            </motion.div>
          )}
        </div>

        {/* User Info */}
        <motion.div
          className="header-user-info"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className={`header-username ${nameEffect?.css_class || ''}`} style={getUsernameStyle()}>
            {username}
          </h1>

          {title && <span className="header-title">"{title}"</span>}

          {bio && <p className="header-bio">{bio}</p>}

          {/* Socials */}
          {(xHandle || discord || location) && (
            <div className="header-socials">
              {xHandle && (
                <a
                  href={`https://twitter.com/${xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                >
                  <Twitter size={14} />
                  @{xHandle}
                </a>
              )}
              {discord && (
                <span className="social-link">
                  💬 {discord}
                </span>
              )}
              {location && (
                <span className="social-link">
                  <MapPin size={14} />
                  {location}
                </span>
              )}
            </div>
          )}

          {/* Emoji Ring */}
          {emojiRingArray.length > 0 && (
            <div className="header-emoji-ring">
              {emojiRingArray.map((emoji, index) => (
                <motion.span
                  key={index}
                  className="emoji-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
