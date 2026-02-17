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
  battle_result: Swords,
  leaderboard_change: TrendingUp,
  vote_milestone: Heart,
  burn: Flame,
  mint: Sparkles,
};

const EVENT_LINKS: Record<string, string> = {
  battle_result: '/your-wojak/battles',
  leaderboard_change: '/leaderboard',
  vote_milestone: '/your-wojak',
  burn: '/your-wojak/dashboard',
  mint: '/generator',
};

function formatEvent(event: ActivityEvent): string {
  const data = event.eventData;
  switch (event.eventType) {
    case 'battle_result': return `Battle ${data.won ? 'won' : 'lost'} against ${data.opponent || 'opponent'}`;
    case 'leaderboard_change': return `Moved to rank #${data.rank || '?'} on the leaderboard`;
    case 'vote_milestone': return `Reached ${data.count || '?'} total votes`;
    case 'burn': return `Burned Wojak #${data.editionNumber || '?'}`;
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
  const link = EVENT_LINKS[current.eventType] || '/your-wojak/dashboard';

  return (
    <div className="flex flex-col gap-1">
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
      <div className="flex justify-end">
        <Link to="/your-wojak/activity" className="text-accent" style={{ fontSize: 12 }}>
          View all activity &rarr;
        </Link>
      </div>
    </div>
  );
}
