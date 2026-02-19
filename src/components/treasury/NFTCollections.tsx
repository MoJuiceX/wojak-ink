/**
 * NFTCollections Component
 *
 * Displays NFT collection thumbnails with expandable grid view.
 * Shows one NFT per collection as preview. Click to see all NFTs in that collection.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import type { NFTCollection } from '@/services/treasuryService';

interface NFTCollectionsProps {
  collections: NFTCollection[];
  isLoading?: boolean;
}

export function NFTCollections({ collections, isLoading = false }: NFTCollectionsProps) {
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);

  const handleSelectCollection = (collection: NFTCollection) => {
    setSelectedCollection(collection);
  };

  const handleBack = () => {
    setSelectedCollection(null);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col absolute inset-0"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="h-5 w-32 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="p-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg animate-pulse"
                style={{ background: 'var(--color-border)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (collections.length === 0) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex flex-col absolute inset-0"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h3 className="text-base font-semibold text-primary">
            NFT Collections
          </h3>
        </div>
        <div className="p-4 flex-1 flex flex-col items-center justify-center">
          <ImageIcon size={48} className="text-muted" style={{ opacity: 0.5 }} />
          <p className="mt-3 text-sm text-muted">
            No NFTs found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col absolute inset-0"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h3 className="text-base font-semibold truncate text-primary">
          {selectedCollection ? selectedCollection.collectionName : 'NFT Collections'}
        </h3>

        {selectedCollection && (
          <motion.button
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors flex-shrink-0 text-accent"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-primary)',
            }}
            onClick={handleBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Back to collections"
          >
            <ArrowLeft size={16} />
            Back
          </motion.button>
        )}
      </div>

      {/* Content - scrollable area (fixed height, scrolls internally) */}
      <div className="p-4 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {selectedCollection ? (
            // Expanded collection grid - show all NFTs in this collection
            <motion.div
              key="nft-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-3"
              role="list"
              aria-label={`${selectedCollection.collectionName} NFTs`}
            >
              {selectedCollection.nfts.map((nft, index) => (
                <motion.div
                  key={nft.nftId}
                  className="aspect-square rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  role="listitem"
                  aria-label={nft.name}
                >
                  {nft.imageUrl ? (
                    <img
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-muted" style={{ opacity: 0.5 }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // Collection thumbnails - show one NFT preview per collection
            <motion.div
              key="collections"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-3"
              role="list"
              aria-label="NFT collections"
            >
              {collections.map((collection, index) => (
                <motion.button
                  key={collection.collectionId}
                  className="relative aspect-square rounded-lg overflow-hidden text-left"
                  style={{
                    background: 'var(--color-bg)',
                    border: '2px solid transparent',
                  }}
                  onClick={() => handleSelectCollection(collection)}
                  whileHover={{
                    scale: 1.03,
                    borderColor: 'var(--color-primary)',
                  }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  role="listitem"
                  aria-label={`View ${collection.collectionName} NFTs (${collection.count} items)`}
                >
                  {collection.previewImage ? (
                    <img
                      src={collection.previewImage}
                      alt={collection.collectionName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-muted" style={{ opacity: 0.5 }} />
                    </div>
                  )}
                  {/* Overlay */}
                  <div
                    className="absolute inset-x-0 bottom-0 p-2"
                    style={{
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    }}
                  >
                    <p className="text-sm font-semibold truncate text-primary">
                      {collection.collectionName}
                    </p>
                    <p className="text-xs text-muted">
                      {collection.count} {collection.count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default NFTCollections;
