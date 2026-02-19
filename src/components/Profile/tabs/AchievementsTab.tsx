/**
 * AchievementsTab Component (SPEC 15)
 *
 * Premium achievement showcase with categories and visual states.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Check, Lock, ArrowUpDown } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'gameplay' | 'collection' | 'social' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  reward: { oranges: number; gems: number };
  isSecret?: boolean;
}

interface AchievementProgress {
  achievementId: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  claimed: boolean;
}

interface AchievementsTabProps {
  achievements: Achievement[];
  progress: Record<string, AchievementProgress>;
  showLocked?: boolean;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'collection', label: 'Collection' },
  { id: 'social', label: 'Social' },
  { id: 'milestone', label: 'Milestones' },
];

const SORT_OPTIONS = [
  { id: 'rarity', label: 'Rarity' },
  { id: 'progress', label: 'Progress' },
  { id: 'date', label: 'Date' },
  { id: 'reward', label: 'Reward' },
];

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export function AchievementsTab({
  achievements,
  progress,
  showLocked = true,
}: AchievementsTabProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rarity');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Get achievement status
  const getStatus = (achievement: Achievement): 'completed' | 'in_progress' | 'locked' => {
    const prog = progress[achievement.id];
    if (!prog) return 'locked';
    if (prog.completed) return 'completed';
    if (prog.progress > 0) return 'in_progress';
    return 'locked';
  };

  // Filter achievements
  const filteredAchievements = achievements.filter(a => {
    if (activeFilter !== 'all' && a.category !== activeFilter) return false;
    if (!showLocked && getStatus(a) === 'locked') return false;
    if (a.isSecret && getStatus(a) === 'locked') return false;
    return true;
  });

  // Sort achievements
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const statusA = getStatus(a);
    const statusB = getStatus(b);

    // Always show completed first, then in_progress, then locked
    const statusOrder = { completed: 0, in_progress: 1, locked: 2 };
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }

    switch (sortBy) {
      case 'rarity':
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      case 'progress': {
        const progA = progress[a.id]?.progress || 0;
        const progB = progress[b.id]?.progress || 0;
        const targetA = progress[a.id]?.target || a.reward.oranges;
        const targetB = progress[b.id]?.target || b.reward.oranges;
        return (progB / targetB) - (progA / targetA);
      }
      case 'date': {
        const dateA = progress[a.id]?.completedAt ? new Date(progress[a.id].completedAt!).getTime() : 0;
        const dateB = progress[b.id]?.completedAt ? new Date(progress[b.id].completedAt!).getTime() : 0;
        return dateB - dateA;
      }
      case 'reward':
        return b.reward.oranges - a.reward.oranges;
      default:
        return 0;
    }
  });

  // Group by status
  const completed = sortedAchievements.filter(a => getStatus(a) === 'completed');
  const inProgress = sortedAchievements.filter(a => getStatus(a) === 'in_progress');
  const locked = sortedAchievements.filter(a => getStatus(a) === 'locked');

  // Calculate overall progress
  const completedCount = completed.length;
  const totalCount = achievements.filter(a => !a.isSecret || getStatus(a) !== 'locked').length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="tab-content">
      {/* Header with Progress */}
      <div className="collection-header">
        <div className="section-header">
          <Trophy size={20} className="section-icon" />
          <h2 className="section-title">Achievements</h2>
        </div>
        <div className="collection-stats">
          <span className="collection-stat">
            <strong>{completedCount}/{totalCount}</strong> Completed ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="achievements-progress-bar">
        <div className="progress-header">
          <span className="progress-title">Achievement Progress</span>
          <span className="progress-value">{progressPercent}%</span>
        </div>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>
      </div>

      {/* Filters and Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="collection-filters" style={{ marginBottom: 0 }}>
          {CATEGORY_FILTERS.map(filter => (
            <button
              key={filter.id}
              className={`collection-filter ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="collection-filter"
            onClick={() => setShowSortMenu(!showSortMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowUpDown size={14} />
            Sort: {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
          </button>
          {showSortMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: '#1a1a1a',
              border: '1px solid var(--color-white-10)',
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 10,
            }}>
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => { setSortBy(option.id); setShowSortMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: sortBy === option.id ? 'rgba(249,115,22,0.15)' : 'transparent',
                    border: 'none',
                    color: sortBy === option.id ? '#f97316' : 'rgba(255,255,255,0.7)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Section */}
      {completed.length > 0 && (
        <section className="achievement-section">
          <div className="achievement-section-header">
            <h3 className="achievement-section-title">Completed</h3>
            <span className="achievement-section-count">{completed.length}</span>
          </div>
          <motion.div className="achievements-grid" layout>
            <AnimatePresence mode="popLayout">
              {completed.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={progress[achievement.id]}
                  status="completed"
                  index={index}
                  formatDate={formatDate}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <section className="achievement-section">
          <div className="achievement-section-header">
            <h3 className="achievement-section-title">In Progress</h3>
            <span className="achievement-section-count">{inProgress.length}</span>
          </div>
          <motion.div className="achievements-grid" layout>
            <AnimatePresence mode="popLayout">
              {inProgress.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={progress[achievement.id]}
                  status="in_progress"
                  index={index}
                  formatDate={formatDate}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      {/* Locked Section */}
      {showLocked && locked.length > 0 && (
        <section className="achievement-section">
          <div className="achievement-section-header">
            <h3 className="achievement-section-title">Locked</h3>
            <span className="achievement-section-count">{locked.length}</span>
          </div>
          <motion.div className="achievements-grid" layout>
            <AnimatePresence mode="popLayout">
              {locked.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={progress[achievement.id]}
                  status="locked"
                  index={index}
                  formatDate={formatDate}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      )}

      {/* Empty state */}
      {sortedAchievements.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">🏆</span>
          <h3 className="empty-state-title">No achievements found</h3>
          <p className="empty-state-text">Try a different filter to see more achievements.</p>
        </div>
      )}
    </div>
  );
}

// Individual Achievement Card
function AchievementCard({
  achievement,
  progress,
  status,
  index,
  formatDate,
}: {
  achievement: Achievement;
  progress?: AchievementProgress;
  status: 'completed' | 'in_progress' | 'locked';
  index: number;
  formatDate: (date: string) => string;
}) {
  const progressPercent = progress
    ? Math.min((progress.progress / progress.target) * 100, 100)
    : 0;

  const isLegendary = achievement.rarity === 'legendary';

  return (
    <motion.div
      className={`achievement-card ${status} ${achievement.rarity} ${isLegendary ? 'legendary' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -6 }}
    >
      {/* Icon */}
      <div className="achievement-icon-wrapper">
        {status === 'locked' ? (
          <Lock size={32} className="achievement-lock-overlay" />
        ) : (
          <span>{achievement.icon}</span>
        )}
        {status === 'completed' && (
          <span className="achievement-completed-badge">
            <Check size={14} />
          </span>
        )}
      </div>

      {/* Progress Bar (for in_progress) */}
      {status === 'in_progress' && progress && (
        <div className="achievement-progress">
          <div className="achievement-progress-bar">
            <motion.div
              className="achievement-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: index * 0.03 + 0.2 }}
            />
          </div>
          <span className="achievement-progress-text">
            {progress.progress.toLocaleString()} / {progress.target.toLocaleString()}
          </span>
        </div>
      )}

      {/* Name & Description */}
      <h3 className="achievement-name">
        {status === 'locked' && achievement.isSecret ? '???' : achievement.name}
      </h3>
      <p className="achievement-description">
        {status === 'locked' && achievement.isSecret
          ? 'Secret achievement'
          : achievement.description}
      </p>

      {/* Footer */}
      <div className="achievement-footer">
        <span className={`rarity-badge rarity-${achievement.rarity}`}>
          {achievement.rarity}
        </span>
        <span className="reward-badge">
          +{achievement.reward.oranges.toLocaleString()} 🍊
          {achievement.reward.gems > 0 && ` +${achievement.reward.gems} 💎`}
        </span>
      </div>

      {/* Completion Date */}
      {status === 'completed' && progress?.completedAt && (
        <span className="achievement-date">
          Completed {formatDate(progress.completedAt)}
        </span>
      )}
    </motion.div>
  );
}
