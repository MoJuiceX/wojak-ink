/**
 * BigPulp Intelligence Page
 *
 * NFT analysis platform with AI-powered character guide.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { HeatMapCell } from '@/types/bigpulp';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { BigPulpProvider, useBigPulp } from '@/contexts/BigPulpContext';
import {
  NFTSearchInput,
  NFTPreviewCard,
  BigPulpCharacter,
  TabNavigation,
  MarketTab,
  AskTab,
  AttributesTab,
  EmptyStateContent,
} from '@/components/bigpulp';
import { MyWojaksModal } from '@/components/bigpulp/MyWojaksModal';
import { ALL_BADGES_FILTER } from '@/components/bigpulp/HeatMap';
import { useSageWallet } from '@/sage-wallet';
import { PageSEO } from '@/components/seo';

// Wojak Farmers Plot collection ID on MintGarden
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';



interface OwnedNFT {
  id: string;
  name: string;
  thumbnailUrl: string;
  nftId: string;
}

function TopLeftPanel() {
  const {
    searchQuery,
    setSearchQuery,
    searchNFT,
    surpriseMe,
    isLoading,
    error,
    bigPulp,
    currentNftHeadTrait,
    onTypingComplete,
    skipMessage,
  } = useBigPulp();

  // Wallet and owned NFTs state
  const { status, address, getNFTs } = useSageWallet();
  const isWalletConnected = status === 'connected' && !!address;
  const [isMyWojaksOpen, setIsMyWojaksOpen] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  // Fetch owned NFTs when wallet is connected
  useEffect(() => {
    if (isWalletConnected) {
      queueMicrotask(() => setIsLoadingNFTs(true));
      getNFTs(WOJAK_COLLECTION_ID)
        .then((nfts) => {
          const mapped = nfts.map((nft) => ({
            id: nft.encoded_id,
            name: nft.name || 'Unknown Wojak',
            thumbnailUrl: nft.preview_uri || nft.thumbnail_uri || nft.data_uri || '',
            nftId: nft.name?.match(/#(\d+)/)?.[1] || '0000',
          }));
          setOwnedNFTs(mapped);
        })
        .catch((err) => {
          console.error('[BigPulp] Failed to fetch owned NFTs:', err);
          setOwnedNFTs([]);
        })
        .finally(() => {
          setIsLoadingNFTs(false);
        });
    } else {
      queueMicrotask(() => setOwnedNFTs([]));
    }
  }, [isWalletConnected, getNFTs]);

  const handleSearch = useCallback(
    (id: string) => {
      searchNFT(id);
    },
    [searchNFT]
  );

  const handleMyWojaksOpen = useCallback(() => {
    setIsMyWojaksOpen(true);
  }, []);

  const handleMyWojaksClose = useCallback(() => {
    setIsMyWojaksOpen(false);
  }, []);

  const handleNFTSelect = useCallback((nftId: string) => {
    // Pad to 4 digits and search
    const paddedId = nftId.padStart(4, '0');
    setSearchQuery(paddedId);
    searchNFT(paddedId);
  }, [setSearchQuery, searchNFT]);

  return (
    <div className="relative h-full">
      {/* BigPulp Character with Orange Grove background */}
      <BigPulpCharacter
        message={bigPulp.message}
        isTyping={bigPulp.isTyping}
        headTrait={currentNftHeadTrait || undefined}
        onTypingComplete={onTypingComplete}
        onSkipMessage={skipMessage}
      />

      {/* Search input - overlaid on top of Orange Grove, aligned with speech bubble */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-[320px]" style={{ zIndex: 10 }}>
        <NFTSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onSurprise={surpriseMe}
          onMyWojaks={handleMyWojaksOpen}
          hasWallet={isWalletConnected}
          ownedCount={ownedNFTs.length}
          isLoading={isLoading}
          error={error || undefined}
        />
      </div>

      {/* My Wojaks Modal */}
      <MyWojaksModal
        isOpen={isMyWojaksOpen}
        onClose={handleMyWojaksClose}
        onSelect={handleNFTSelect}
        ownedNFTs={ownedNFTs}
        isLoading={isLoadingNFTs}
      />
    </div>
  );
}

function TopRightPanel() {
  const {
    currentAnalysis,
    isLoading,
    currentNftTraits,
    currentNftHpTraits,
    currentNftNamedCombos,
    currentNftCultures,
    currentNftIsFiveHp,
    currentNftIsHomieEdition,
    currentNftHomieName,
  } = useBigPulp();

  return (
    <div className="h-full overflow-hidden">
      {/* NFT Preview Card - constrained to container */}
      <NFTPreviewCard
        analysis={currentAnalysis}
        isLoading={isLoading}
        traits={currentNftTraits}
        hpTraits={currentNftHpTraits}
        namedCombos={currentNftNamedCombos}
        cultures={currentNftCultures}
        isFiveHp={currentNftIsFiveHp}
        isHomieEdition={currentNftIsHomieEdition}
        homieName={currentNftHomieName}
      />
    </div>
  );
}

function BottomPanel() {
  const {
    activeTab,
    setActiveTab,
    marketStats,
    heatMapData,
    heatMapViewMode,
    setHeatMapViewMode,
    attributes,
    topSales,
    isMarketLoading,
    isAskLoading,
    isAttributesLoading,
    // Heatmap cache state
    heatmapCacheMetadata,
    isHeatmapRefetching,
    refetchHeatmap,
    // Badge filtering
    badges,
    selectedBadge,
    setSelectedBadge,
    badgeMapping,
  } = useBigPulp();
  const prefersReducedMotion = useReducedMotion();

  // Filter heatmap data by selected badge
  const filteredHeatMapData = useMemo((): HeatMapCell[][] | null => {
    if (!heatMapData) return null;
    // null = no filter, show all NFTs
    if (selectedBadge === null || !badgeMapping) return heatMapData;

    // Create a set of NFT IDs that match the badge filter
    const nftIdsWithBadge = new Set<string>();

    if (selectedBadge === ALL_BADGES_FILTER) {
      // "All Badges" - include NFTs that have ANY badge
      for (const nftId of Object.keys(badgeMapping.nft_badges)) {
        nftIdsWithBadge.add(nftId);
      }
    } else {
      // Specific badge - include only NFTs with that badge
      for (const [nftId, entry] of Object.entries(badgeMapping.nft_badges)) {
        if (entry.badges.some(b => b.badge === selectedBadge)) {
          nftIdsWithBadge.add(nftId);
        }
      }
    }

    // Filter each cell's NFTs and recalculate count/intensity
    return heatMapData.map(row =>
      row.map(cell => {
        // Extract numeric ID from NFT id (e.g., "WFP-361" -> "361")
        const filteredNfts = cell.nfts.filter(nft => {
          const numericId = nft.id.replace(/\D/g, '');
          return nftIdsWithBadge.has(numericId);
        });

        const newCount = filteredNfts.length;
        // Recalculate intensity based on new count (rough approximation)
        const maxCountInCell = 15; // Approximate max for intensity calculation
        const newIntensity = newCount > 0 ? Math.min(newCount / maxCountInCell, 1) : 0;

        return {
          ...cell,
          nfts: filteredNfts,
          count: newCount,
          intensity: newIntensity,
          label: `${cell.rarityBin.label}, ${cell.priceBin.label}: ${newCount} NFTs`,
        };
      })
    );
  }, [heatMapData, selectedBadge, badgeMapping]);

  const handleAttributeClick = useCallback(() => {
    // No-op — drill-down not yet implemented
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Tab navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="p-1 sm:p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'market' && (
            <motion.div
              key="market"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              role="tabpanel"
              id="panel-market"
              aria-labelledby="tab-market"
            >
              <MarketTab
                stats={marketStats}
                heatMapData={filteredHeatMapData}
                viewMode={heatMapViewMode}
                onViewModeChange={setHeatMapViewMode}
                isLoading={isMarketLoading}
                heatmapCacheMetadata={heatmapCacheMetadata}
                isHeatmapRefetching={isHeatmapRefetching}
                onHeatmapRefresh={refetchHeatmap}
                badges={badges}
                selectedBadge={selectedBadge}
                onBadgeChange={setSelectedBadge}
              />
            </motion.div>
          )}

          {activeTab === 'ask' && (
            <motion.div
              key="ask"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              role="tabpanel"
              id="panel-ask"
              aria-labelledby="tab-ask"
            >
              <AskTab
                stats={marketStats}
                topAttributes={attributes.slice(0, 10)}
                topSales={topSales}
                isLoading={isAskLoading}
              />
            </motion.div>
          )}

          {activeTab === 'attributes' && (
            <motion.div
              key="attributes"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              role="tabpanel"
              id="panel-attributes"
              aria-labelledby="tab-attributes"
            >
              <AttributesTab
                attributes={attributes}
                categories={[]}
                onAttributeClick={handleAttributeClick}
                isLoading={isAttributesLoading}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// Mobile Empty State - shows when no NFT is selected
function MobileEmptyState() {
  const {
    searchQuery,
    setSearchQuery,
    searchNFT,
    surpriseMe,
    isLoading,
    error,
    bigPulp,
    currentNftHeadTrait,
    onTypingComplete,
    skipMessage,
    marketStats,
    topSales,
    isMarketLoading,
  } = useBigPulp();

  // Wallet and owned NFTs state
  const { status, address, getNFTs } = useSageWallet();
  const isWalletConnected = status === 'connected' && !!address;
  const [isMyWojaksOpen, setIsMyWojaksOpen] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  // Fetch owned NFTs when wallet is connected
  useEffect(() => {
    if (isWalletConnected) {
      queueMicrotask(() => setIsLoadingNFTs(true));
      getNFTs(WOJAK_COLLECTION_ID)
        .then((nfts) => {
          const mapped = nfts.map((nft) => ({
            id: nft.encoded_id,
            name: nft.name || 'Unknown Wojak',
            thumbnailUrl: nft.preview_uri || nft.thumbnail_uri || nft.data_uri || '',
            nftId: nft.name?.match(/#(\d+)/)?.[1] || '0000',
          }));
          setOwnedNFTs(mapped);
        })
        .catch((err) => {
          console.error('[BigPulp] Failed to fetch owned NFTs:', err);
          setOwnedNFTs([]);
        })
        .finally(() => {
          setIsLoadingNFTs(false);
        });
    } else {
      queueMicrotask(() => setOwnedNFTs([]));
    }
  }, [isWalletConnected, getNFTs]);

  const handleSearch = useCallback(
    (id: string) => {
      searchNFT(id);
    },
    [searchNFT]
  );

  const handleNFTClick = useCallback((nftId: string) => {
    const paddedId = nftId.padStart(4, '0');
    setSearchQuery(paddedId);
    searchNFT(paddedId);
  }, [setSearchQuery, searchNFT]);

  // Transform topSales for EmptyStateContent
  const formattedTopSales = useMemo(() => {
    if (!topSales) return undefined;
    return topSales.map((sale, index) => ({
      id: sale.nft.id,
      name: sale.nft.name || `Wojak #${sale.nft.id}`,
      imageUrl: sale.nft.imageUrl || `/assets/wojaks/${sale.nft.id.replace(/\D/g, '').padStart(4, '0')}.png`,
      priceXch: sale.price || 0,
      rank: index + 1,
    }));
  }, [topSales]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Compact BigPulp Character */}
      <div className="relative flex-shrink-0">
        <BigPulpCharacter
          message={bigPulp.message}
          isTyping={bigPulp.isTyping}
          headTrait={currentNftHeadTrait || undefined}
          onTypingComplete={onTypingComplete}
          onSkipMessage={skipMessage}
          compact
        />

        {/* Search input - overlaid on character */}
        <div className="absolute top-3 left-3 right-3" style={{ zIndex: 10 }}>
          <NFTSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            onSurprise={surpriseMe}
            onMyWojaks={() => setIsMyWojaksOpen(true)}
            hasWallet={isWalletConnected}
            ownedCount={ownedNFTs.length}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>

        {/* My Wojaks Modal */}
        <MyWojaksModal
          isOpen={isMyWojaksOpen}
          onClose={() => setIsMyWojaksOpen(false)}
          onSelect={handleNFTClick}
          ownedNFTs={ownedNFTs}
          isLoading={isLoadingNFTs}
        />
      </div>

      {/* Empty State Content - Stats + Trending */}
      <div className="flex-shrink-0">
        <EmptyStateContent
          stats={marketStats}
          topSales={formattedTopSales}
          onNFTClick={handleNFTClick}
          isLoading={isMarketLoading}
        />
      </div>

      {/* Market/Ask/Attributes Tabs - grows to fill remaining space */}
      <div className="flex-1">
        <BottomPanel />
      </div>
    </div>
  );
}

// Mobile NFT View - shows when an NFT is selected
function MobileNFTView() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Search + BigPulp Character */}
      <div className="flex-shrink-0">
        <TopLeftPanel />
      </div>

      {/* NFT Preview + Metadata */}
      <div className="flex-shrink-0">
        <TopRightPanel />
      </div>

      {/* Market/Ask/Attributes Tabs - grows to fill */}
      <div className="flex-1">
        <BottomPanel />
      </div>
    </div>
  );
}

function MobileLayout() {
  const { currentAnalysis } = useBigPulp();
  const hasNFTSelected = !!currentAnalysis;

  return (
    <AnimatePresence mode="wait">
      {hasNFTSelected ? (
        <motion.div
          key="nft-view"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <MobileNFTView />
        </motion.div>
      ) : (
        <motion.div
          key="empty-state"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <MobileEmptyState />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DesktopLayout() {
  return (
    <div
      className="space-y-6"
      style={{ maxWidth: '1400px', margin: '0 auto' }}
    >
      {/* Top Row: Search/BigPulp (left) | NFT Preview (right) - same height */}
      <div className="flex gap-6" style={{ height: '400px' }}>
        {/* Left Panel - BigPulp with search overlay */}
        <div className="flex-1" style={{ minWidth: 0, height: '100%' }}>
          <TopLeftPanel />
        </div>

        {/* Right Panel - NFT Preview - same height */}
        <div className="flex-1" style={{ minWidth: 0, height: '100%' }}>
          <TopRightPanel />
        </div>
      </div>

      {/* Bottom Row: Market/Ask/Attributes - Full width, fills remaining space */}
      <BottomPanel />
    </div>
  );
}

function BigPulpContent() {
  const { contentPadding, isDesktop } = useLayout();

  // Set browser tab title
  useEffect(() => {
    document.title = 'BigPulp Intelligence';

    // Cleanup: restore default title when leaving page
    return () => {
      document.title = 'wojak.ink';
    };
  }, []);


  return (
    <PageTransition>
      <PageSEO
        title="BigPulp AI - NFT Intelligence & Market Analysis"
        description="Get AI-powered insights on Wojak Farmers Plot NFTs. Analyze trait rarity, view sales history, explore market heatmaps, and discover valuable combos. Your NFT intelligence companion on Chia blockchain."
        path="/bigpulp"
      />
      <div data-section="bigpulp" style={{ paddingTop: contentPadding, paddingLeft: contentPadding, paddingRight: contentPadding, paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        {/* SEO H1 - visually hidden but accessible */}
        <h1 className="sr-only">BigPulp AI - Wojak Farmers NFT Intelligence & Analysis</h1>

        {/* Responsive layout - no header needed, title is in browser tab */}
        {isDesktop ? <DesktopLayout /> : <MobileLayout />}
      </div>
    </PageTransition>
  );
}

export default function BigPulp() {
  return (
    <BigPulpProvider mockData={true}>
      <BigPulpContent />
    </BigPulpProvider>
  );
}
