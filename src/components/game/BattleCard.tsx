import { useState, useEffect } from 'react';

interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  votes: number;
}

interface BattleCardProps {
  battleId: number;
  nftA: BattleNft;
  nftB: BattleNft;
  endsAt: string;
  status: string;
  winner?: string | null;
  hasVoted: boolean;
  onVote?: (battleId: number, votedFor: 'a' | 'b') => void;
}

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Ended');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${hours}h ${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return remaining;
}

export function BattleCard({
  battleId, nftA, nftB, endsAt, status, winner, hasVoted, onVote,
}: BattleCardProps) {
  const countdown = useCountdown(endsAt);
  const totalVotes = nftA.votes + nftB.votes;
  const pctA = totalVotes > 0 ? Math.round((nftA.votes / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;
  const isActive = status === 'active';

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      {/* Timer */}
      <div className="flex items-center justify-between">
        <span className="badge badge-cyan">{isActive ? countdown : status}</span>
        <span className="text-xs text-muted">#{battleId}</span>
      </div>

      {/* Side-by-side NFTs */}
      <div className="flex gap-4">
        {/* NFT A */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="battle-nft-image">
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${nftA.id}.png`}
              alt={nftA.name}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
          <p className="text-sm font-semibold text-center">{nftA.name}</p>
          <span className="text-xs text-secondary">#{nftA.edition}</span>
          {isActive && !hasVoted && onVote && (
            <button
              className="btn btn-primary w-full text-sm"
              onClick={() => onVote(battleId, 'a')}
            >
              Vote A
            </button>
          )}
          {(hasVoted || !isActive) && (
            <div className="text-center">
              <span className="text-lg font-bold">{nftA.votes}</span>
              <span className="text-xs text-secondary ml-1">({pctA}%)</span>
            </div>
          )}
          {winner === nftA.id && (
            <span className="badge badge-success">Winner</span>
          )}
        </div>

        {/* VS divider */}
        <div className="flex items-center">
          <span className="text-xl font-bold text-muted">VS</span>
        </div>

        {/* NFT B */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="battle-nft-image">
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${nftB.id}.png`}
              alt={nftB.name}
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
          <p className="text-sm font-semibold text-center">{nftB.name}</p>
          <span className="text-xs text-secondary">#{nftB.edition}</span>
          {isActive && !hasVoted && onVote && (
            <button
              className="btn btn-primary w-full text-sm"
              onClick={() => onVote(battleId, 'b')}
            >
              Vote B
            </button>
          )}
          {(hasVoted || !isActive) && (
            <div className="text-center">
              <span className="text-lg font-bold">{nftB.votes}</span>
              <span className="text-xs text-secondary ml-1">({pctB}%)</span>
            </div>
          )}
          {winner === nftB.id && (
            <span className="badge badge-success">Winner</span>
          )}
        </div>
      </div>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div className="battle-vote-bar">
          <div className="battle-vote-fill-a" style={{ width: `${pctA}%` }} />
        </div>
      )}

      {hasVoted && isActive && (
        <p className="text-xs text-secondary text-center">You voted in this battle</p>
      )}
    </div>
  );
}
