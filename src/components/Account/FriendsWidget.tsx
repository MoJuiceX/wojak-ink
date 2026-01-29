/**
 * Friends Widget Component
 *
 * Compact friends summary for Account page.
 * Shows online friends, friend list preview, and quick actions.
 */

import { useState, useEffect } from 'react';
import { Users, Circle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

interface Friend {
  id: string;
  displayName: string;
  avatar: { type: string; value: string };
  isOnline: boolean;
  lastSeen?: string;
}

interface FriendsWidgetProps {
  onViewAll: () => void;
  onAddFriend: () => void;
}

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function FriendsWidget({ onViewAll }: Omit<FriendsWidgetProps, 'onAddFriend'>) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { getToken: async () => null };
  const { getToken } = authResult;

  useEffect(() => {
    const fetchFriends = async () => {
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
        }
      } catch (err) {
        console.error('[FriendsWidget] Failed to fetch friends:', err);
      } finally {
        setLoading(false);
      }
    };

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
        <div className="widget-loading">Loading...</div>
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
          <span className="widget-empty-icon">🎮</span>
          <span className="widget-empty-title">Your squad awaits</span>
          <p>Add friends to compete on leaderboards</p>
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
