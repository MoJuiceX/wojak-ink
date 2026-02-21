// Core voting orchestrator: card stack, vote handling, state transitions.
// All users can vote unlimited. Credits are awarded only to DAD + Plot holders (backend).
// Renders: skeleton | error | empty | card stack + buttons.

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/contexts/ToastContext';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { SwipeCard } from './SwipeCard';
import { VoteButtons } from './VoteButtons';
import { VoteCardSkeleton } from './VoteCardSkeleton';

// When feed is empty, poll this often to pick up new mints
const REFETCH_WHEN_EMPTY_MS = 3 * 60 * 1000; // 3 minutes

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

export function VotingFeed() {
  const {
    player,
    feed, feedLoading, loadFeed,
    castVote,
    removeFromFeed,
  } = useGame();
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();

  // Milestone toasts
  useMilestoneToasts(player?.onboarding);

  // Session state
  const [voteCount, setVoteCount] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);

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

  // Load feed immediately (no gate)
  // Track player DID to reload when login/logout changes
  const lastPlayerDid = useRef<string | null>(null);
  useEffect(() => {
    const currentDid = player?.did ?? null;
    // Reload if: first load OR player changed (login/logout)
    if (lastPlayerDid.current !== currentDid) {
      lastPlayerDid.current = currentDid;
      loadFeed().catch(() => setFeedError(true));
    }
  }, [player?.did, loadFeed]);

  // Refetch when tab becomes visible so new mints show up without manual refresh
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadFeed().catch(() => setFeedError(true));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadFeed]);

  // When feed is empty ("All Caught Up"), poll periodically so new mints appear
  useEffect(() => {
    if (feed.length > 0 || feedLoading) return;
    const t = setInterval(() => {
      loadFeed().catch(() => setFeedError(true));
    }, REFETCH_WHEN_EMPTY_MS);
    return () => clearInterval(t);
  }, [feed.length, feedLoading, loadFeed]);

  // Prefetch images for next 3 cards
  useEffect(() => {
    feed.slice(0, 3).forEach(item => {
      const img = new Image();
      img.src = item.imageUri;
    });
  }, [feed]);

  // Helper to mark instructions seen (persists to localStorage)
  const markInstructionsSeen = useCallback(() => {
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
  }, []);

  const handleVote = useCallback((voteType: 1 | -1) => {
    const currentItem = feed[0];
    if (!currentItem || cardExiting) return;

    const votedNftId = currentItem.nftId;
    setCardExiting(true);
    setExitDirection(voteType); // Set direction for exit animation (only top card has stackPosition 0)

    // Track session vote count
    const newVoteCount = voteCount + 1;
    setVoteCount(newVoteCount);

    // Mark instructions seen after 3 votes
    if (newVoteCount >= 3 && !instructionsSeen) {
      markInstructionsSeen();
    }

    // Fire vote to API (do not remove from feed here — wait for exit animation)
    castVote(currentItem.nftId, currentItem.editionNumber, voteType)
      .then(ok => { if (!ok) toast.error('Vote failed to save'); })
      .catch(() => toast.error('Vote failed to save'));

    // After exit animation finishes: remove voted card from feed, then clear state and refill
    const EXIT_MS = 220;
    setTimeout(() => {
      removeFromFeed(votedNftId);
      setCardExiting(false);
      setExitDirection(null);

      if (feed.length <= 3) {
        loadFeed().catch(() => setFeedError(true));
      }
    }, EXIT_MS);
  }, [feed, cardExiting, castVote, loadFeed, removeFromFeed, toast, voteCount, instructionsSeen, markInstructionsSeen]);

  const handleRetry = useCallback(() => {
    setFeedError(false);
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

  // Feed empty — all Wojaks on 24h cooldown
  if (feed.length === 0) {
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">&#9203;</span>
        <h2 className="text-lg font-semibold">All Caught Up!</h2>
        <p className="text-secondary text-sm text-center">
          Each Wojak you vote on is hidden for <strong>24 hours</strong>. New mints from others will appear here automatically—we'll check every few minutes, or when you return to this tab.
          {voteCount > 0 && (
            <><br /><span className="text-muted">You've voted on {voteCount} Wojak{voteCount !== 1 ? 's' : ''} this session.</span></>
          )}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            className="btn btn-primary text-sm"
            style={{ padding: '8px 20px' }}
            onClick={() => loadFeed().catch(() => setFeedError(true))}
            disabled={feedLoading}
          >
            {feedLoading ? 'Checking…' : 'Check for new Wojaks'}
          </button>
          <Link to="/fight-club/rankings" className="btn btn-secondary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
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
    <div className="flex flex-col gap-4 w-full">
      {/* Card stack */}
      <div
        className="vote-card-stack"
        role="application"
        aria-label="Vote on Wojak NFTs. Swipe right to glaze, left to fade."
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
              exitDirection={i === 0 ? exitDirection : null}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Vote buttons */}
      <div className="w-full">
        <VoteButtons
          onLike={() => handleVote(1)}
          onDislike={() => handleVote(-1)}
          disabled={cardExiting}
        />
      </div>

      {/* Instruction text */}
      {!instructionsSeen && (
        <div
          className="text-muted text-center w-full"
          style={{
            fontSize: 13,
            transition: 'opacity 500ms ease',
            opacity: voteCount >= 3 ? 0 : 1,
          }}
        >
          <p>Swipe right to glaze &middot; Swipe left to fade</p>
          {showKeyboardHint && (
            <p style={{ marginTop: 2 }}>or use &larr; &rarr; arrow keys</p>
          )}
        </div>
      )}
    </div>
  );
}
