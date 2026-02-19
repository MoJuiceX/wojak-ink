/**
 * Burn Tab - Fight Club
 * Allows users to burn low-power Wojaks for credits.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, ExternalLink, AlertTriangle, Coins, Swords } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useToast } from '@/contexts/ToastContext';

interface BurnableFighter {
  nftId: string;
  editionNumber: number;
  ownerDid: string;
  ownerName: string | null;
  powerScore: number;
  votePower: number;
  battlePower: number;
  combatType: string;
  wins: number;
  losses: number;
  minterWallet: string | null;
  minterDid: string | null;
  imageUri: string | null;
  customName: string | null;
}

interface BurnEligibleResponse {
  success: boolean;
  threshold: number;
  total: number;
  fighters: BurnableFighter[];
}

// Fetch burnable Wojaks
function useBurnEligible(ownerDid?: string) {
  return useQuery({
    queryKey: ['burn-eligible', ownerDid],
    queryFn: async () => {
      const url = ownerDid
        ? `/api/combat/burn-eligible?ownerDid=${encodeURIComponent(ownerDid)}`
        : '/api/combat/burn-eligible';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch burnable Wojaks');
      return res.json() as Promise<BurnEligibleResponse>;
    },
    staleTime: 30000,
  });
}

// Burn mutation
function useBurnMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ nftId, burnerDid }: { nftId: string; burnerDid: string }) => {
      const res = await fetch('/api/combat/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId, burnerDid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Burn failed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['burn-eligible'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      toast.success(data.message);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Single fighter card
function BurnCard({
  fighter,
  isOwner,
  canEarnCredits,
  onBurn,
  isBurning,
}: {
  fighter: BurnableFighter;
  isOwner: boolean;
  canEarnCredits: boolean;
  onBurn: () => void;
  isBurning: boolean;
}) {
  const imageUrl = fighter.imageUri || `https://assets.mintgarden.io/thumbnails/medium/${fighter.nftId}.png`;
  const name = fighter.customName || `Wojak #${fighter.editionNumber}`;
  const mintGardenUrl = `https://mintgarden.io/nfts/${fighter.nftId}`;

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Image */}
      <div
        className="w-full aspect-square rounded-lg overflow-hidden"
        style={{ background: 'var(--color-black-50)' }}
      >
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Name + Edition */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm truncate">{name}</span>
        <span className={`badge badge-${fighter.combatType.toLowerCase()}`}>
          {fighter.combatType}
        </span>
      </div>

      {/* Power Score */}
      <div className="flex items-center gap-2">
        <Swords size={14} className="text-muted" />
        <span
          className="font-bold"
          style={{ color: fighter.powerScore < 0 ? 'var(--color-error)' : 'var(--color-text)' }}
        >
          {fighter.powerScore} Power
        </span>
      </div>

      {/* Vote + Battle breakdown */}
      <div className="flex items-center gap-4 text-xs text-secondary">
        <span>Votes: {fighter.votePower}</span>
        <span>Battle: {fighter.battlePower}</span>
      </div>

      {/* Record */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-success">W: {fighter.wins}</span>
        <span className="text-error">L: {fighter.losses}</span>
      </div>

      {/* Owner name (for marketplace) */}
      {!isOwner && fighter.ownerName && (
        <div className="text-xs text-muted">
          Owner: {fighter.ownerName}
        </div>
      )}

      {/* Action */}
      {isOwner ? (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2 text-xs">
            <Coins size={14} className={canEarnCredits ? 'text-primary' : 'text-muted'} />
            <span className={canEarnCredits ? 'text-primary font-medium' : 'text-muted'}>
              {canEarnCredits ? 'Earn 100 credits' : 'No reward (you minted this)'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary flex items-center justify-center gap-2"
            onClick={onBurn}
            disabled={isBurning}
          >
            <Flame size={16} />
            {isBurning ? 'Burning...' : 'Burn'}
          </button>
        </div>
      ) : (
        <a
          href={mintGardenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary flex items-center justify-center gap-2 mt-2"
        >
          Buy on MintGarden
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

// Confirm modal
function ConfirmBurnModal({
  fighter,
  canEarnCredits,
  onConfirm,
  onCancel,
  isLoading,
}: {
  fighter: BurnableFighter;
  canEarnCredits: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const name = fighter.customName || `Wojak #${fighter.editionNumber}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onCancel}
    >
      <div
        className="card p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full" style={{ background: 'var(--color-error-15)' }}>
            <AlertTriangle size={24} className="text-error" />
          </div>
          <h2 className="text-xl font-bold">Confirm Burn</h2>
        </div>

        <p className="text-secondary mb-4">
          Are you sure you want to burn <strong>{name}</strong>?
          This action cannot be undone.
        </p>

        {canEarnCredits && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--color-primary-15)' }}>
            <Coins size={18} className="text-primary" />
            <span className="text-sm">You will earn <strong className="text-primary">100 credits</strong></span>
          </div>
        )}

        {!canEarnCredits && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--color-white-5)' }}>
            <Coins size={18} className="text-muted" />
            <span className="text-sm text-secondary">No credits (you minted this Wojak)</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-ghost flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Flame size={16} />
            {isLoading ? 'Burning...' : 'Burn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BurnTab() {
  const { player } = useGame();
  const { profile } = useUserProfile();

  // State
  const [confirmFighter, setConfirmFighter] = useState<BurnableFighter | null>(null);

  // Queries
  const { data: myData, isLoading: myLoading } = useBurnEligible(player?.did);
  const { data: allData, isLoading: allLoading } = useBurnEligible();

  // Burn mutation
  const burnMutation = useBurnMutation();

  const handleBurn = useCallback((fighter: BurnableFighter) => {
    setConfirmFighter(fighter);
  }, []);

  const confirmBurn = useCallback(async () => {
    if (!confirmFighter || !player?.did) return;

    try {
      await burnMutation.mutateAsync({
        nftId: confirmFighter.nftId,
        burnerDid: player.did,
      });
      setConfirmFighter(null);
    } catch {
      // Error handled by mutation
    }
  }, [confirmFighter, player?.did, burnMutation]);

  // Determine if burner would earn credits
  const canEarnCredits = useCallback((fighter: BurnableFighter) => {
    if (!profile?.walletAddress) return true;
    return fighter.minterWallet !== profile.walletAddress;
  }, [profile?.walletAddress]);

  // Filter marketplace to exclude user's own
  const marketplaceFighters = allData?.fighters?.filter(
    (f) => f.ownerDid !== player?.did
  ) ?? [];

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="p-4 rounded-full" style={{ background: 'var(--color-error-15)' }}>
          <Flame size={32} className="text-error" />
        </div>
        <h2 className="text-xl font-bold">Not Registered</h2>
        <p className="text-secondary text-center max-w-md">
          Register with the Vote tab first to access burn features.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section A: Your Burnable Wojaks */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Flame size={20} className="text-error" />
          <h2 className="text-lg font-bold">Your Burnable Wojaks</h2>
        </div>

        {myLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : myData?.fighters?.length === 0 ? (
          <div className="card-static p-6 text-center">
            <p className="text-secondary">
              None of your Wojaks are in the bottom 25% by Power.
            </p>
            <p className="text-muted text-sm mt-2">
              Threshold: {myData?.threshold ?? 0} Power
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">
              Bottom 25% threshold: {myData?.threshold ?? 0} Power
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {myData?.fighters?.map((fighter) => (
                <BurnCard
                  key={fighter.nftId}
                  fighter={fighter}
                  isOwner={true}
                  canEarnCredits={canEarnCredits(fighter)}
                  onBurn={() => handleBurn(fighter)}
                  isBurning={burnMutation.isPending && confirmFighter?.nftId === fighter.nftId}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Section B: Burn Marketplace */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Coins size={20} className="text-primary" />
          <h2 className="text-lg font-bold">Burn Marketplace</h2>
        </div>

        <p className="text-secondary text-sm mb-4">
          Buy cheap Wojaks from other players, then burn them for 100 credits.
        </p>

        {allLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : marketplaceFighters.length === 0 ? (
          <div className="card-static p-6 text-center">
            <p className="text-secondary">
              No burnable Wojaks available from other players.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {marketplaceFighters.map((fighter) => (
              <BurnCard
                key={fighter.nftId}
                fighter={fighter}
                isOwner={false}
                canEarnCredits={true}
                onBurn={() => {}}
                isBurning={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Confirm Modal */}
      {confirmFighter && (
        <ConfirmBurnModal
          fighter={confirmFighter}
          canEarnCredits={canEarnCredits(confirmFighter)}
          onConfirm={confirmBurn}
          onCancel={() => setConfirmFighter(null)}
          isLoading={burnMutation.isPending}
        />
      )}
    </div>
  );
}
