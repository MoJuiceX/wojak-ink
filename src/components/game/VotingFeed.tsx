// Core voting orchestrator: card stack, vote handling, state transitions.
// Renders: gate checklist | skeleton | error | summary | empty | card stack + buttons.

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useSageWallet } from '@/sage-wallet';
import { useToast } from '@/contexts/ToastContext';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { SwipeCard } from './SwipeCard';
import { VoteButtons } from './VoteButtons';
import { VoteCardSkeleton } from './VoteCardSkeleton';
import { GateChecklist } from './GateChecklist';
import { PostRoundSummary } from './PostRoundSummary';

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
    player, isRegistered, isVerified,
    feed, feedLoading, loadFeed,
    castVote, refreshPowerLevel, register, verifyPhase1,
  } = useGame();
  const { address, status: walletStatus } = useSageWallet();
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();

  // Milestone toasts
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

  // Gate animation state — always show checklist, transition after progressive reveal
  const walletConnected = walletStatus === 'connected' && !!address;
  const hasDid = isRegistered;
  const hasPhase1 = isVerified;
  const [gateAnimDone, setGateAnimDone] = useState(false);

  // Reset gate animation if any condition becomes false
  useEffect(() => {
    if (!walletConnected || !hasDid || !hasPhase1) {
      setGateAnimDone(false);
    }
  }, [walletConnected, hasDid, hasPhase1]);

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

  // Snapshot power level at session start for delta
  useEffect(() => {
    if (player && powerLevelBefore.current === 0) {
      powerLevelBefore.current = player.powerLevel;
    }
  }, [player]);

  // Load feed once when gate animation completes
  const feedAttempted = useRef(false);
  useEffect(() => {
    if (gateAnimDone && !feedAttempted.current) {
      feedAttempted.current = true;
      loadFeed().catch(() => setFeedError(true));
    }
  }, [gateAnimDone, loadFeed]);

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

      // Check for round complete (10th vote)
      if (player && player.votesRemaining <= 1) {
        setTimeout(() => {
          refreshPowerLevel();
          setShowSummary(true);
        }, 200);
      }
    }, 250);
  }, [feed, cardExiting, castVote, loadFeed, player, refreshPowerLevel]);

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

  if (!gateAnimDone) {
    return (
      <GateChecklist
        walletConnected={walletConnected}
        hasDid={hasDid}
        hasPhase1={hasPhase1}
        onLinkDid={async (did) => { if (address) await register(did, address); }}
        onAutoVerify={async () => { if (player?.did) return verifyPhase1(player.did); return false; }}
        onVerifyNft={async (nftId) => { if (player?.did) return verifyPhase1(player.did, nftId); return false; }}
        onAllComplete={() => setGateAnimDone(true)}
      />
    );
  }

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
        <button className="btn btn-primary" onClick={handleRetry}>Try Again</button>
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
        // eslint-disable-next-line react-hooks/refs
        powerLevelDelta={(player?.powerLevel ?? 0) - powerLevelBefore.current}
        voteStreak={player?.voteStreak}
      />
    );
  }

  // Feed empty
  if (feed.length === 0) {
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">&#10024;</span>
        <h2 className="text-lg font-semibold">No Wojaks to Vote On</h2>
        <p className="text-secondary text-sm text-center">
          You've seen them all, or only your own Wojaks exist so far.
          <br />
          Invite others to mint &mdash; or check back later!
        </p>
        <a href="/generator" className="btn btn-primary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
          Mint a Wojak &rarr;
        </a>
      </div>
    );
  }

  // Active voting
  const visibleCards = feed.slice(0, 3);

  return (
    <div className="flex flex-col items-center gap-4">
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
        disabled={cardExiting}
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
