/**
 * NFT Selection Modal
 *
 * Premium modal for selecting an NFT as avatar after wallet connection.
 * Features staggered animations and hover effects.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useSageWallet } from '@/sage-wallet';
import './NFTSelectionModal.css';

interface NFT {
  id: string;
  name: string;
  imageUrl: string;
  collection: string;
}

interface NFTSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nft: NFT) => void;
}

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

export const NFTSelectionModal: React.FC<NFTSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { getNFTs, status } = useSageWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);

  const fetchNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const walletNfts = await getNFTs(WOJAK_COLLECTION_ID);
      const formattedNfts: NFT[] = walletNfts.map((nft) => ({
        id: nft.encoded_id,
        name: nft.name || `Wojak #${nft.encoded_id}`,
        imageUrl: nft.thumbnail_uri || nft.data_uri || '',
        collection: nft.collection_name || 'Wojak Farmers Plot',
      }));
      setNfts(formattedNfts);
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  }, [getNFTs]);

  useEffect(() => {
    if (isOpen && status === 'connected') {
      fetchNFTs();
    }
  }, [isOpen, status, fetchNFTs]);

  const handleSelect = (nft: NFT) => {
    setSelectedNft(nft);
  };

  const handleConfirm = () => {
    if (selectedNft) {
      onSelect(selectedNft);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="nft-selection-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="nft-selection-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nft-selection-title"
          >
            {/* Header */}
            <div className="modal-header">
              <div>
                <h2 id="nft-selection-title">Choose Your Avatar</h2>
                <p>Select a Wojak NFT from your collection</p>
              </div>
              <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="modal-body">
              {isLoading ? (
                <div className="loading-state" role="status" aria-label="Loading">
                  <Loader2 size={32} className="animate-spin" aria-hidden="true" />
                  <p>Loading your Wojak NFTs...</p>
                </div>
              ) : nfts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">😢</span>
                  <h3>No Wojak NFTs Found</h3>
                  <p>Get a Wojak Farmers Plot NFT to use as your avatar!</p>
                  <a
                    href="https://mintgarden.io/collections/wojak-farmers-plot-col1kfy44w3nlkqq8z3j8z9mhc3nw9pzwvlsmhsyhc0z6a7luvzukfsufegk5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="get-nft-link"
                  >
                    Browse Collection →
                  </a>
                </div>
              ) : (
                <div className="nft-grid">
                  {nfts.map((nft, index) => (
                    <motion.button
                      type="button"
                      key={nft.id}
                      className={`nft-option ${selectedNft?.id === nft.id ? 'selected' : ''}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelect(nft)}
                    >
                      <img src={nft.imageUrl} alt={nft.name} loading="lazy" />
                      <span className="nft-id">#{nft.id.slice(-4)}</span>
                      {selectedNft?.id === nft.id && (
                        <motion.div
                          className="selected-indicator"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {nfts.length > 0 && (
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <motion.button
                  type="button"
                  className="confirm-btn"
                  onClick={handleConfirm}
                  disabled={!selectedNft}
                  whileHover={selectedNft ? { scale: 1.02 } : {}}
                  whileTap={selectedNft ? { scale: 0.98 } : {}}
                >
                  Set as Avatar
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NFTSelectionModal;
