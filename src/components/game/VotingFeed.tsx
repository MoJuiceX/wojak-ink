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
  const [glazeCount, setGlazeCount] = useState(0);
  const [fadeCount, setFadeCount] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<string | null>(null);

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
  const lastPlayerDid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const currentDid = player?.did ?? null;
    // Reload if: first load OR player changed (login/logout)
    if (lastPlayerDid.current !== currentDid) {
      lastPlayerDid.current = currentDid;
      loadFeed().catch(() => setFeedError(true));
    }
  }, [player?.did, loadFeed]);

  // Refetch when tab becomes visible so feed stays fresh
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadFeed().catch(() => setFeedError(true));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadFeed]);

  // Prefetch images for next 3 cards (prefer CDN thumbnail when available)
  useEffect(() => {
    feed.slice(0, 3).forEach(item => {
      const img = new Image();
      img.src = item.thumbnailUri || item.imageUri;
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

    // Track session vote count + type
    const newVoteCount = voteCount + 1;
    setVoteCount(newVoteCount);
    if (voteType === 1) setGlazeCount(prev => prev + 1);
    else setFadeCount(prev => prev + 1);

    // Vote feedback flash
    setVoteFeedback(voteType === 1 ? 'Glaze recorded ✓' : 'Fade recorded ✓');
    setTimeout(() => setVoteFeedback(null), 1200);

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

  // Feed empty — only when there are no minted Wojaks (or none you can vote on, e.g. all yours)
  if (feed.length === 0) {
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">&#128064;</span>
        <h2 className="text-lg font-semibold">No Wojaks to vote on yet</h2>
        <p className="text-secondary text-sm text-center">
          Once there are minted Wojaks from others, they’ll show up here. You can always change your vote if you see one again.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
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
              thumbnailUri={item.thumbnailUri}
              onVote={handleVote}
              stackPosition={i as 0 | 1 | 2}
              isFirst={voteCount === 0 && i === 0}
              reducedMotion={reducedMotion}
              exitDirection={i === 0 ? exitDirection : null}
              likes={item.likes}
              dislikes={item.dislikes}
              totalVotes={item.totalVotes}
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

      {/* Vote feedback flash */}
      {voteFeedback && (
        <div className="vote-feedback-flash" key={voteFeedback + voteCount}>
          {voteFeedback}
        </div>
      )}

      {/* Session stats strip */}
      {voteCount > 0 && (
        <div className="session-stats-strip">
          <span>Votes: {voteCount}</span>
          <span className="text-success">Glazes: {glazeCount}</span>
          <span className="text-error">Fades: {fadeCount}</span>
        </div>
      )}

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
