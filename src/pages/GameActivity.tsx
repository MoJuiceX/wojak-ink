// Activity Feed — /swipe/activity
// Chronological feed of all game events for the current player.

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GameProvider } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { useGame } from '@/contexts/GameContext';
import { PageSEO } from '@/components/seo';
import type { ActivityEvent } from '@/lib/gameEvents';
import { EVENT_ICONS, formatEvent, timeAgo } from '@/lib/gameEvents';

const PAGE_SIZE = 20;

function ActivityFeed() {
  const { player, isRegistered } = useGame();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchEvents = useCallback(async (offset: number, append: boolean) => {
    if (!player?.did) return;
    try {
      const res = await fetch(`/api/game/activity?did=${player.did}&limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      if (data.success) {
        const newEvents = data.events as ActivityEvent[];
        setEvents(prev => append ? [...prev, ...newEvents] : newEvents);
        setHasMore(newEvents.length === PAGE_SIZE);
        setError(false);
      } else {
        if (!append) setError(true);
      }
    } catch {
      if (!append) setError(true);
    }
  }, [player?.did]);

  useEffect(() => {
    if (!player?.did) return;
    setLoading(true);
    fetchEvents(0, false).finally(() => setLoading(false));
  }, [player?.did, fetchEvents]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchEvents(events.length, true);
    setLoadingMore(false);
  };

  if (!isRegistered) {
    return (
      <div className="card p-6 flex flex-col items-center gap-4" style={{ maxWidth: 400, margin: '40px auto' }}>
        <p className="text-secondary" style={{ textAlign: 'center' }}>
          Register to see your activity feed.
        </p>
        <Link to="/swipe" className="btn btn-primary">Go to Swipe</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4" style={{ maxWidth: 600, margin: '0 auto' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card-static p-4" style={{ height: 52, opacity: 0.4 + i * 0.1 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 flex flex-col items-center gap-4" style={{ maxWidth: 400, margin: '40px auto' }}>
        <p className="text-secondary">Couldn't load activity</p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setError(false);
            setLoading(true);
            fetchEvents(0, false).finally(() => setLoading(false));
          }}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card p-6 flex flex-col items-center gap-4" style={{ maxWidth: 400, margin: '40px auto' }}>
        <Sparkles size={32} className="text-muted" />
        <p className="text-secondary" style={{ textAlign: 'center' }}>
          No activity yet. Start voting!
        </p>
        <Link to="/swipe" className="btn btn-primary">Start Voting</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Your Activity</h2>
      {events.map(event => {
        const Icon = EVENT_ICONS[event.eventType] || Sparkles;
        return (
          <div
            key={event.id}
            className="card-static flex items-center gap-3"
            style={{ padding: '12px 14px' }}
          >
            <Icon size={16} className="text-accent" style={{ flexShrink: 0 }} />
            <span className="flex-1" style={{ fontSize: 14 }}>
              {formatEvent(event)}
            </span>
            <span className="text-muted" style={{ fontSize: 12, flexShrink: 0 }}>
              {timeAgo(event.createdAt)}
            </span>
          </div>
        );
      })}
      {hasMore && (
        <button
          className="btn btn-secondary"
          onClick={handleLoadMore}
          disabled={loadingMore}
          style={{ marginTop: 8 }}
        >
          {loadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

export default function GameActivity() {
  return (
    <GameProvider>
      <SwipeAutoRegister />
      <PageSEO
        title="Activity — Wojak Swipe"
        description="Your game activity feed"
        path="/swipe/activity"
        type="game"
      />
      <ActivityFeed />
    </GameProvider>
  );
}
