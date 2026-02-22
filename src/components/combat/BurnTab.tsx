/**
 * Burn Tab - Fight Club
 * Allows users to burn low-power Wojaks for credits.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, ExternalLink, AlertTriangle, Coins, Swords } from 'lucide-react';
import { useOptionalGame } from '@/contexts/GameContext';
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
function useBurnMutation(onSuccessOpenAssign?: () => void) {
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
      queryClient.invalidateQueries({ queryKey: ['burn-power-bonus'] });
      toast.success(data.message ?? 'Wojak burned! You earned 100 credits and +50 power to assign.');
      onSuccessOpenAssign?.();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// Unassigned +50 power count
function useBurnPowerBonus(did: string | null) {
  return useQuery({
    queryKey: ['burn-power-bonus', did],
    queryFn: async () => {
      if (!did) return { unassignedCount: 0 };
      const res = await fetch(`/api/combat/burn-power-bonus?did=${encodeURIComponent(did)}`);
      if (!res.ok) return { unassignedCount: 0 };
      const data = await res.json();
      return { unassignedCount: data.unassignedCount ?? 0 };
    },
    enabled: !!did,
    staleTime: 10000,
  });
}

// Player's collection (for assign picker)
interface CollectionNft {
  nftId: string;
  editionNumber: number;
  name: string;
  imageUri: string | null;
}
function useCollection(did: string | null) {
  return useQuery({
    queryKey: ['collection', did],
    queryFn: async () => {
      if (!did) return { nfts: [] as CollectionNft[] };
      const res = await fetch(`/api/game/collection?did=${encodeURIComponent(did)}`);
      if (!res.ok) throw new Error('Failed to load collection');
      const data = await res.json();
      return { nfts: (data.nfts ?? []).map((n: { nftId: string; editionNumber: number; name?: string; imageUri?: string | null }) => ({
        nftId: n.nftId,
        editionNumber: n.editionNumber,
        name: n.name ?? `Wojak #${n.editionNumber}`,
        imageUri: n.imageUri ?? null,
      })) };
    },
    enabled: !!did,
    staleTime: 30000,
  });
}

// Assign +50 power to an NFT
function useAssignPowerMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ did, nftId }: { did: string; nftId: string }) => {
      const res = await fetch('/api/combat/burn-assign-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, nftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['burn-power-bonus'] });
      queryClient.invalidateQueries({ queryKey: ['player-did'] });
      toast.success(data.message ?? '+50 power assigned.');
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
  const imageUrl = fighter.imageUri || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${fighter.nftId}.png`;
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
  canEarnCredits: _canEarnCredits,
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

        <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--color-primary-15)' }}>
          <Coins size={18} className="text-primary" />
          <span className="text-sm">
            You will earn <strong className="text-primary">100 credits</strong> and <strong className="text-primary">+50 power</strong> to assign to one of your Wojaks.
          </span>
        </div>

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

// Assign +50 power modal: pick one Wojak from collection
function AssignPowerModal({
  did,
  onClose,
  onAssigned,
}: {
  did: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { data: bonusData } = useBurnPowerBonus(did);
  const { data: collectionData, isLoading: collectionLoading } = useCollection(did);
  const assignMutation = useAssignPowerMutation();

  const unassignedCount = bonusData?.unassignedCount ?? 0;
  const nfts = collectionData?.nfts ?? [];

  const handleAssign = useCallback((nftId: string) => {
    assignMutation.mutate(
      { did, nftId },
      {
        onSuccess: () => {
          onAssigned();
          onClose();
        },
      }
    );
  }, [did, assignMutation, onAssigned, onClose]);

  if (unassignedCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="card p-6 max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ background: 'var(--color-primary-15)' }}>
              <Swords size={20} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Assign +50 Power</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="text-secondary text-sm mb-4">
          Choose a Wojak to give +50 power to. You have {unassignedCount} unassigned bonus{unassignedCount !== 1 ? 'es' : ''}.
        </p>
        {collectionLoading ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : nfts.length === 0 ? (
          <p className="text-muted text-sm py-4">You have no Wojaks in your collection.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto flex-1 min-h-0">
            {nfts.map((nft: CollectionNft) => (
              <button
                key={nft.nftId}
                type="button"
                className="card p-2 flex flex-col gap-1 text-left rounded-lg transition-all"
                style={{ borderWidth: 2, borderColor: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                onClick={() => handleAssign(nft.nftId)}
                disabled={assignMutation.isPending}
              >
                <div className="aspect-square rounded overflow-hidden" style={{ background: 'var(--color-black-50)' }}>
                  <img
                    src={nft.imageUri || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${nft.nftId}.png`}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-medium truncate">{nft.name}</span>
                <span className="text-xs text-muted">+50 power</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BurnTabProps {
  playerDid?: string;
}

export default function BurnTab({ playerDid: playerDidProp }: BurnTabProps) {
  const game = useOptionalGame();
  const player = game?.player ?? null;
  const { profile } = useUserProfile();

  // Use player from GameContext when inside Vote tab, else use DID passed from FightClub
  const effectiveDid = player?.did ?? playerDidProp ?? null;

  // State
  const [confirmFighter, setConfirmFighter] = useState<BurnableFighter | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Queries
  const { data: myData, isLoading: myLoading } = useBurnEligible(effectiveDid ?? undefined);
  const { data: allData, isLoading: allLoading } = useBurnEligible();
  const { data: bonusData } = useBurnPowerBonus(effectiveDid);

  // Burn mutation — after success open assign modal so user can assign +50 power
  const burnMutation = useBurnMutation(() => setShowAssignModal(true));

  const handleBurn = useCallback((fighter: BurnableFighter) => {
    setConfirmFighter(fighter);
  }, []);

  const confirmBurn = useCallback(async () => {
    if (!confirmFighter || !effectiveDid) return;

    try {
      await burnMutation.mutateAsync({
        nftId: confirmFighter.nftId,
        burnerDid: effectiveDid,
      });
      setConfirmFighter(null);
    } catch {
      // Error handled by mutation
    }
  }, [confirmFighter, effectiveDid, burnMutation]);

  // Determine if burner would earn credits (only others' NFTs are burnable now; API filters)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- depend on profile for wallet comparison
  const canEarnCredits = useCallback((fighter: BurnableFighter) => {
    if (!profile?.walletAddress) return true;
    return fighter.minterWallet !== profile.walletAddress;
  }, [profile]);

  // Filter marketplace to exclude user's own
  const marketplaceFighters = allData?.fighters?.filter(
    (f) => f.ownerDid !== effectiveDid
  ) ?? [];

  const isRegistered = !!effectiveDid;

  return (
    <div className="flex flex-col gap-8">
      {/* Section A: Worst Wojaks (Marketplace) — first so users see buy path */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Coins size={20} className="text-primary" />
          <h2 className="text-lg font-bold">Worst Wojaks (Marketplace)</h2>
        </div>

        <p className="text-secondary text-sm mb-4">
          Lowest Power (most downvoted) Wojaks — buy on MintGarden, then burn for 100 credits and +50 assignable power.
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

      {/* Section B: Your Burnable Wojaks (only when registered) */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Flame size={20} className="text-error" />
          <h2 className="text-lg font-bold">Your Burnable Wojaks</h2>
        </div>

        {!isRegistered ? (
          <div className="card-static p-6 text-center">
            <p className="text-secondary">
              Register in the Vote tab to burn and earn 100 credits + 50 assignable power.
            </p>
          </div>
        ) : myLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : myData?.fighters?.length === 0 ? (
          <div className="card-static p-6 text-center">
            <p className="text-secondary">
              None of your Wojaks (that you didn&apos;t create) are in the bottom 25% by Power.
            </p>
            <p className="text-muted text-sm mt-2">
              Threshold: {myData?.threshold ?? 0} Power. Only Wojaks you bought can be burned for rewards.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">
              Bottom 25% threshold: {myData?.threshold ?? 0} Power. Burn for 100 credits + 50 power (assign to one of your Wojaks).
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

      {/* Unassigned +50 power banner */}
      {isRegistered && (bonusData?.unassignedCount ?? 0) > 0 && (
        <div
          className="card-static p-4 flex flex-wrap items-center justify-between gap-3"
          style={{ background: 'var(--color-primary-15)', borderColor: 'var(--color-primary)' }}
        >
          <span className="text-sm">
            You have <strong className="text-primary">{bonusData!.unassignedCount} unassigned +50 power</strong>. Assign to one of your Wojaks to boost your Power Level.
          </span>
          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={() => setShowAssignModal(true)}
          >
            Assign +50 Power
          </button>
        </div>
      )}

      {/* Confirm Burn Modal */}
      {confirmFighter && (
        <ConfirmBurnModal
          fighter={confirmFighter}
          canEarnCredits={canEarnCredits(confirmFighter)}
          onConfirm={confirmBurn}
          onCancel={() => setConfirmFighter(null)}
          isLoading={burnMutation.isPending}
        />
      )}

      {/* Assign +50 Power Modal */}
      {showAssignModal && effectiveDid && (
        <AssignPowerModal
          did={effectiveDid}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {}}
        />
      )}
    </div>
  );
}
