/**
 * Achievements Widget Component
 *
 * Compact achievements summary for Account page.
 * Shows recent unlocks, progress bar, and quick access to full achievements.
 */

import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  completedAt?: string;
  progress?: number;
  target?: number;
  reward: number;
}

interface AchievementStats {
  completed: number;
  total: number;
  orangesEarned: number;
}

interface AchievementsWidgetProps {
  onViewAll: () => void;
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AchievementsWidget({ onViewAll }: AchievementsWidgetProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({ completed: 0, total: 0, orangesEarned: 0 });
  const [loading, setLoading] = useState(true);
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { getToken: async () => null };
  const { getToken } = authResult;

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/currency/achievements', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setAchievements(data.achievements || []);
          setStats({
            completed: data.completedCount || 0,
            total: data.totalCount || 45, // Default total
            orangesEarned: data.totalOrangesEarned || 0,
          });
        }
      } catch (err) {
        console.error('[AchievementsWidget] Failed to fetch achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [getToken]);

  const recentUnlocks = achievements
    .filter(a => a.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 3);

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="account-widget achievements-widget">
        <div className="widget-header">
          <h3>
            <Award size={18} />
            Achievements
          </h3>
        </div>
        <div className="widget-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="account-widget achievements-widget">
      <div className="widget-header">
        <h3>
          <Award size={18} />
          Achievements
        </h3>
        <span className="widget-count">{stats.completed}/{stats.total} ({progressPercent}%)</span>
      </div>

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 ? (
        <div className="achievements-section">
          <div className="section-label">Recent Unlocks</div>
          <div className="achievement-cards">
            {recentUnlocks.map(achievement => (
              <div
                key={achievement.id}
                className={`achievement-mini-card ${achievement.rarity}`}
              >
                <span className="achievement-icon">{achievement.icon}</span>
                <span className="achievement-name">{achievement.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="widget-empty">
          <span className="widget-empty-icon">🏆</span>
          <span className="widget-empty-title">Start your journey</span>
          <p>Play games to unlock achievements</p>
        </div>
      )}

      <div className="widget-actions">
        <button
          type="button"
          className="widget-btn primary"
          onClick={onViewAll}
        >
          View All Achievements
        </button>
      </div>
    </div>
  );
}
