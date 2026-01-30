/**
 * Account Page (Premium Redesign)
 *
 * Mobile-first premium dashboard with integrated wallet/streak in header,
 * horizontal NFT scroll, compact stats, and expanded social widgets.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignedOut, SignInButton, useClerk, useAuth } from '@clerk/clerk-react';
import { LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSageWallet } from '@/sage-wallet';
import { useLayout } from '@/hooks/useLayout';

import { ProfileHeader } from '@/components/Account/ProfileHeader';
import { GameScoresGrid } from '@/components/Account/GameScoresGrid';
import { NftGallery } from '@/components/Account/NftGallery';
import { InventorySection } from '@/components/Account/InventorySection';
import { FriendsWidget } from '@/components/Account/FriendsWidget';
import { AchievementsWidget } from '@/components/Account/AchievementsWidget';
import { FriendsLightbox } from '@/components/Account/FriendsLightbox';
import { AchievementsLightbox } from '@/components/Account/AchievementsLightbox';
import { PageTransition } from '@/components/layout/PageTransition';
import { DrawerEditor } from '@/components/Shop/DrawerEditor';
import { GiftModal } from '@/components/Account/GiftModal';
import { QuickActionsBar } from '@/components/Account/QuickActionsBar';
import { InfoButton } from '@/components/common/InfoButton';

import '@/components/Account/Account.css';

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
  const getToken = CLERK_ENABLED ? authResult.getToken : async () => null;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response items passed to InventorySection
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response items
          const allItems: any[] = [];
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

  // Equip handler
  const handleEquip = async (itemId: string, category: string) => {
    if (!isSignedIn) return;

    const slotMap: Record<string, string> = {
      frame: 'frame',
      title: 'title',
      name_effect: 'name_effect',
      background: 'background',
      celebration: 'celebration',
    };

    const slot = slotMap[category];
    if (!slot) return;

    try {
      const token = await getToken();
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slot, itemId }),
      });

      if (res.ok) {
        // Update local state
        setEquippedItems(prev => ({ ...prev, [`${slot}_id`]: itemId }));
        setInventoryItems(prev =>
          prev.map(item => ({
            ...item,
            equipped: item.category === category ? item.item_id === itemId : item.equipped,
          }))
        );
      }
    } catch (err) {
      console.error('[Account] Failed to equip item:', err);
    }
  };

  // Gift handler - opens gift modal with selected item
  const handleGift = (itemId: string) => {
    const item = inventoryItems.find(i => i.item_id === itemId);
    setSelectedGiftItem(item || null);
    setIsGiftModalOpen(true);
  };

  // Unequip handler
  const handleUnequip = async (category: string) => {
    if (!isSignedIn) return;

    const slotMap: Record<string, string> = {
      frame: 'frame',
      title: 'title',
      name_effect: 'name_effect',
      background: 'background',
      celebration: 'celebration',
    };

    const slot = slotMap[category];
    if (!slot) return;

    try {
      const token = await getToken();
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slot, itemId: null }),
      });

      if (res.ok) {
        // Update local state
        setEquippedItems(prev => ({ ...prev, [`${slot}_id`]: null }));
        setInventoryItems(prev =>
          prev.map(item => ({
            ...item,
            equipped: item.category === category ? false : item.equipped,
          }))
        );
      }
    } catch (err) {
      console.error('[Account] Failed to unequip item:', err);
    }
  };

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
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
        }}
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

          {/* 5. Quick Actions Bar */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
            <QuickActionsBar
              onAchievements={() => setShowAchievementsLightbox(true)}
              onCustomize={() => setIsDrawerEditorOpen(true)}
              onViewProfileCard={() => setIsDrawerEditorOpen(true)}
            />
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
            />
            <AchievementsWidget
              onViewAll={() => setShowAchievementsLightbox(true)}
            />
          </motion.div>

          {/* 7. Inventory - Only show if user has items */}
          {inventoryItems.length > 0 && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}>
              <InventorySection
                items={inventoryItems}
                isOwnProfile={true}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
                onGift={handleGift}
              />
            </motion.div>
          )}

          {/* 8. Account Actions */}
          <motion.div 
            className="account-actions"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
          >
            <button
              className="action-button action-settings"
              onClick={() => navigate('/settings')}
            >
              <Settings size={18} />
              Settings
            </button>

            <button
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response items
          const allItems: any[] = [];
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

        <InfoButton page="account" />
      </div>
    </PageTransition>
  );
}
