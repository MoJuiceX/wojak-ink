// Core voting orchestrator: card stack, vote handling, state transitions.
// Supports three tiers: Guest (5/day), Connected (5/day), Holder (20/day).
// Renders: free tier banner | skeleton | error | summary | empty | card stack + buttons.

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/contexts/ToastContext';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { SwipeCard } from './SwipeCard';
import { VoteButtons } from './VoteButtons';
import { VoteCardSkeleton } from './VoteCardSkeleton';
import { PostRoundSummary } from './PostRoundSummary';

// Constants
const DAILY_LIMIT_HOLDER = 20;

// Milestone toast hook — fires when onboarding milestones complete during session
const MILESTONE_INFO: Record<string, { label: string; credits: number }> = {
  voted: { label: 'First Vote!', credits: 2 },
  minted: { label: 'First Mint!', credits: 5 },
  battled: { label: 'First Battle!', credits: 3 },
};

function useMilestoneToasts(onboarding: { voted: boolean; minted: boolean; battled: boolean } | undefined) {
  const toast = useToast();
  const prev = useRef(onboarding);

  useEffect(() => {
    if (!onboarding || !prev.current) {
      prev.current = onboarding;
      return;
    }

    for (const [key, info] of Object.entries(MILESTONE_INFO)) {
      const k = key as keyof typeof MILESTONE_INFO;
      if (onboarding[k as keyof typeof onboarding] && !prev.current[k as keyof typeof onboarding]) {
        toast.success(`+${info.credits} credits`, {
          title: `\uD83C\uDFAF ${info.label}`,
          duration: 3000,
        });
      }
    }

    prev.current = onboarding;
  }, [onboarding, toast]);
}

interface LastVote {
  nftId: string;
  editionNumber: number;
  name: string;
  customName: string | null;
  imageUri: string;
  voteType: 1 | -1;
}

export function VotingFeed() {
  const {
    player,
    feed, feedLoading, loadFeed,
    castVote, refreshPowerLevel,
    votesRemaining, dailyLimit, isHolder,
  } = useGame();
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();

  // Milestone toasts (only for holders)
  useMilestoneToasts(player?.onboarding);

  // Session state
  const [sessionLikes, setSessionLikes] = useState(0);
  const [sessionDislikes, setSessionDislikes] = useState(0);
  const [lastVote, setLastVote] = useState<LastVote | null>(null);
  const [undoUsed, setUndoUsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const powerLevelBefore = useRef(0);

  // Instruction text visibility
  const [instructionsSeen, setInstructionsSeen] = useState(() => {
    try {
      return !!localStorage.getItem('wojak_vote_instructions_seen');
    } catch {
      return false;
    }
  });

  // Desktop keyboard hint (shown once per device)
  const [showKeyboardHint, setShowKeyboardHint] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const isDesktop = window.matchMedia('(hover: hover)').matches;
      return isDesktop && !localStorage.getItem('wojak_vote_kb_hint_seen');
    } catch {
      return false;
    }
  });

  // Snapshot power level at session start for delta (holders only)
  useEffect(() => {
    if (player && powerLevelBefore.current === 0) {
      powerLevelBefore.current = player.powerLevel;
    }
  }, [player]);

  // Load feed immediately (no gate)
  const feedAttempted = useRef(false);
  useEffect(() => {
    if (!feedAttempted.current) {
      feedAttempted.current = true;
      loadFeed().catch(() => setFeedError(true));
    }
  }, [loadFeed]);

  // Prefetch images for next 3 cards
  useEffect(() => {
    feed.slice(0, 3).forEach(item => {
      const img = new Image();
      img.src = item.imageUri;
    });
  }, [feed]);

  // Mark instructions seen after 3 votes
  useEffect(() => {
    if (voteCount >= 3 && !instructionsSeen) {
      setInstructionsSeen(true);
      setShowKeyboardHint(false);
      try {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            localStorage.setItem('wojak_vote_instructions_seen', '1');
            localStorage.setItem('wojak_vote_kb_hint_seen', '1');
          });
        } else {
          localStorage.setItem('wojak_vote_instructions_seen', '1');
          localStorage.setItem('wojak_vote_kb_hint_seen', '1');
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [voteCount, instructionsSeen]);

  const handleVote = useCallback((voteType: 1 | -1) => {
    const currentItem = feed[0];
    if (!currentItem || cardExiting) return;

    // Check if out of votes
    if (votesRemaining <= 0) {
      toast.error(`Daily limit reached (${dailyLimit} votes)`);
      return;
    }

    setCardExiting(true);

    // Track session stats
    setLastVote({
      nftId: currentItem.nftId,
      editionNumber: currentItem.editionNumber,
      name: currentItem.name,
      customName: currentItem.customName,
      imageUri: currentItem.imageUri,
      voteType,
    });
    setVoteCount(prev => prev + 1);
    if (voteType === 1) setSessionLikes(prev => prev + 1);
    else setSessionDislikes(prev => prev + 1);

    // Optimistic fire-and-forget with error feedback
    castVote(currentItem.nftId, currentItem.editionNumber, voteType)
      .then(ok => { if (!ok) toast.error('Vote failed to save'); })
      .catch(() => toast.error('Vote failed to save'));

    // Small delay for exit animation, then advance
    setTimeout(() => {
      setCardExiting(false);

      // Refill when running low
      if (feed.length <= 3) {
        loadFeed().catch(() => setFeedError(true));
      }

      // Check for round complete (all votes used)
      if (votesRemaining <= 1) {
        setTimeout(() => {
          if (isHolder) refreshPowerLevel();
          setShowSummary(true);
        }, 200);
      }
    }, 250);
  }, [feed, cardExiting, castVote, loadFeed, votesRemaining, dailyLimit, isHolder, refreshPowerLevel, toast]);

  const handleUndo = useCallback(() => {
    if (!lastVote || undoUsed) return;
    setUndoUsed(true);
    // UI-only undo: decrement session counter
    if (lastVote.voteType === 1) setSessionLikes(prev => Math.max(0, prev - 1));
    else setSessionDislikes(prev => Math.max(0, prev - 1));
    setVoteCount(prev => Math.max(0, prev - 1));
    setLastVote(null);
  }, [lastVote, undoUsed]);

  const handleRetry = useCallback(() => {
    setFeedError(false);
    feedAttempted.current = false;
    loadFeed().catch(() => setFeedError(true));
  }, [loadFeed]);

  // Loading
  if (feedLoading && feed.length === 0) {
    return <VoteCardSkeleton />;
  }

  // Error
  if (feedError && feed.length === 0) {
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">&#9888;&#65039;</span>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-secondary text-sm text-center">
          Couldn't load the next Wojak. Check your connection and try again.
        </p>
        <button type="button" className="btn btn-primary" onClick={handleRetry}>Try Again</button>
      </div>
    );
  }

  // Post-round summary
  if (showSummary) {
    return (
      <PostRoundSummary
        likes={sessionLikes}
        dislikes={sessionDislikes}
        powerLevel={player?.powerLevel ?? 0}
        // eslint-disable-next-line react-hooks/rules-of-hooks
        powerLevelDelta={isHolder ? (player?.powerLevel ?? 0) - powerLevelBefore.current : 0}
        voteStreak={isHolder ? player?.voteStreak : undefined}
        isHolder={isHolder}
      />
    );
  }

  // Feed empty — all Wojaks on 24h cooldown
  if (feed.length === 0) {
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">&#9203;</span>
        <h2 className="text-lg font-semibold">All Caught Up!</h2>
        <p className="text-secondary text-sm text-center">
          New Wojaks will appear as cooldowns expire.
          {voteCount > 0 && (
            <><br /><span className="text-muted">You've voted on {voteCount} Wojak{voteCount !== 1 ? 's' : ''} today.</span></>
          )}
        </p>
        <div className="flex gap-3">
          <Link to="/fight-club/rankings" className="btn btn-primary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
            View Leaderboard
          </Link>
          <Link to="/generator" className="btn btn-secondary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
            Mint a Wojak
          </Link>
        </div>
      </div>
    );
  }

  // Active voting
  const visibleCards = feed.slice(0, 3);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Free tier banner for non-holders */}
      {!isHolder && (
        <div
          className="card-static p-3 flex items-center gap-3 w-full"
          style={{ borderLeft: '3px solid var(--color-primary)' }}
        >
          <span className="text-sm text-secondary">
            <strong className="text-primary">{votesRemaining}</strong> free vote{votesRemaining !== 1 ? 's' : ''} remaining today.
            {' '}
            <Link to="/fight-club" className="text-primary underline">
              Get a Farmers Plot
            </Link>
            {' '}for {DAILY_LIMIT_HOLDER} votes/day + Power rewards.
          </span>
        </div>
      )}

      {/* Card stack */}
      <div
        className="vote-card-stack"
        role="application"
        aria-label="Vote on Wojak NFTs. Swipe right to like, left to dislike."
      >
        <AnimatePresence mode="popLayout">
          {visibleCards.map((item, i) => (
            <SwipeCard
              key={item.nftId}
              nftId={item.nftId}
              name={item.customName || item.name}
              editionNumber={item.editionNumber}
              imageUrl={item.imageUri}
              onVote={handleVote}
              stackPosition={i as 0 | 1 | 2}
              isFirst={voteCount === 0 && i === 0}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Vote buttons */}
      <VoteButtons
        onLike={() => handleVote(1)}
        onDislike={() => handleVote(-1)}
        onUndo={handleUndo}
        undoAvailable={!!lastVote && !undoUsed}
        disabled={cardExiting || votesRemaining <= 0}
      />

      {/* Instruction text */}
      {!instructionsSeen && (
        <div
          className="text-muted text-center"
          style={{
            fontSize: 13,
            transition: 'opacity 500ms ease',
            opacity: voteCount >= 3 ? 0 : 1,
          }}
        >
          <p>Swipe right to like &middot; Swipe left to dislike</p>
          {showKeyboardHint && (
            <p style={{ marginTop: 2 }}>or use &larr; &rarr; arrow keys</p>
          )}
        </div>
      )}
    </div>
  );
}
