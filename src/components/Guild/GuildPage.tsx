/**
 * Guild Page Component
 *
 * Main guild page with overview, members, and leaderboard tabs.
 * Features epic hero section with floating particles and animated castle.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGuild } from '../../contexts/GuildContext';
import { GuildBannerDisplay } from './GuildCard';
import { GuildMemberList } from './GuildMemberList';
import { GuildLeaderboard } from './GuildLeaderboard';
import { GuildActivity } from './GuildActivity';
import type { GuildInvite } from '../../types/guild';
import './Guild.css';

// Guild benefits data
const GUILD_BENEFITS = [
  { icon: '🏆', title: 'Compete Together', desc: 'Climb the guild leaderboards' },
  { icon: '🎁', title: 'Exclusive Rewards', desc: 'Earn guild-only items' },
  { icon: '🤝', title: 'Community', desc: 'Connect with fellow collectors' },
  { icon: '⚡', title: 'Bonus XP', desc: 'Earn more from games' },
];

export function GuildPage() {
  const {
    myGuild,
    myGuildMembers,
    myRole,
    isLoading,
    leaveGuild,
  } = useGuild();
  const prefersReducedMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'leaderboard'>('overview');

  if (isLoading) {
    return (
      <div className="guild-page">
        <div className="loading-state">
          <Loader2 className="animate-spin" size={32} />
          <p>Loading guild...</p>
        </div>
      </div>
    );
  }

  // User is not in a guild - Coming Soon Section
  if (!myGuild) {
    return (
      <div className="guild-page">
        {/* Epic Hero Section */}
        <div className="guild-hero">
          {/* Radial gradient background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center top, var(--color-primary-15) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          {/* Desktop: Coming Soon badge in top right */}
          <motion.div
            className="coming-soon-badge-desktop"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'linear-gradient(135deg, var(--color-primary-20), var(--color-primary-10))',
              border: '1px solid var(--color-primary-40)',
              borderRadius: 12,
              padding: '12px 20px',
              display: 'none',
            }}
          >
            <span style={{ color: '#F97316', fontWeight: 600, fontSize: '0.9rem' }}>
              Coming Soon
            </span>
          </motion.div>

          {/* Animated castle with glow and floating particles */}
          <motion.div
            className="castle-container"
            style={{ position: 'relative', display: 'inline-block' }}
          >
            {/* Floating particles */}
            <motion.span
              style={{
                position: 'absolute',
                left: -20,
                top: '50%',
                fontSize: '1.5rem',
              }}
              animate={prefersReducedMotion ? {} : { y: [-20, -60], opacity: [1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⚔️
            </motion.span>
            <motion.span
              style={{
                position: 'absolute',
                right: -20,
                top: '50%',
                fontSize: '1.5rem',
              }}
              animate={prefersReducedMotion ? {} : { y: [-20, -60], opacity: [1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              🛡️
            </motion.span>

            {/* Animated castle */}
            <motion.div
              className="castle-icon"
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [0, -10, 0],
                      filter: [
                        'drop-shadow(0 0 20px var(--color-primary-30))',
                        'drop-shadow(0 0 40px rgba(249, 115, 22, 0.5))',
                        'drop-shadow(0 0 20px var(--color-primary-30))',
                      ],
                    }
              }
              transition={{ duration: 3, repeat: Infinity }}
              style={{ fontSize: '6rem' }}
            >
              🏰
            </motion.div>
          </motion.div>

          <h2 className="guild-hero-title">Guilds Coming Soon</h2>
          <p className="guild-hero-subtitle">
            Team up with other players to compete on the guild leaderboard and earn exclusive rewards!
          </p>

          {/* Coming Soon message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-15), rgba(249, 115, 22, 0.05))',
              border: '1px solid var(--color-primary-30)',
              borderRadius: 16,
              padding: '24px 32px',
              textAlign: 'center',
              maxWidth: 400,
              margin: '0 auto 32px',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}>
              🚧
            </span>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, lineHeight: 1.6 }}>
              We're building something epic! Guild features will be available soon.
              Stay tuned for updates.
            </p>
          </motion.div>
        </div>

        {/* Benefits Section */}
        <div className="guild-benefits">
          <h3>Why Join a Guild?</h3>
          <div className="benefits-grid">
            {GUILD_BENEFITS.map((benefit, i) => (
              <motion.div
                key={i}
                className="benefit-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <span className="benefit-icon">{benefit.icon}</span>
                <h4>{benefit.title}</h4>
                <p>{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // User is in a guild
  return (
    <div className="guild-page">
      {/* Guild Header */}
      <div className="guild-header">
        <GuildBannerDisplay banner={myGuild.banner} size="large" />
        <div className="guild-header-info">
          <div className="guild-title">
            <span className="guild-tag">[{myGuild.tag}]</span>
            <h1 className="guild-name">{myGuild.name}</h1>
          </div>
          <div className="guild-meta">
            <span className="guild-level">Level {myGuild.level}</span>
            <span className="guild-members">
              {myGuild.memberCount}/{myGuild.maxMembers} Members
            </span>
            {myGuild.rank && <span className="guild-rank">Rank #{myGuild.rank}</span>}
          </div>
          {myGuild.description && <p className="guild-description">{myGuild.description}</p>}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="guild-xp-bar">
        <div className="xp-label">
          <span>Guild XP</span>
          <span>
            {myGuild.xp.toLocaleString()} / {myGuild.xpToNextLevel.toLocaleString()}
          </span>
        </div>
        <div className="xp-track">
          <div
            className="xp-fill"
            style={{ width: `${(myGuild.xp / myGuild.xpToNextLevel) * 100}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="guild-tabs">
        <button
          className={`guild-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`guild-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          className={`guild-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>

      {/* Tab Content */}
      <div className="guild-tab-content">
        {activeTab === 'overview' && (
          <div className="guild-overview">
            <GuildActivity />

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-card">
                <span className="stat-icon">🏆</span>
                <span className="stat-value">{myGuild.totalScore.toLocaleString()}</span>
                <span className="stat-label">Total Score</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📅</span>
                <span className="stat-value">{myGuild.weeklyScore.toLocaleString()}</span>
                <span className="stat-label">This Week</span>
              </div>
            </div>

            {/* Guild Actions */}
            <div className="guild-actions">
              {myRole !== 'leader' && (
                <button
                  className="leave-guild-btn"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to leave this guild?')) {
                      leaveGuild();
                    }
                  }}
                >
                  Leave Guild
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <GuildMemberList members={myGuildMembers} currentUserRole={myRole} />
        )}

        {activeTab === 'leaderboard' && <GuildLeaderboard myGuildId={myGuild.id} />}
      </div>
    </div>
  );
}

// Guild Invite Card component
interface GuildInviteCardProps {
  invite: GuildInvite;
}

// Future feature: Guild invites UI
export function GuildInviteCard({ invite }: GuildInviteCardProps) {
  const { acceptInvite, declineInvite } = useGuild();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await acceptInvite(invite.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await declineInvite(invite.id);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="invite-card">
      <div className="invite-info">
        <span className="invite-guild">
          [{invite.guildTag}] {invite.guildName}
        </span>
        <span className="invite-from">Invited by {invite.invitedBy}</span>
      </div>
      <div className="invite-actions">
        <button className="invite-btn accept" onClick={handleAccept} disabled={isProcessing}>
          Accept
        </button>
        <button className="invite-btn decline" onClick={handleDecline} disabled={isProcessing}>
          Decline
        </button>
      </div>
    </div>
  );
}

export default GuildPage;
