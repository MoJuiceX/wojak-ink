/**
 * UserBrowser Component
 *
 * Browse and search all registered users to add as friends.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { useFriends } from '@/contexts/FriendsContext';
import { Avatar } from '@/components/Avatar/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import './Friends.css';

interface UserSummary {
  id: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
}

export function UserBrowser() {
  const { searchUsers, getAllUsers, addFriend, isFriend } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Load initial users or search results
  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);

      if (debouncedQuery.trim()) {
        const results = await searchUsers(debouncedQuery);
        setUsers(results);
        setHasMore(false);
      } else {
        const result = await getAllUsers(50, 0);
        setUsers(result.users);
        setHasMore(result.hasMore);
        setOffset(50);
      }

      setIsLoading(false);
    }

    loadUsers();
  }, [debouncedQuery, searchUsers, getAllUsers]);

  // Load more users
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    const result = await getAllUsers(50, offset);
    setUsers(prev => [...prev, ...result.users]);
    setHasMore(result.hasMore);
    setOffset(prev => prev + 50);
    setIsLoading(false);
  }, [hasMore, isLoading, offset, getAllUsers]);

  const handleAddFriend = async (userId: string) => {
    await addFriend(userId);
  };

  return (
    <div className="user-browser">
      {/* Search Input */}
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* User List */}
      {isLoading && users.length === 0 ? (
        <div className="users-loading">
          <Loader2 className="spin" size={24} />
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="users-empty">
          <p>No users found</p>
        </div>
      ) : (
        <>
          <div className="users-grid">
            {users.map((user) => {
              const isAlreadyFriend = isFriend(user.id);

              return (
                <div key={user.id} className="user-card">
                  <Link to={`/profile/${user.id}`} className="user-info">
                    <Avatar avatar={user.avatar} size="medium" showBadge={false} />
                    <span className="user-name">{user.displayName}</span>
                  </Link>

                  <button
                    type="button"
                    className={`add-friend-button ${isAlreadyFriend ? 'added' : ''}`}
                    onClick={() => !isAlreadyFriend && handleAddFriend(user.id)}
                    disabled={isAlreadyFriend}
                  >
                    {isAlreadyFriend ? (
                      <>
                        <Check size={14} />
                        Added
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              className="load-more-button"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="spin" size={16} />
              ) : (
                'Load more'
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
