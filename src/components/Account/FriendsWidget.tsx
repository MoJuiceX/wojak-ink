/**
 * Friends Widget Component
 *
 * Compact friends summary for Account page.
 * Shows online friends, friend list preview, and quick actions.
 */

import { useState, useEffect } from 'react';
import { Users, Circle, UserPlus, RefreshCw } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface Friend {
  id: string;
  displayName: string;
  avatar: { type: string; value: string };
  isOnline: boolean;
  lastSeen?: string;
}

interface FriendsWidgetProps {
  onViewAll: () => void;
  onFindFriends: () => void;
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function FriendsWidget({ onViewAll, onFindFriends }: FriendsWidgetProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { getToken: async () => null };
  const { getToken } = authResult;

  const fetchFriends = async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('[FriendsWidget] Failed to fetch friends:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [getToken]);

  const onlineFriends = friends.filter(f => f.isOnline);

  if (loading) {
    return (
      <div className="account-widget friends-widget">
        <div className="widget-header">
          <h3>
            <Users size={18} />
            Friends
          </h3>
        </div>
        <div className="widget-loading-skeleton" role="status" aria-label="Loading friends">
          <div className="friends-section">
            <Skeleton variant="text" width={80} height={12} />
            <div className="friends-avatars">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="friend-avatar-skeleton">
                  <Skeleton variant="circular" width={36} height={36} />
                  <Skeleton variant="text" width={48} height={10} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-widget friends-widget">
        <div className="widget-header">
          <h3>
            <Users size={18} />
            Friends
          </h3>
        </div>
        <div className="widget-error">
          <span className="widget-error-icon">⚠️</span>
          <span className="widget-error-title">Failed to load friends</span>
          <button
            type="button"
            className="widget-btn secondary"
            onClick={fetchFriends}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-widget friends-widget">
      <div className="widget-header">
        <h3>
          <Users size={18} />
          Friends
        </h3>
        <span className="widget-count">{friends.length}</span>
      </div>

      {/* Online Friends */}
      {onlineFriends.length > 0 && (
        <div className="friends-section">
          <div className="section-label">
            <Circle size={8} fill="#22c55e" color="#22c55e" />
            Online Now ({onlineFriends.length})
          </div>
          <div className="friends-avatars">
            {onlineFriends.slice(0, 5).map(friend => (
              <div key={friend.id} className="friend-avatar online">
                <span className="avatar-emoji">{friend.avatar?.value || '🍊'}</span>
                <span className="friend-name">{friend.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Friends */}
      {friends.length > 0 ? (
        <div className="friends-section">
          <div className="section-label">All Friends</div>
          <div className="friends-avatars">
            {friends.slice(0, 6).map(friend => (
              <div key={friend.id} className="friend-avatar">
                <span className="avatar-emoji">{friend.avatar?.value || '🍊'}</span>
                <span className="friend-name">{friend.displayName}</span>
              </div>
            ))}
            {friends.length > 6 && (
              <div className="friend-avatar more">
                +{friends.length - 6}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="widget-empty">
          <span className="widget-empty-icon">👥</span>
          <span className="widget-empty-title">BUILD YOUR SQUAD</span>
          <p>Add friends to compete on leaderboards and compare scores</p>
          <button
            type="button"
            className="widget-btn primary"
            onClick={onFindFriends}
          >
            <UserPlus size={16} />
            Find Friends
          </button>
        </div>
      )}

      <div className="widget-actions">
        <button
          type="button"
          className="widget-btn primary"
          onClick={onViewAll}
        >
          <Users size={16} />
          Manage Friends
        </button>
      </div>
    </div>
  );
}
