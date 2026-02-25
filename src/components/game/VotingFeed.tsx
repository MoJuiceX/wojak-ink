// Core voting orchestrator: card stack, vote handling, state transitions.
// All users can vote unlimited. Credits are awarded only to DAD + Plot holders (backend).
// Renders: skeleton | error | empty | card stack + buttons.

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const feedRef = useRef(feed);
  useEffect(() => { feedRef.current = feed; }, [feed]);

  // Track which card is exiting and in which direction
  const [exitingCard, setExitingCard] = useState<{ nftId: string; direction: 1 | -1 } | null>(null);

  // Milestone toasts
  useMilestoneToasts(player?.onboarding);

  // Session state
  const [voteCount, setVoteCount] = useState(0);
  const [_glazeCount, setGlazeCount] = useState(0);
  const [_fadeCount, setFadeCount] = useState(0);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [voteFeedbackType, setVoteFeedbackType] = useState<'glaze' | 'fade' | null>(null);

  // Load feed immediately
  const lastPlayerDid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const currentDid = player?.did ?? null;
    if (lastPlayerDid.current !== currentDid) {
      lastPlayerDid.current = currentDid;
      loadFeed().catch((err) => {
        console.error('[VotingFeed] Load error:', err);
        setFeedError(err?.message || 'Unknown error');
      });
    }
  }, [player?.did, loadFeed]);

  // Refetch when tab becomes visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadFeed().catch((err) => {
          console.error('[VotingFeed] Visibility reload error:', err);
          setFeedError(err?.message || 'Unknown error');
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadFeed]);

  // Clear safety timeout on unmount
  useEffect(() => {
    return () => {
      if (exitSafetyTimeoutRef.current) {
        clearTimeout(exitSafetyTimeoutRef.current);
        exitSafetyTimeoutRef.current = null;
      }
    };
  }, []);

  // Prefetch images for next 3 cards
  useEffect(() => {
    feed.slice(0, 3).forEach(item => {
      const img = new Image();
      img.src = item.thumbnailUri || item.imageUri;
    });
  }, [feed]);

  const triggerHaptics = useCallback((voteType: 1 | -1) => {
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
      if (result.error?.includes('hold')) return "You can't vote on Wojaks in your own DID.";
      if (result.error?.includes('own creations')) return "You can't vote on your own Wojaks.";
      return result.error || 'Vote not allowed';
    }
    return result.error || 'Vote failed to save';
  }, []);

  const handleExitComplete = useCallback(() => {
    if (exitSafetyTimeoutRef.current) {
      clearTimeout(exitSafetyTimeoutRef.current);
      exitSafetyTimeoutRef.current = null;
    }
    const pending = pendingVoteRef.current;
    pendingVoteRef.current = null;
    if (!pending) return;

    const { nftId, voteType, promise } = pending;

    // Remove card and clear exiting state together (React batches these)
    removeFromFeed(nftId);
    setExitingCard(null);

    // Refetch if running low - delay to allow new card's entrance transition to complete
    const currentFeedLength = feedRef.current.length;
    if (currentFeedLength <= 4) {
      setTimeout(() => {
        loadFeed().catch((err) => {
          console.error('[VotingFeed] Refetch error:', err);
          setFeedError(err?.message || 'Unknown error');
        });
      }, 400);
    }

    // Handle API result
    promise.then((result) => {
      if (!result.ok) {
        rollbackSessionCounts(voteType);
        toast.error(voteErrorMessage(result));
      }
    });
  }, [loadFeed, removeFromFeed, rollbackSessionCounts, toast, voteErrorMessage]);

  const handleVote = useCallback((voteType: 1 | -1) => {
    const currentItem = feedRef.current[0];
    if (!currentItem || exitingCard) return;

    const votedNftId = currentItem.nftId;

    // Start exit animation - card stays in array until animation completes
    setExitingCard({ nftId: votedNftId, direction: voteType });

    // Track counts
    setVoteCount(prev => prev + 1);
    if (voteType === 1) setGlazeCount(prev => prev + 1);
    else setFadeCount(prev => prev + 1);
    triggerHaptics(voteType);

    // Visual feedback
    setVoteFeedbackType(voteType === 1 ? 'glaze' : 'fade');
    setTimeout(() => setVoteFeedbackType(null), 450);

    // Fire API call
    const votePromise = castVote(currentItem.nftId, currentItem.editionNumber, voteType)
      .catch(() => ({ ok: false as const, error: 'Network error', status: 0 }));

    pendingVoteRef.current = { nftId: votedNftId, voteType, promise: votePromise };

    // Safety timeout for cleanup (in case onExitComplete doesn't fire)
    if (exitSafetyTimeoutRef.current) {
      clearTimeout(exitSafetyTimeoutRef.current);
    }
    exitSafetyTimeoutRef.current = setTimeout(() => {
      if (pendingVoteRef.current?.nftId === votedNftId) {
        handleExitComplete();
      }
    }, 800);
  }, [exitingCard, castVote, triggerHaptics, handleExitComplete]);

  const handleLike = useCallback(() => handleVote(1), [handleVote]);
  const handleDislike = useCallback(() => handleVote(-1), [handleVote]);

  const handleRetry = useCallback(() => {
    setFeedError(null);
    loadFeed().catch((err) => {
      console.error('[VotingFeed] Retry error:', err);
      setFeedError(err?.message || 'Unknown error');
    });
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
        <p className="text-muted text-xs text-center" style={{ maxWidth: 280, wordBreak: 'break-word' }}>
          Error: {feedError}
        </p>
        <button type="button" className="btn btn-primary" onClick={handleRetry}>Try Again</button>
      </div>
    );
  }

  // Feed empty
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
            ? `You've seen ${feedVotePassProgress?.seenCount ?? 0} / ${feedVotePassProgress?.totalCount ?? 0} eligible Wojaks. Come back as votes age out over the next 24 hours.`
            : "Once there are minted Wojaks from others, they'll show up here. You can always change your vote if you see one again."}
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
  // Separate exiting card from the stack so indices don't shift during exit
  const exitingItem = exitingCard ? feed.find(item => item.nftId === exitingCard.nftId) : null;
  const stackCards = exitingCard
    ? feed.filter(item => item.nftId !== exitingCard.nftId).slice(0, 3)
    : feed.slice(0, 3);
  const VERTICAL_GAP_PX = 12;

  return (
    <div
      className={`vote-feed-layout flex flex-col w-full${voteFeedbackType ? ` vote-feed-${voteFeedbackType}` : ''}`}
      style={{ gap: 0 }}
    >
      <div
        className="vote-card-stack"
        role="application"
        aria-label="Vote on Wojak NFTs. Swipe right to glaze, left to fade."
        style={{ marginBottom: VERTICAL_GAP_PX }}
      >
        {/* Render exiting card separately at the top (z-index 3) */}
        {exitingItem && exitingCard && (
          <SwipeCard
            key={exitingItem.nftId}
            nftId={exitingItem.nftId}
            name={exitingItem.customName || exitingItem.name}
            editionNumber={exitingItem.editionNumber}
            imageUrl={exitingItem.imageUri}
            thumbnailUri={exitingItem.thumbnailUri}
            onVote={handleVote}
            stackPosition={0}
            isFirst={false}
            reducedMotion={reducedMotion}
            exitDirection={exitingCard.direction}
            onExitComplete={handleExitComplete}
            likes={exitingItem.likes}
            dislikes={exitingItem.dislikes}
            totalVotes={exitingItem.totalVotes}
          />
        )}
        {/* Render stack cards - they keep stable indices during exit */}
        {stackCards.map((item, i) => (
          <SwipeCard
            key={item.nftId}
            nftId={item.nftId}
            name={item.customName || item.name}
            editionNumber={item.editionNumber}
            imageUrl={item.imageUri}
            thumbnailUri={item.thumbnailUri}
            onVote={handleVote}
            stackPosition={i as 0 | 1 | 2}
            isFirst={voteCount === 0 && i === 0 && !exitingCard}
            reducedMotion={reducedMotion}
            exitDirection={null}
            onExitComplete={undefined}
            likes={item.likes}
            dislikes={item.dislikes}
            totalVotes={item.totalVotes}
          />
        ))}
      </div>

      <div className="w-full vote-buttons-entrance">
        <VoteButtons
          onLike={handleLike}
          onDislike={handleDislike}
          disabled={!!exitingCard}
          feedbackType={voteFeedbackType}
        />
      </div>
    </div>
  );
}
