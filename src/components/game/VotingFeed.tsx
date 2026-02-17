import { useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { SwipeCard } from './SwipeCard';

export function VotingFeed() {
  const { player, isVerified, feed, feedLoading, loadFeed, castVote } = useGame();

  useEffect(() => {
    if (isVerified) {
      loadFeed();
    }
  }, [isVerified, loadFeed]);

  if (!player) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Connect Your Wallet</h2>
        <p className="text-secondary">Connect your Sage wallet with a DID to start voting.</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Phase 1 NFT Required</h2>
        <p className="text-secondary">
          You need at least 1 Wojak Farmers Plot NFT assigned to your DID to vote.
        </p>
      </div>
    );
  }

  if (player.votesRemaining <= 0) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Votes Used Up!</h2>
        <p className="text-secondary">
          You've used all 10 votes today. Come back tomorrow!
        </p>
        <div className="badge badge-cyan">{player.votesToday}/10 votes cast</div>
      </div>
    );
  }

  if (feedLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-secondary">Loading feed...</div>
      </div>
    );
  }

  const currentItem = feed[0];

  if (!currentItem) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">All Caught Up!</h2>
        <p className="text-secondary">
          You've seen all available Wojaks. Check back later for new mints!
        </p>
      </div>
    );
  }

  const handleVote = async (voteType: 1 | -1) => {
    await castVote(currentItem.nftId, currentItem.editionNumber, voteType);
    // Feed auto-updates (castVote removes voted item)
    // Load more if running low
    if (feed.length <= 3) {
      loadFeed();
    }
  };

  return (
    <div className="voting-feed flex flex-col items-center gap-4">
      {/* Votes remaining badge */}
      <div className="flex items-center gap-2">
        <span className="badge">{player.votesRemaining} votes left today</span>
      </div>

      {/* Swipe card */}
      <SwipeCard
        key={currentItem.nftId}
        nftId={currentItem.nftId}
        name={currentItem.name}
        imageUrl={`https://assets.mintgarden.io/thumbnails/medium/${currentItem.nftId}.png`}
        editionNumber={currentItem.editionNumber}
        onVote={handleVote}
      />

      {/* Instructions */}
      <p className="text-muted text-sm">
        Swipe right to like · Swipe left to dislike
      </p>
    </div>
  );
}
