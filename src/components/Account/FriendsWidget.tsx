/**
 * Friends Widget Component
 *
 * Compact friends summary for Account page.
 * Shows online friends, friend list preview, and quick actions.
 * Uses FriendsContext for consistent data with the rest of the app.
 */

import { Users, UserPlus, RefreshCw } from 'lucide-react';
import { useFriends } from '@/contexts/FriendsContext';
import { Avatar } from '@/components/Avatar/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';

interface FriendsWidgetProps {
  onViewAll: () => void;
  onFindFriends: () => void;
}

export function FriendsWidget({ onViewAll, onFindFriends }: FriendsWidgetProps) {
  const { friends: friendIds, friendProfiles, isLoading, profilesLoaded, refreshFriends } = useFriends();

  const handleRetry = async () => {
    await refreshFriends();
  };

  // Show loading skeleton while actively loading (before profiles have loaded at least once)
  const loading = isLoading && !profilesLoaded;
  // Show error if profiles attempted to load but we got none despite having friends
  // (friendIds.length > 0 means we have friend IDs but failed to load their profiles)
  const error = profilesLoaded && friendIds.length > 0 && friendProfiles.length === 0 && !isLoading;

  // Map friendProfiles to expected format for display
  const friends = friendProfiles.map(fp => ({
    id: fp.id,
    displayName: fp.displayName,
    avatar: fp.avatar,
    // Note: online status not yet implemented - default to false
    isOnline: false,
  }));

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
            onClick={handleRetry}
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

      {/* Online Friends - feature not yet implemented, commented out for now */}
      {/* Online status will be added when backend support is ready */}

      {/* All Friends */}
      {friends.length > 0 ? (
        <div className="friends-section">
          <div className="section-label">All Friends</div>
          <div className="friends-avatars">
            {friends.slice(0, 6).map(friend => (
              <div key={friend.id} className="friend-avatar">
                <Avatar
                  avatar={friend.avatar}
                  size="small"
                  showBadge={false}
                />
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
