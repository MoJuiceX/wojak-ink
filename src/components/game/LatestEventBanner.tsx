// Latest Event Banner — slim banner showing most recent activity event.
import { useState, useEffect, useCallback } from 'react';
import { Swords, TrendingUp, Heart, Flame, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActivityEvent {
  id: number;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

interface LatestEventBannerProps {
  did: string;
}

const EVENT_ICONS: Record<string, typeof Swords> = {
  battle_won: Swords,
  battle_lost: Swords,
  battle_draw: Swords,
  battle_started: Swords,
  leaderboard_change: TrendingUp,
  vote_milestone: Heart,
  burn: Flame,
  mint: Sparkles,
};

const EVENT_LINKS: Record<string, string> = {
  battle_won: '/swipe/battles',
  battle_lost: '/swipe/battles',
  battle_draw: '/swipe/battles',
  battle_started: '/swipe/battles',
  leaderboard_change: '/swipe/leaderboard',
  vote_milestone: '/swipe',
  burn: '/swipe/dashboard',
  mint: '/generator',
};

function formatEvent(event: ActivityEvent): string {
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
    default: return 'New activity';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LatestEventBanner({ did }: LatestEventBannerProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [dismissedIndex, setDismissedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game/activity?did=${did}&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setEvents(data.events);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [did]);

  const handleDismiss = useCallback(() => {
    setDismissedIndex(prev => prev + 1);
  }, []);

  const current = events[dismissedIndex];
  if (!current) return null;

  const Icon = EVENT_ICONS[current.eventType] || Sparkles;
  const link = EVENT_LINKS[current.eventType] || '/swipe/dashboard';

  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
      }}
    >
      <Icon size={16} className="text-accent" style={{ flexShrink: 0 }} />
      <Link
        to={link}
        className="text-secondary flex-1"
        style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {formatEvent(current)}
      </Link>
      <span className="text-muted" style={{ fontSize: 12, flexShrink: 0 }}>
        {timeAgo(current.createdAt)}
      </span>
      <button
        onClick={handleDismiss}
        className="btn btn-ghost"
        style={{ padding: 2, minWidth: 'auto' }}
        aria-label="Dismiss event"
      >
        <X size={16} className="text-muted" />
      </button>
    </div>
  );
}
