/**
 * Treasury Page
 *
 * Portfolio visualization with interactive crypto bubbles.
 * 3-column responsive layout: Overview | Bubble Map (hero) | NFTs
 */

import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { TreasuryProvider, useTreasury } from '@/contexts/TreasuryContext';
import {
  PortfolioValueCard,
  CryptoBubbles,
  NFTCollections,
  OtherTokensCard,
  WalletAddressCard,
} from '@/components/treasury';
import { WALLET_ADDRESS, SPACESCAN_WALLET_URL } from '@/services/constants';
import { PageSEO } from '@/components/seo';
import './Treasury.css';
import { InfoButton } from '@/components/common/InfoButton';

function TreasuryContent() {
  const { contentPadding } = useLayout();
  const {
    portfolio,
    isLoading,
    popBubble,
    resetBubbles,
    soundEnabled,
    nftCollections,
  } = useTreasury();

  const handleBubblePop = () => {
    popBubble();
  };

  const handleAllPopped = () => {
    // Celebration! Auto-reset after delay
    setTimeout(() => {
      resetBubbles();
    }, 3000);
  };

  return (
    <PageTransition>
      <PageSEO
        title="Community Treasury - Wojak Farmers Portfolio"
        description="Explore the Wojak Farmers community treasury. View XCH holdings, CAT tokens, and NFT collections in an interactive bubble visualization. Track portfolio value in real-time."
        path="/treasury"
      />
      <div className="treasury-page" data-section="treasury" style={{ padding: Math.min(contentPadding, 16) }}>
        {/*
          3-COLUMN RESPONSIVE LAYOUT
          Mobile: vertical stack (overview -> bubbles -> NFTs)
          Desktop: side-by-side (overview | bubbles | NFTs)
        */}
        <div className="treasury-grid">
          {/*
            FLAT GRID STRUCTURE for flexible mobile/desktop ordering
            Mobile: price -> bubbles -> other tokens -> NFTs -> wallet
            Desktop: 3-column layout
          */}

          {/* Portfolio Value Card */}
          <div className="treasury-price">
            <PortfolioValueCard
              portfolio={portfolio}
              isLoading={isLoading && !portfolio}
            />
          </div>

          {/* Bubble Map (HERO) */}
          <div className="treasury-bubbles">
            <CryptoBubbles
              tokens={portfolio?.visibleTokens ?? []}
              onBubblePop={handleBubblePop}
              onAllPopped={handleAllPopped}
              isLoading={isLoading && !portfolio}
              soundEnabled={soundEnabled}
            />
          </div>

          {/* Other Tokens (small holdings) */}
          <div className="treasury-other-tokens">
            <OtherTokensCard
              tokens={portfolio?.smallTokens ?? []}
              isLoading={isLoading && !portfolio}
            />
          </div>

          {/* NFT Collections */}
          <div className="treasury-nft">
            <NFTCollections
              collections={nftCollections}
              isLoading={isLoading && !portfolio}
            />
          </div>

          {/* Wallet Address */}
          <div className="treasury-wallet">
            <WalletAddressCard
              address={WALLET_ADDRESS}
              explorerUrl={SPACESCAN_WALLET_URL}
            />
          </div>
        </div>
      </div>
      <InfoButton page="treasury" />
    </PageTransition>
  );
}

export default function Treasury() {
  return (
    <TreasuryProvider mockData={false}>
      <TreasuryContent />
    </TreasuryProvider>
  );
}
