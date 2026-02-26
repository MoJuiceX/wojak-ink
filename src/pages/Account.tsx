/**
 * Account Page (Premium Redesign)
 *
 * Mobile-first premium dashboard with integrated wallet/streak in header,
 * horizontal NFT scroll, compact stats, and expanded social widgets.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignedOut, SignInButton, useClerk, useAuth } from '@clerk/clerk-react';
import { LogOut, Settings, RefreshCw, KeyRound, User, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';

import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSageWallet } from '@/sage-wallet';
import { useLayout } from '@/hooks/useLayout';

import { ProfileHeader } from '@/components/Account/ProfileHeader';
import { GameScoresGrid } from '@/components/Account/GameScoresGrid';
import { NftGallery } from '@/components/Account/NftGallery';
import { FriendsWidget } from '@/components/Account/FriendsWidget';
import { AchievementsWidget } from '@/components/Account/AchievementsWidget';
import { FriendsLightbox } from '@/components/Account/FriendsLightbox';
import { AchievementsLightbox } from '@/components/Account/AchievementsLightbox';
import { PageTransition } from '@/components/layout/PageTransition';
import { DrawerEditor } from '@/components/Shop/DrawerEditor';
import { GiftModal } from '@/components/Account/GiftModal';
import type { InventoryItem } from '@/components/Account/InventorySection';

import '@/components/Account/Account.css';
import { PageSEO } from '@/components/seo';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

export default function Account() {
  const { contentPadding } = useLayout();
  const navigate = useNavigate();
  const clerk = useClerk();

  // Get user ID and token from Clerk for fetching scores
  // Always call useAuth() to comply with rules of hooks
  const authResult = useAuth();
  const userId = CLERK_ENABLED ? authResult.userId : null;
  const getToken = useMemo(
    () => (CLERK_ENABLED ? authResult.getToken : async () => null),
    [authResult.getToken]
  );

  const {
    profile,
    effectiveDisplayName,
    isSignedIn,
    updateAvatar,
  } = useUserProfile();

  const { currency } = useCurrency();

  const {
    status: walletStatus,
    address: walletAddress,
    getNFTs,
  } = useSageWallet();

  const toast = useToast();
  const queryClient = useQueryClient();

  // Get current user's DID from /api/game/me (Clerk-linked) — primary when signed in
  const { data: meData } = useQuery({
    queryKey: ['game-me'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch('/api/game/me', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
    enabled: !!isSignedIn,
    staleTime: 300000,
  });

  // Fallback: DID from wallet lookup (when wallet connected but me might not have DID yet)
  const { data: walletPlayerDid } = useQuery({
    queryKey: ['player-did', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/game/player?wallet=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.player?.did as string | null;
    },
    enabled: !!walletAddress,
    staleTime: 300000,
  });

  const playerDid = (meData?.player?.did as string | undefined) ?? walletPlayerDid ?? null;

  // DID refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Link DID form (when user has no linked DID yet)
  const [didInput, setDidInput] = useState('');
  const [didWalletInput, setDidWalletInput] = useState('');
  const [linkingDid, setLinkingDid] = useState(false);
  const [didLinkError, setDidLinkError] = useState<string | null>(null);

  // Display name (DID profile name) for Account page
  const [displayName, setDisplayName] = useState<string>('');
  const [displayNameSource, setDisplayNameSource] = useState<string | null>(null);
  const [displayNameEditing, setDisplayNameEditing] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const handleLinkDid = useCallback(async () => {
    const did = didInput.trim();
    if (!did || linkingDid) return;
    if (!/^did:chia:1[a-z0-9]{58}$/.test(did)) {
      setDidLinkError('Enter a valid Chia DID (e.g. did:chia:1...)');
      return;
    }
    setDidLinkError(null);
    setLinkingDid(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/game/link-did', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ did, walletAddress: didWalletInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDidLinkError(data.error || 'Failed to link DID');
        return;
      }
      toast.success('DID linked to your account');
      setDidInput('');
      setDidWalletInput('');
      await queryClient.invalidateQueries({ queryKey: ['game-me'] });
      await queryClient.invalidateQueries({ queryKey: ['player-did'] });
    } catch {
      setDidLinkError('Network error');
    } finally {
      setLinkingDid(false);
    }
  }, [didInput, didWalletInput, linkingDid, getToken, toast, queryClient]);

  const handleRefreshDid = useCallback(async () => {
    if (!playerDid || refreshing) return;
    setRefreshing(true);

    try {
      const res = await fetch('/api/profile/refresh-did', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: playerDid }),
      });

      const data = await res.json();

      if (res.status === 429) {
        toast.error(data.error || 'Please wait between refreshes');
      } else if (!res.ok) {
        toast.error(data.error || 'Refresh failed');
      } else {
        toast.success(`Synced! Found ${data.nftsFound} NFTs`);
      }
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [playerDid, refreshing, toast]);

  const handleSaveDisplayName = useCallback(async () => {
    const name = displayNameInput.trim();
    if (!playerDid || !name || displayNameSaving) return;
    if (name.length < 2 || name.length > 20) {
      setDisplayNameError('Name must be 2–20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 '\-._]+$/.test(name)) {
      setDisplayNameError('Only letters, numbers, spaces, and basic punctuation');
      return;
    }
    setDisplayNameError(null);
    setDisplayNameSaving(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/profile/display-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ did: playerDid, name, source: 'custom' }),
      });
      const data = await res.json();
      if (res.ok) {
        setDisplayName(data.displayName ?? name);
        setDisplayNameSource('custom');
        setDisplayNameEditing(false);
        toast.success('Name saved');
      } else {
        setDisplayNameError(data.error || 'Failed to save');
      }
    } catch {
      setDisplayNameError('Network error');
    } finally {
      setDisplayNameSaving(false);
    }
  }, [playerDid, displayNameInput, displayNameSaving, getToken, toast]);

  // Voting consumables - fetch from API
  const [votingCounts, setVotingCounts] = useState({ donuts: 0, poops: 0 });

  // Fetch consumables on mount and when user changes
  useEffect(() => {
    const fetchConsumables = async () => {
      if (!isSignedIn) {
        setVotingCounts({ donuts: 0, poops: 0 });
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch('/api/shop/consumables', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setVotingCounts({ donuts: data.donuts || 0, poops: data.poops || 0 });
        }
      } catch (err) {
        console.error('[Account] Failed to fetch consumables:', err);
      }
    };

    fetchConsumables();
  }, [isSignedIn, getToken]);

  // Fetch DID display name when playerDid is available
  useEffect(() => {
    if (!playerDid) {
      setDisplayName('');
      setDisplayNameSource(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/profile/display-name?did=${encodeURIComponent(playerDid)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setDisplayName(data.displayName || '');
          setDisplayNameSource(data.source || null);
          setDisplayNameInput(data.displayName || '');
        }
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [playerDid]);

  // Drawer editor state
  const [isDrawerEditorOpen, setIsDrawerEditorOpen] = useState(false);

  // Lightbox states
  const [showFriendsLightbox, setShowFriendsLightbox] = useState(false);
  const [friendsLightboxTab, setFriendsLightboxTab] = useState<'friends' | 'find'>('friends');
  const [showAchievementsLightbox, setShowAchievementsLightbox] = useState(false);

  // Gift modal state
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response items passed to InventorySection
  const [selectedGiftItem, setSelectedGiftItem] = useState<any>(null);

  // Inventory items from shop
  const [, setInventoryItems] = useState<InventoryItem[]>([]);
  const [, setEquippedItems] = useState<{
    frame_id: string | null;
    title_id: string | null;
    name_effect_id: string | null;
    background_id: string | null;
    celebration_id: string | null;
  }>({
    frame_id: null,
    title_id: null,
    name_effect_id: null,
    background_id: null,
    celebration_id: null,
  });

  // Fetch inventory when signed in (using unified /api/inventory endpoint)
  useEffect(() => {
    const fetchInventory = async () => {
      if (!isSignedIn) {
        setInventoryItems([]);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch('/api/inventory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEquippedItems(data.equipped || {
            frame_id: null,
            title_id: null,
            name_effect_id: null,
            background_id: null,
            celebration_id: null,
          });
          // Flatten categories into items array
          const allItems: InventoryItem[] = [];
          if (data.categories) {
            for (const category of Object.keys(data.categories)) {
              allItems.push(...data.categories[category]);
            }
          }
          setInventoryItems(allItems);
        }
      } catch (err) {
        console.error('[Account] Failed to fetch inventory:', err);
      }
    };

    fetchInventory();
  }, [isSignedIn, getToken]);

  // Track owned NFT IDs
  const [ownedNftIds, setOwnedNftIds] = useState<string[]>([]);

  // Fetch NFTs when wallet connects
  useEffect(() => {
    const fetchNfts = async () => {
      if (walletStatus !== 'connected' || !walletAddress) {
        setOwnedNftIds([]);
        return;
      }

      try {
        const nfts = await getNFTs(WOJAK_COLLECTION_ID);
        // Extract NFT IDs from the fetched NFTs
        const ids = nfts.map((nft: { name?: string; id?: string }) => {
          // Extract the NFT number from the name or ID
          const match = nft.name?.match(/\d+/) || nft.id?.match(/\d+/);
          return match ? match[0] : nft.id;
        }).filter((id): id is string => Boolean(id));
        setOwnedNftIds(ids);
      } catch (error) {
        console.error('[Account] Failed to fetch NFTs:', error);
      }
    };

    fetchNfts();
  }, [walletStatus, walletAddress, getNFTs]);

  const handleSignOut = async () => {
    if (CLERK_ENABLED && clerk) {
      await clerk.signOut();
      navigate('/');
    }
  };

  const handleSelectNft = async (nftId: string) => {
    const { getNftImageUrl } = await import('@/services/constants');
    await updateAvatar({
      type: 'nft',
      value: getNftImageUrl(nftId),
      source: 'wallet',
      nftId,
    });
  };

  // Not signed in state
  if (!CLERK_ENABLED || !isSignedIn) {
    return (
      <PageTransition>
        <div style={{ padding: contentPadding }}>
          <div className="account-signin-prompt">
            <h1>Account</h1>
            <p>Sign in to view your account dashboard</p>
            {CLERK_ENABLED && (
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="signin-button">Sign In with Google</button>
                </SignInButton>
              </SignedOut>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <PageSEO
        title="Account"
        description="Manage your Wojak.ink account, settings, and minting history on Chia blockchain."
        path="/account"
      />
      <div
        style={{ padding: contentPadding }}
        className="account-page"
      >
        <motion.div
          className="account-dashboard account-dashboard--premium"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {/* 1. Profile Header with Wallet + Streak + Currency integrated */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
            <ProfileHeader
              avatar={profile?.avatar || { type: 'emoji', value: '🎮', source: 'default' }}
              displayName={effectiveDisplayName}
              xHandle={profile?.xHandle}
              walletAddress={profile?.walletAddress}
              createdAt={new Date(profile?.createdAt || Date.now())}
              isOwnProfile={true}
              currentStreak={profile?.currentStreak || 0}
              longestStreak={profile?.longestStreak || 0}
              oranges={currency?.oranges || 0}
              gems={currency?.gems || 0}
              donuts={votingCounts.donuts}
              poops={votingCounts.poops}
            />
          </motion.div>

          {/* Identity: Link DID + Your name */}
          <motion.div
            className="account-identity-section"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
          >
            <div className="card p-4 flex flex-col gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <KeyRound size={20} style={{ color: 'var(--color-primary)' }} />
                Identity &amp; leaderboard
              </h2>

              {!playerDid ? (
                <>
                  <p className="text-secondary text-sm">
                    Link your Chia DID so your NFTs count on the voting and combat leaderboards.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted">Your DID</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="did:chia:1..."
                      value={didInput}
                      onChange={(e) => { setDidInput(e.target.value); setDidLinkError(null); }}
                      disabled={linkingDid}
                    />
                    <label className="text-xs font-medium text-muted">Wallet address (optional)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="xch1..."
                      value={didWalletInput}
                      onChange={(e) => setDidWalletInput(e.target.value)}
                      disabled={linkingDid}
                    />
                    {didLinkError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{didLinkError}</p>}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleLinkDid}
                      disabled={linkingDid || !didInput.trim()}
                    >
                      {linkingDid ? 'Linking...' : 'Link DID to account'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted flex items-center gap-1">
                      <User size={14} />
                      Your name (for leaderboards &amp; DID)
                    </label>
                    {displayNameEditing ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 flex-wrap">
                          <input
                            type="text"
                            className="input flex-1 min-w-0"
                            value={displayNameInput}
                            onChange={(e) => { setDisplayNameInput(e.target.value); setDisplayNameError(null); }}
                            placeholder="Display name"
                            maxLength={20}
                            disabled={displayNameSaving}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveDisplayName}
                            disabled={displayNameSaving || !displayNameInput.trim()}
                          >
                            {displayNameSaving ? '...' : <><Check size={16} /> Save</>}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => { setDisplayNameEditing(false); setDisplayNameError(null); setDisplayNameInput(displayName); }}
                            disabled={displayNameSaving}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {displayNameError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{displayNameError}</p>}
                        <p className="text-xs text-muted">2–20 characters, letters, numbers, spaces</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                          {displayName || 'Not set'}
                          {displayNameSource && (
                            <span className="text-muted text-xs ml-2">({displayNameSource})</span>
                          )}
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => { setDisplayNameEditing(true); setDisplayNameInput(displayName); setDisplayNameError(null); }}
                        >
                          Edit name
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-secondary">
                      Sync NFTs from your wallet or DID to contribute to the voting and combat leaderboards.
                    </p>
                    <button
                      type="button"
                      className="action-button"
                      onClick={handleRefreshDid}
                      disabled={refreshing}
                    >
                      <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                      {refreshing ? 'Syncing...' : 'Sync NFTs'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* 2. NFT Collection - Immediately after header */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
            <NftGallery
              ownedNftIds={ownedNftIds}
              currentAvatar={profile?.avatar || { type: 'emoji', value: '🎮', source: 'default' }}
              walletConnected={walletStatus === 'connected'}
              isOwnProfile={true}
              onSelectNft={handleSelectNft}
            />
          </motion.div>

          {/* 4. Game Scores */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
            <GameScoresGrid userId={userId || ''} />
          </motion.div>

          {/* 6. Social Widgets Row - Expanded */}
          <motion.div
            className="account-widgets-row account-widgets-row--expanded"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
          >
            <FriendsWidget
              onViewAll={() => {
                setFriendsLightboxTab('friends');
                setShowFriendsLightbox(true);
              }}
              onFindFriends={() => {
                setFriendsLightboxTab('find');
                setShowFriendsLightbox(true);
              }}
            />
            <AchievementsWidget
              onViewAll={() => setShowAchievementsLightbox(true)}
            />
          </motion.div>

          {/* 8. Account Actions */}
          <motion.div
            className="account-actions"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
          >
            {playerDid && (
              <button
                type="button"
                className="action-button"
                onClick={handleRefreshDid}
                disabled={refreshing}
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Syncing...' : 'Sync NFTs'}
              </button>
            )}

            <button
              type="button"
              className="action-button action-settings"
              onClick={() => navigate('/settings')}
            >
              <Settings size={18} />
              Settings
            </button>

            <button
              type="button"
              className="action-button action-signout"
              onClick={handleSignOut}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </motion.div>
        </motion.div>

        {/* Modals */}
        <DrawerEditor
          isOpen={isDrawerEditorOpen}
          onClose={() => setIsDrawerEditorOpen(false)}
        />

        <GiftModal
          isOpen={isGiftModalOpen}
          onClose={() => {
            setIsGiftModalOpen(false);
            setSelectedGiftItem(null);
          }}
          preselectedItem={selectedGiftItem}
          onGiftSent={async () => {
            // Refresh inventory after gifting
            try {
              const token = await getToken();
              const res = await fetch('/api/inventory', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                const allItems: InventoryItem[] = [];
                if (data.categories) {
                  for (const category of Object.keys(data.categories)) {
                    allItems.push(...data.categories[category]);
                  }
                }
                setInventoryItems(allItems);
              }
            } catch (err) {
              console.error('[Account] Failed to refresh inventory:', err);
            }
          }}
        />

        {/* Lightboxes */}
        <FriendsLightbox
          isOpen={showFriendsLightbox}
          onClose={() => setShowFriendsLightbox(false)}
          initialTab={friendsLightboxTab}
        />

        <AchievementsLightbox
          isOpen={showAchievementsLightbox}
          onClose={() => setShowAchievementsLightbox(false)}
        />

      </div>
    </motion.div>
  );
}
