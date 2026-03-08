// Shared hook for /api/fight-club/my-score.
// Used by VotingStatsPanel, MobileStatsBar, and Rankings "Your Position" card.

import { useQuery } from '@tanstack/react-query';
import { useGame } from '@/contexts/GameContext';
import { API_ENDPOINTS } from '@/services/constants';

export interface MyScoreData {
    success: boolean;
    registered: boolean;
    did: string | null;
    ranked: boolean;
    rank: number | null;
    playerScore: number;
    eligibleWojakCount: number;
    totalWojakCount: number;
    bestWojakScore: number | null;
    pointsToNextRank: number | null;
    nextRank: number | null;
    meta: { mode: string };
}

export function useFightClubMyScore() {
    const { player } = useGame();

    return useQuery({
        queryKey: ['fight-club-my-score', player?.did],
        queryFn: async (): Promise<MyScoreData> => {
            const params = player?.did ? `?did=${encodeURIComponent(player.did)}` : '';
            const res = await fetch(`${API_ENDPOINTS.fightClubMyScore}${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!player,
        staleTime: 30000,
        retry: 2,
    });
}
