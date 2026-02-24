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
    feedVotePassProgress,
    castVote,
    removeFromFeed,
  } = useGame();
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const pendingVoteRef = useRef<{ nftId: string; voteType: 1 | -1; promise: Promise<{ ok: boolean; error?: string; status?: number }> } | null>(null);
  const exitSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Milestone toasts
  useMilestoneToasts(player?.onboarding);

  // Session state
  const [voteCount, setVoteCount] = useState(0);
  const [_glazeCount, setGlazeCount] = useState(0);
  const [_fadeCount, setFadeCount] = useState(0);
  const [feedError, setFeedError] = useState(false);
  const [cardExiting, setCardExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);
  const [voteFeedbackType, setVoteFeedbackType] = useState<'glaze' | 'fade' | null>(null);
  const [_optimisticSeenCount, setOptimisticSeenCount] = useState<number | null>(null);


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

  // Clear safety timeout on unmount so we only run cleanup once
  useEffect(() => {
    return () => {
      if (exitSafetyTimeoutRef.current) {
        clearTimeout(exitSafetyTimeoutRef.current);
        exitSafetyTimeoutRef.current = null;
      }
    };
  }, []);

  // Prefetch images for next 3 cards (prefer CDN thumbnail when available)
  useEffect(() => {
    feed.slice(0, 3).forEach(item => {
      const img = new Image();
      img.src = item.thumbnailUri || item.imageUri;
    });
  }, [feed]);


  useEffect(() => {
    setOptimisticSeenCount(null);
  }, [feedVotePassProgress?.seenCount, feedVotePassProgress?.totalCount, feedVotePassProgress?.passComplete]);

  const triggerHaptics = useCallback((voteType: 1 | -1) => {
    // Progressive enhancement only (Android browsers commonly support vibrate; iOS Safari does not).
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(voteType === 1 ? 12 : [8, 10, 8]);
  }, []);

  const rollbackSessionCounts = useCallback((voteType: 1 | -1) => {
    setVoteCount(prev => Math.max(0, prev - 1));
    if (voteType === 1) setGlazeCount(prev => Math.max(0, prev - 1));
    else setFadeCount(prev => Math.max(0, prev - 1));
  }, []);

  const voteErrorMessage = useCallback((result: { ok: boolean; error?: string; status?: number }) => {
    if (result.ok) return '';
    if (result.status === 429) return 'You are voting too fast. Wait a few seconds and continue.';
    if (result.status === 403) {
      if (result.error?.includes('hold')) return 'You can’t vote on Wojaks in your own DID.';
      if (result.error?.includes('own creations')) return 'You can’t vote on your own Wojaks.';
      return result.error || 'Vote not allowed';
    }
    return result.error || 'Vote failed to save';
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
    triggerHaptics(voteType);

    // Brief visual feedback only (no text toast/flash to avoid layout shift)
    setVoteFeedbackType(voteType === 1 ? 'glaze' : 'fade');
    setTimeout(() => {
      setVoteFeedbackType(null);
    }, 450);

    let votePromise: Promise<{ ok: boolean; error?: string; status?: number }>;
    try {
      votePromise = castVote(currentItem.nftId, currentItem.editionNumber, voteType)
        .catch(() => ({ ok: false as const, error: 'Network error', status: 0 }));
    } catch {
      rollbackSessionCounts(voteType);
      setCardExiting(false);
      setExitDirection(null);
      toast.error('Vote failed. Try again.');
      pendingVoteRef.current = null;
      return;
    }

    pendingVoteRef.current = { nftId: votedNftId, voteType, promise: votePromise };

    // Safety timeout: if onAnimationComplete never fires, unblock UI after a short delay
    if (exitSafetyTimeoutRef.current) {
      clearTimeout(exitSafetyTimeoutRef.current);
      exitSafetyTimeoutRef.current = null;
    }
    exitSafetyTimeoutRef.current = setTimeout(() => {
      const pending = pendingVoteRef.current;
      if (!pending) return;
      pendingVoteRef.current = null;
      exitSafetyTimeoutRef.current = null;
      removeFromFeed(pending.nftId);
      setCardExiting(false);
      setExitDirection(null);
      pending.promise.then((result) => {
        if (!result.ok) {
          rollbackSessionCounts(pending.voteType);
          toast.error(voteErrorMessage(result));
        }
      });
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs from context; full deps would recreate callback every render
  }, [feed, cardExiting, castVote, loadFeed, removeFromFeed, toast, voteCount, triggerHaptics, rollbackSessionCounts, voteErrorMessage, feedVotePassProgress]);

  const handleExitComplete = useCallback(() => {
    if (exitSafetyTimeoutRef.current) {
      clearTimeout(exitSafetyTimeoutRef.current);
      exitSafetyTimeoutRef.current = null;
    }
    const pending = pendingVoteRef.current;
    pendingVoteRef.current = null;
    if (!pending) return;

    const { nftId: votedNftId, voteType, promise } = pending;
    const currentFeedLength = feed.length;

    // Optimistic: remove card and clear state immediately so next card promotes without waiting for API
    removeFromFeed(votedNftId);
    setCardExiting(false);
    setExitDirection(null);
    setOptimisticSeenCount(prev => {
      const progress = feedVotePassProgress;
      if (!progress?.enabled || progress.passComplete || progress.totalCount <= 0) return prev;
      const base = prev ?? progress.seenCount;
      return Math.min(progress.totalCount, base + 1);
    });
    if (currentFeedLength <= 3) {
      loadFeed().catch(() => setFeedError(true));
    }

    // Handle vote result in background; rollback counts + toast only on error
    promise.then((result) => {
      if (!result.ok) {
        rollbackSessionCounts(voteType);
        toast.error(voteErrorMessage(result));
      }
    });
  }, [
    feed.length,
    feedVotePassProgress,
    loadFeed,
    removeFromFeed,
    rollbackSessionCounts,
    toast,
    voteErrorMessage,
  ]);

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
    const passLocked = !!feedVotePassProgress?.enabled && !!feedVotePassProgress?.passLocked && (feedVotePassProgress.totalCount ?? 0) > 0;
    return (
      <div className="card-static flex flex-col items-center justify-center gap-4 p-8" style={{ minHeight: 300 }}>
        <span className="text-2xl">{passLocked ? '✅' : '\u{1F440}'}</span>
        <h2 className="text-lg font-semibold">
          {passLocked ? '24h vote pass complete' : 'No Wojaks to vote on yet'}
        </h2>
        <p className="text-secondary text-sm text-center">
          {passLocked
            ? `You’ve seen ${feedVotePassProgress?.seenCount ?? 0} / ${feedVotePassProgress?.totalCount ?? 0} eligible Wojaks. Come back as votes age out over the next 24 hours.`
            : 'Once there are minted Wojaks from others, they’ll show up here. You can always change your vote if you see one again.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/fight-club/rankings" className="btn btn-primary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
            View Leaderboard
          </Link>
          {!passLocked && (
            <Link to="/generator" className="btn btn-secondary text-sm" style={{ padding: '8px 20px', textDecoration: 'none' }}>
              Mint a Wojak
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Active voting
  const visibleCards = feed.slice(0, 3);

  /* Same as tab→picture; use marginBottom on card so no other CSS can add gap */
  const VERTICAL_GAP_PX = 6;
  return (
    <div
      className={`vote-feed-layout flex flex-col w-full${voteFeedbackType ? ` vote-feed-${voteFeedbackType}` : ''}`}
      style={{ gap: 0 }}
    >
      {/* Card stack — marginBottom is the only space above the buttons */}
      <div
        className="vote-card-stack vote-card-entrance"
        role="application"
        aria-label="Vote on Wojak NFTs. Swipe right to glaze, left to fade."
        style={{ marginBottom: VERTICAL_GAP_PX }}
      >
        <AnimatePresence mode="wait" initial={false}>
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
              onExitComplete={i === 0 ? handleExitComplete : undefined}
              likes={item.likes}
              dislikes={item.dislikes}
              totalVotes={item.totalVotes}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Vote buttons — visible without scrolling, same gap as above */}
      <div className="w-full vote-buttons-entrance">
        <VoteButtons
          onLike={() => handleVote(1)}
          onDislike={() => handleVote(-1)}
          disabled={cardExiting}
          feedbackType={voteFeedbackType}
        />
      </div>
    </div>
  );
}
