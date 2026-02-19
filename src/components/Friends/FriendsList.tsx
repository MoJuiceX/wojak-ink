/**
 * FriendsList Component
 *
 * Displays current friends with options to view profile, compare stats, or remove.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserMinus, ExternalLink, BarChart2 } from 'lucide-react';
import { useFriends } from '@/contexts/FriendsContext';
import { Avatar } from '@/components/Avatar/Avatar';
import { CompareStats } from '@/components/Profile/CompareStats';
import { Skeleton } from '@/components/ui/Skeleton';
import './Friends.css';

interface SelectedFriend {
  id: string;
  name: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
  };
}

export function FriendsList() {
  const { friends, friendProfiles, removeFriend, isLoading, profilesLoaded } = useFriends();
  const [compareTarget, setCompareTarget] = useState<SelectedFriend | null>(null);

  // Show loading skeleton while actively loading
  if (isLoading && !profilesLoaded) {
    return (
      <div className="friends-list" role="status" aria-label="Loading friends">
        {[1, 2, 3].map((i) => (
          <div key={i} className="friend-card friend-card-skeleton">
            <div className="friend-info">
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={100} height={16} />
            </div>
            <div className="friend-actions">
              <Skeleton variant="rounded" width={32} height={32} />
              <Skeleton variant="rounded" width={32} height={32} />
              <Skeleton variant="rounded" width={32} height={32} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No friends added yet
  if (friends.length === 0) {
    return (
      <div className="friends-empty">
        <span className="empty-icon">👥</span>
        <p>No friends yet</p>
        <p className="empty-hint">Add friends to compare scores on leaderboards!</p>
      </div>
    );
  }

  // Friends exist but profiles failed to load - show friend count with error message
  if (profilesLoaded && friendProfiles.length === 0 && friends.length > 0) {
    return (
      <div className="friends-empty">
        <span className="empty-icon">⚠️</span>
        <p>Unable to load friend profiles</p>
        <p className="empty-hint">You have {friends.length} friend{friends.length > 1 ? 's' : ''} but their profiles couldn't be loaded.</p>
      </div>
    );
  }

  const handleCompare = (friend: typeof friendProfiles[0]) => {
    setCompareTarget({
      id: friend.id,
      name: friend.displayName,
      avatar: friend.avatar as { type: 'emoji' | 'nft'; value: string },
    });
  };

  return (
    <>
      <div className="friends-list">
        {friendProfiles.map((friend) => (
          <div key={friend.id} className="friend-card">
            <Link to={`/profile/${friend.id}`} className="friend-info">
              <Avatar avatar={friend.avatar} size="medium" showBadge={false} />
              <span className="friend-name">{friend.displayName}</span>
            </Link>

            <div className="friend-actions">
              <button
                type="button"
                className="action-button compare-stats"
                onClick={() => handleCompare(friend)}
                title="Compare stats"
              >
                <BarChart2 size={16} />
              </button>

              <Link
                to={`/profile/${friend.id}`}
                className="action-button view-profile"
                title="View profile"
              >
                <ExternalLink size={16} />
              </Link>

              <button
                type="button"
                className="action-button remove-friend"
                onClick={() => removeFriend(friend.id)}
                title="Remove friend"
              >
                <UserMinus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Compare Stats Modal */}
      {compareTarget && (
        <CompareStats
          isOpen={true}
          onClose={() => setCompareTarget(null)}
          friendId={compareTarget.id}
          friendName={compareTarget.name}
          friendAvatar={compareTarget.avatar}
        />
      )}
    </>
  );
}
