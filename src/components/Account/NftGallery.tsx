/**
 * NftGallery Component (Premium Carousel Version)
 *
 * Horizontal Swiper carousel of owned Wojak Farmers Plot NFTs.
 * Features momentum scrolling, navigation arrows, and micro-interactions.
 */

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { getNftImageUrl } from '@/services/constants';
import type { UserAvatar } from '@/types/avatar';
// @ts-expect-error - Swiper CSS modules don't have type declarations
import 'swiper/css';
// @ts-expect-error - Swiper CSS modules don't have type declarations
import 'swiper/css/navigation';
// @ts-expect-error - Swiper CSS modules don't have type declarations
import 'swiper/css/free-mode';
import './Account.css';

const MINTGARDEN_COLLECTION_URL = 'https://mintgarden.io/collections/wojak-farmers-plot-col1kfy44w3nlkqq8z3j8z9mhc3nw9pzwvlsmhsyhc0z6a7luvzukfsufegk5';

interface NftGalleryProps {
  ownedNftIds: string[];
  currentAvatar: UserAvatar;
  walletConnected: boolean;
  isOwnProfile: boolean;
  onSelectNft?: (nftId: string) => void;
}

export function NftGallery({
  ownedNftIds,
  currentAvatar,
  walletConnected,
  isOwnProfile,
  onSelectNft,
}: NftGalleryProps) {
  const currentNftId = currentAvatar.type === 'nft' ? currentAvatar.nftId : null;

  // Don't render if wallet not connected - the CTA is in the header now
  if (!walletConnected && isOwnProfile) {
    return null;
  }

  if (ownedNftIds.length === 0) {
    return (
      <div className="nft-gallery-premium nft-gallery--empty">
        <div className="nft-gallery__header">
          <h2>NFT Collection</h2>
        </div>
        <div className="nft-gallery-empty-state">
          <span className="empty-icon">🖼️</span>
          <p>No Wojak Farmers Plot NFTs found</p>
          <a
            href={MINTGARDEN_COLLECTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="browse-link"
          >
            Browse collection
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-gallery-premium">
      <div className="nft-gallery__header">
        <h2>NFT Collection <span className="count">({ownedNftIds.length})</span></h2>
        <div className="nft-gallery__nav">
          <button type="button" className="swiper-btn swiper-btn-prev" aria-label="Previous NFTs">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="swiper-btn swiper-btn-next" aria-label="Next NFTs">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <Swiper
        modules={[Navigation, FreeMode]}
        spaceBetween={12}
        slidesPerView="auto"
        freeMode={{ enabled: true, momentum: true, momentumRatio: 0.5 }}
        navigation={{ 
          prevEl: '.swiper-btn-prev', 
          nextEl: '.swiper-btn-next',
          disabledClass: 'swiper-btn--disabled'
        }}
        className="nft-swiper"
      >
        {ownedNftIds.map((nftId) => {
          const isCurrentAvatar = nftId === currentNftId;
          return (
            <SwiperSlide key={nftId} style={{ width: 'auto' }}>
              <motion.div
                className={`nft-item ${isCurrentAvatar ? 'nft-item--active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isOwnProfile && onSelectNft?.(nftId)}
                role={isOwnProfile ? 'button' : undefined}
                tabIndex={isOwnProfile ? 0 : undefined}
                aria-label={isOwnProfile ? `Select Wojak #${nftId} as avatar` : undefined}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && isOwnProfile) { e.preventDefault(); onSelectNft?.(nftId); } }}
              >
                <img
                  src={getNftImageUrl(nftId)}
                  alt={`Wojak #${nftId}`}
                  loading="lazy"
                />
                <span className="nft-item__id">#{nftId}</span>
                {isCurrentAvatar && <span className="nft-item__badge">Avatar</span>}
              </motion.div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
