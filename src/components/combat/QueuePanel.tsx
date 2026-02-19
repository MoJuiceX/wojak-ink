/**
 * QueuePanel — select an NFT fighter, choose battle mode, and enter the combat queue.
 * Now supports 3 modes: manual, auto, agent.
 * Includes 2-minute timeout with AI sparring fallback.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { BattleModeSelector } from './BattleModeSelector';
import { useAgent } from '@/contexts/AgentContext';
import type { CombatType } from '@/lib/combat/types';

// Queue timeout: 2 minutes before offering AI sparring
const QUEUE_TIMEOUT_MS = 120000;

interface FighterSummary {
  nft_id: string;
  edition: number;
  type: CombatType;
  nature: string;
  ability: string;
  level: number;
  elo: number;
  imageUrl?: string;
}

interface QueuePanelProps {
  fighters: FighterSummary[];
  onQueue: (nftId: string, battleMode: 'manual' | 'auto' | 'agent') => Promise<void>;
  onLeaveQueue: (nftId: string) => Promise<void>;
  onFightAi?: (nftId: string) => Promise<void>;
  queueStatus: { status: string; position?: number; battleId?: number; opponent?: { nftId: string; elo: number } } | null;
  isLoading: boolean;
  onCreateAgent?: () => void;
}

export function QueuePanel({ fighters, onQueue, onLeaveQueue, onFightAi, queueStatus, isLoading, onCreateAgent }: QueuePanelProps) {
  const [selectedFighter, setSelectedFighter] = useState<string>(fighters[0]?.nft_id ?? '');
  const [battleMode, setBattleMode] = useState<'manual' | 'auto' | 'agent'>('auto');
  const { hasAgent } = useAgent();

  // Queue timeout state
  const [timeRemaining, setTimeRemaining] = useState(QUEUE_TIMEOUT_MS);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueStartRef = useRef<number | null>(null);

  const isQueued = queueStatus?.status === 'queued';
  const isMatched = queueStatus?.status === 'matched';

  // Start/stop timer based on queue status
  useEffect(() => {
    if (isQueued && !showAiPrompt) {
      // Start timer
      queueStartRef.current = Date.now();
      setTimeRemaining(QUEUE_TIMEOUT_MS);
      setShowAiPrompt(false);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (queueStartRef.current ?? Date.now());
        const remaining = Math.max(0, QUEUE_TIMEOUT_MS - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          // Timeout reached
          setShowAiPrompt(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 1000);
    } else if (!isQueued) {
      // Clear timer when not in queue
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setShowAiPrompt(false);
      setTimeRemaining(QUEUE_TIMEOUT_MS);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isQueued, showAiPrompt]);

  // Reset timer when matched
  useEffect(() => {
    if (isMatched) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setShowAiPrompt(false);
    }
  }, [isMatched]);

  const handleQueue = useCallback(async () => {
    if (!selectedFighter) return;
    setShowAiPrompt(false);
    await onQueue(selectedFighter, battleMode);
  }, [selectedFighter, battleMode, onQueue]);

  const handleLeave = useCallback(async () => {
    if (!selectedFighter) return;
    await onLeaveQueue(selectedFighter);
  }, [selectedFighter, onLeaveQueue]);

  const handleFightAi = useCallback(async () => {
    if (!selectedFighter || !onFightAi) return;
    // Leave queue first, then start AI battle
    await onLeaveQueue(selectedFighter);
    await onFightAi(selectedFighter);
  }, [selectedFighter, onFightAi, onLeaveQueue]);

  const handleKeepWaiting = useCallback(() => {
    // Reset timer for another 2 minutes
    setShowAiPrompt(false);
    queueStartRef.current = Date.now();
    setTimeRemaining(QUEUE_TIMEOUT_MS);
  }, []);

  // Format time as M:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (fighters.length === 0) {
    return (
      <div className="card-static p-6 flex flex-col items-center gap-3 text-center">
        <span style={{ fontSize: 40 }}>⚔️</span>
        <p className="font-semibold">No fighters ready</p>
        <p className="text-secondary text-sm">
          Mint a Wojak with combat moves in the Generator to start battling.
        </p>
        <Link to="/generator" className="btn btn-primary text-sm mt-1">
          Create a Fighter
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      <h3 className="font-semibold">Enter the Arena</h3>

      {/* Fighter selector */}
      <div className="flex flex-col gap-2">
        <label htmlFor="queue-fighter-select" className="text-xs text-secondary uppercase tracking-wider">Select Fighter</label>
        <select
          id="queue-fighter-select"
          className="input"
          value={selectedFighter}
          onChange={(e) => setSelectedFighter(e.target.value)}
          disabled={isQueued || isLoading}
        >
          {fighters.map((f) => (
            <option key={f.nft_id} value={f.nft_id}>
              #{f.edition} — {f.type} Lv.{f.level} (ELO {f.elo})
            </option>
          ))}
        </select>
      </div>

      {/* Battle mode -- 3-option pills */}
      <BattleModeSelector
        value={battleMode}
        onChange={setBattleMode}
        hasAgent={hasAgent}
        disabled={isQueued || isLoading}
        onCreateAgent={onCreateAgent}
      />

      {/* Queue action */}
      {!isQueued && !isMatched && (
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={handleQueue}
          disabled={isLoading || !selectedFighter || (battleMode === 'agent' && !hasAgent)}
        >
          {isLoading ? 'Joining...' : 'Join Queue'}
        </button>
      )}

      {/* Queue status — searching with countdown */}
      {isQueued && !showAiPrompt && (
        <div className="flex flex-col gap-2">
          <div className="queue-searching">
            <span className="queue-searching-dot" />
            <span className="queue-searching-dot" />
            <span className="queue-searching-dot" />
            <span className="text-secondary text-sm ml-2">
              Searching for opponent... ({formatTime(timeRemaining)})
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={handleLeave}
            disabled={isLoading}
          >
            Leave Queue
          </button>
        </div>
      )}

      {/* AI Sparring Prompt — shown when queue times out */}
      {isQueued && showAiPrompt && (
        <div className="flex flex-col gap-3">
          <div
            className="p-3 rounded-lg flex items-center gap-3"
            style={{ background: 'var(--color-white-5)' }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-cyan-15)',
                flexShrink: 0,
              }}
            >
              <Bot size={20} style={{ color: 'var(--color-cyan)' }} />
            </div>
            <div className="flex-1">
              <p className="font-medium" style={{ fontSize: 14 }}>
                No opponents found
              </p>
              <p className="text-secondary" style={{ fontSize: 12 }}>
                Fight an AI sparring partner instead?
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={handleFightAi}
              disabled={isLoading || !onFightAi}
            >
              <Bot size={16} />
              Fight AI
            </button>
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={handleKeepWaiting}
              disabled={isLoading}
            >
              Keep Waiting
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={handleLeave}
            disabled={isLoading}
          >
            Leave Queue
          </button>
        </div>
      )}

      {/* Matched — glow animation */}
      {isMatched && queueStatus?.battleId && (
        <div className="queue-match-found">
          <span className="text-accent font-semibold">
            Match found! Battle #{queueStatus.battleId}
          </span>
        </div>
      )}
    </div>
  );
}
