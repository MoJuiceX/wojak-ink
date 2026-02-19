/**
 * Guild Card Component
 *
 * Displays a guild with its banner, name, tag, and stats.
 */

import React from 'react';
import type { Guild, GuildBanner } from '../../types/guild';
import './Guild.css';

interface GuildCardProps {
  guild: Guild;
  onClick?: () => void;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const GuildCard: React.FC<GuildCardProps> = ({
  guild,
  onClick,
  showStats = true,
  size = 'medium',
}) => {
  return (
    <div
      className={`guild-card guild-card-${size} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${guild.name} guild` : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <GuildBannerDisplay banner={guild.banner} size={size} />

      <div className="guild-card-content">
        <div className="guild-card-header">
          <span className="guild-tag">[{guild.tag}]</span>
          <h3 className="guild-name">{guild.name}</h3>
        </div>

        {showStats && (
          <div className="guild-card-stats">
            <div className="stat">
              <span className="stat-value">{guild.memberCount}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat">
              <span className="stat-value">Lv.{guild.level}</span>
              <span className="stat-label">Level</span>
            </div>
            {guild.rank && (
              <div className="stat">
                <span className="stat-value">#{guild.rank}</span>
                <span className="stat-label">Rank</span>
              </div>
            )}
          </div>
        )}

        {guild.description && size !== 'small' && (
          <p className="guild-card-description">{guild.description}</p>
        )}
      </div>
    </div>
  );
};

// Guild Banner Display Component
interface GuildBannerDisplayProps {
  banner: GuildBanner;
  size: 'small' | 'medium' | 'large';
}

export const GuildBannerDisplay: React.FC<GuildBannerDisplayProps> = ({ banner, size }) => {
  const getPatternStyle = (): React.CSSProperties => {
    const { backgroundColor, pattern, accentColor } = banner;

    switch (pattern) {
      case 'stripes':
        return {
          background: `repeating-linear-gradient(
            45deg,
            ${backgroundColor},
            ${backgroundColor} 10px,
            ${accentColor} 10px,
            ${accentColor} 20px
          )`,
        };
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${backgroundColor}, ${accentColor})`,
        };
      case 'diagonal':
        return {
          background: `linear-gradient(135deg, ${backgroundColor} 50%, ${accentColor} 50%)`,
        };
      case 'dots':
        return {
          background: `radial-gradient(circle, ${accentColor} 2px, ${backgroundColor} 2px)`,
          backgroundSize: '10px 10px',
        };
      case 'chevron':
        return {
          background: `linear-gradient(135deg, ${accentColor} 25%, transparent 25%) -50px 0,
                       linear-gradient(225deg, ${accentColor} 25%, transparent 25%) -50px 0,
                       linear-gradient(315deg, ${accentColor} 25%, transparent 25%),
                       linear-gradient(45deg, ${accentColor} 25%, transparent 25%)`,
          backgroundSize: '40px 40px',
          backgroundColor: backgroundColor,
        };
      default:
        return { backgroundColor };
    }
  };

  return (
    <div className={`guild-banner guild-banner-${size}`} style={getPatternStyle()}>
      <span className="guild-emblem">{banner.emblem}</span>
    </div>
  );
};

export default GuildCard;
