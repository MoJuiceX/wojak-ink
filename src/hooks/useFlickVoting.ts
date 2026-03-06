/**
 * Hook for flick voting with backend integration
 *
 * Uses generic targetId and pageType to support voting on any page:
 * - Games page: pageType='games', targetId=gameId
 * - Gallery page: pageType='gallery', targetId=nftId
 * - Media page: pageType='media', targetId=mediaId
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/clerkSafe';

// Page types for voting - extend this as you add more pages
export type VotePageType = 'games' | 'gallery' | 'media' | 'shop';

interface VotePosition {
  id: string;
  xPercent: number;
  yPercent: number;
  targetId: string;
  emoji: 'donut' | 'poop';
  createdAt: number;
}

interface VoteCounts {
  donuts: number;
  poops: number;
}

interface VoteStore {
  [targetId: string]: VoteCounts;
}

const API_BASE = '/api/votes';

function cacheKey(pageType: string) {
  return `wojak_votes_${pageType}`;
}

export function useFlickVoting(pageType: VotePageType) {
  const [activeMode, setActiveMode] = useState<'donut' | 'poop' | null>(null);
  const [votes, setVotes] = useState<VoteStore>({});
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const fetchVoteCounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/counts?pageType=${pageType}`);
      if (response.ok) {
        const data = await response.json();
        const counts = data.counts || {};
        setVotes(counts);
        // Write-through to localStorage for offline fallback
        try {
          localStorage.setItem(cacheKey(pageType), JSON.stringify(counts));
        } catch {
          // Ignore quota errors
        }
      }
    } catch (error) {
      console.error('Failed to fetch vote counts:', error);
      // Fallback to localStorage cache
      try {
        const stored = localStorage.getItem(cacheKey(pageType));
        if (stored) setVotes(JSON.parse(stored));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [pageType]);

  // Load vote counts on mount
  useEffect(() => {
    fetchVoteCounts();
  }, [fetchVoteCounts, pageType]);

  const getVotes = useCallback((targetId: string): VoteCounts => {
    return votes[targetId] || { donuts: 0, poops: 0 };
  }, [votes]);

  // Add a vote with position data
  const addVote = useCallback(async (
    targetId: string,
    type: 'donut' | 'poop',
    xPercent: number,
    yPercent: number
  ): Promise<{ success: boolean; newBalance?: number }> => {
    // Optimistic update for vote counts (what's displayed on items)
    setVotes(prev => {
      const current = prev[targetId] || { donuts: 0, poops: 0 };
      return {
        ...prev,
        [targetId]: {
          ...current,
          [type === 'donut' ? 'donuts' : 'poops']:
            current[type === 'donut' ? 'donuts' : 'poops'] + 1,
        },
      };
    });

    // Revert helper for failed votes
    const revertVote = () => {
      setVotes(prev => {
        const current = prev[targetId] || { donuts: 0, poops: 0 };
        const key = type === 'donut' ? 'donuts' : 'poops';
        return {
          ...prev,
          [targetId]: {
            ...current,
            [key]: Math.max(0, current[key] - 1),
          },
        };
      });
    };

    // Send to backend with auth
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token for voting');
        revertVote();
        return { success: false };
      }

      const response = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetId,
          pageType,
          emoji: type,
          xPercent: Math.round(xPercent * 100) / 100,
          yPercent: Math.round(yPercent * 100) / 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, newBalance: data.newBalance };
      } else {
        const error = await response.json();
        console.error('Vote failed:', error);
        revertVote();
        return { success: false };
      }
    } catch (error) {
      console.error('Failed to save vote:', error);
      revertVote();
      return { success: false };
    }
  }, [pageType, getToken]);

  // Fetch votes with positions for heatmap
  const fetchVotesForHeatmap = useCallback(async (
    type: 'donut' | 'poop'
  ): Promise<VotePosition[]> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/positions?pageType=${pageType}&emoji=${type}&limit=200`);
      if (response.ok) {
        const data = await response.json();
        return data.votes || [];
      }
    } catch (error) {
      console.error('Failed to fetch heatmap votes:', error);
    } finally {
      setIsLoading(false);
    }
    return [];
  }, [pageType]);

  return {
    activeMode,
    setActiveMode,
    getVotes,
    addVote,
    fetchVotesForHeatmap,
    isLoading,
  };
}
