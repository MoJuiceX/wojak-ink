// Latest Event Banner — slim banner showing most recent activity event.
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ActivityEvent } from '../../lib/gameEvents';
import { EVENT_ICONS, EVENT_LINKS, formatEvent, timeAgo } from '../../lib/gameEvents';

interface LatestEventBannerProps {
  did: string;
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
  const link = EVENT_LINKS[current.eventType] || '/fight-club/vote';

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
      <Link
        to="/fight-club/vote"
        className="text-accent"
        style={{ fontSize: 12, flexShrink: 0, textDecoration: 'none' }}
      >
        View all
      </Link>
      <button
        type="button"
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
