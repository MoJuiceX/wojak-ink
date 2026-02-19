// Shared game event formatting utilities.
// Used by LatestEventBanner and GameActivity page.

import { Swords, TrendingUp, Heart, Flame, Sparkles } from 'lucide-react';

export interface ActivityEvent {
  id: number;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

export const EVENT_ICONS: Record<string, typeof Swords> = {
  battle_won: Swords,
  battle_lost: Swords,
  battle_draw: Swords,
  battle_started: Swords,
  leaderboard_change: TrendingUp,
  vote_milestone: Heart,
  burn: Flame,
  mint: Sparkles,
  streak_milestone: Flame,
};

export const EVENT_LINKS: Record<string, string> = {
  battle_won: '/fight-club/battle',
  battle_lost: '/fight-club/battle',
  battle_draw: '/fight-club/battle',
  battle_started: '/fight-club/battle',
  leaderboard_change: '/fight-club/rankings',
  vote_milestone: '/fight-club/vote',
  burn: '/fight-club/vote',
  mint: '/generator',
  streak_milestone: '/fight-club/vote',
};

export function formatEvent(event: ActivityEvent): string {
  const data = event.eventData;
  switch (event.eventType) {
    case 'battle_won': return `Won battle! (${data.votes}-${data.opponentVotes} votes)`;
    case 'battle_lost': return `Lost battle (${data.votes}-${data.opponentVotes} votes)`;
    case 'battle_draw': return 'Battle ended in a draw';
    case 'battle_started': return 'Battle started!';
    case 'leaderboard_change': return `Moved to rank #${data.rank || '?'} on the leaderboard`;
    case 'vote_milestone':
      return data.milestone === 'first_vote'
        ? 'Cast your first vote!'
        : `Reached ${data.count || '?'} total votes`;
    case 'burn': return `Burned Wojak #${data.editionNumber || '?'} (+${Math.floor((data.creditsEarned as number || 0) / 100)} credits)`;
    case 'mint': return `Minted Wojak #${data.editionNumber || '?'}`;
    case 'streak_milestone': return `${data.days}-day vote streak! (+${Math.floor((data.credits as number || 0) / 100)} credits)`;
    default: return 'New activity';
  }
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
