/* eslint-disable react-refresh/only-export-components */
/**
 * BattleHistory — list of past battles with W/L/D, ELO changes.
 */

import { useState, useEffect } from 'react';

interface BattleRecord {
  id: number;
  result: 'win' | 'loss' | 'draw';
  opponent: string;
  eloChange: number;
  xpAwarded: number;
  turns: number;
  endedAt: string;
}

interface BattleHistoryProps {
  nftId: string;
  limit?: number;
  onSelectBattle?: (battleId: number) => void;
}

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const RESULT_STYLES: Record<string, { label: string; badgeClass: string }> = {
  win: { label: 'W', badgeClass: 'badge badge-success' },
  loss: { label: 'L', badgeClass: 'badge badge-error' },
  draw: { label: 'D', badgeClass: 'badge badge-cyan' },
};

export function BattleHistory({ nftId, limit = 20, onSelectBattle }: BattleHistoryProps) {
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/combat/history?nftId=${nftId}&limit=${limit}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!controller.signal.aborted) setBattles(data.battles ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[BattleHistory] Fetch error:', err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [nftId, limit]);

  if (isLoading) {
    return <div className="text-muted text-sm text-center py-4">Loading history...</div>;
  }

  if (battles.length === 0) {
    return (
      <div className="card-static p-4 text-center">
        <p className="text-muted text-sm">No battles yet. Join the queue to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {battles.map((b) => {
        const style = RESULT_STYLES[b.result] ?? RESULT_STYLES.draw;
        const eloSign = b.eloChange >= 0 ? '+' : '';
        return (
          <button
            key={b.id}
            type="button"
            className="card p-3 flex items-center gap-3 w-full text-left"
            onClick={() => onSelectBattle?.(b.id)}
          >
            <span className={style.badgeClass}>{style.label}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">vs {b.opponent}</div>
              <div className="text-xs text-muted">
                {b.turns} turns &middot; {relativeTime(b.endedAt)}
              </div>
            </div>
            <div className="flex flex-col items-end text-xs">
              <span className={b.eloChange >= 0 ? 'text-success' : 'text-error'}>
                {eloSign}{b.eloChange} ELO
              </span>
              <span className="text-muted">+{b.xpAwarded} XP</span>
            </div>
            <span className="text-xs text-accent" aria-label="Watch replay">
              &#9654;
            </span>
          </button>
        );
      })}
    </div>
  );
}
