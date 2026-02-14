/**
 * MyWojaksModal - Shows user's owned Wojak NFTs in a lightbox
 *
 * User selects one and BigPulp analyzes it
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Wallet } from 'lucide-react';

interface OwnedNFT {
  id: string;
  name: string;
  thumbnailUrl: string;
  nftId: string; // The numeric ID (e.g., "0420")
}

interface MyWojaksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nftId: string) => void;
  ownedNFTs: OwnedNFT[];
  isLoading: boolean;
}

// Extract numeric ID from NFT name like "Wojak Farmers Plot #0420"
function extractNftId(name: string): string | null {
  const match = name.match(/#(\d+)/);
  return match ? match[1] : null;
}

export function MyWojaksModal({
  isOpen,
  onClose,
  onSelect,
  ownedNFTs,
  isLoading,
}: MyWojaksModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = useCallback((nft: OwnedNFT) => {
    const nftId = extractNftId(nft.name) || nft.nftId;
    setSelectedId(nftId);

    // Brief delay for selection animation
    setTimeout(() => {
      onSelect(nftId);
      onClose();
      setSelectedId(null);
    }, 200);
  }, [onSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-glass-bg, rgba(20, 15, 10, 0.95))',
                border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: 'var(--color-border, rgba(255, 255, 255, 0.1))' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    <Wallet size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      My Wojaks
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {ownedNFTs.length} Wojak{ownedNFTs.length !== 1 ? 's' : ''} in your wallet
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={24} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 size={40} className="animate-spin" style={{ color: '#f97316' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading your Wojaks...</p>
                  </div>
                ) : ownedNFTs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <span className="text-5xl opacity-50">😢</span>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      No Wojak Farmers Plot NFTs found in your wallet
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {ownedNFTs.map((nft) => {
                      const nftId = extractNftId(nft.name) || nft.nftId;
                      const isSelected = selectedId === nftId;

                      return (
                        <motion.button
                          key={nft.id}
                          className="relative aspect-square rounded-xl overflow-hidden group"
                          style={{
                            background: 'var(--color-surface)',
                            border: isSelected
                              ? '3px solid #f97316'
                              : '2px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          }}
                          onClick={() => handleSelect(nft)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          animate={isSelected ? { scale: 0.9, opacity: 0.5 } : {}}
                        >
                          {/* NFT Image */}
                          <img
                            src={nft.thumbnailUrl}
                            alt={nft.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />

                          {/* Hover overlay */}
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                          >
                            <span className="text-white font-bold text-sm">
                              #{nftId}
                            </span>
                          </div>

                          {/* ID badge */}
                          <div
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold"
                            style={{
                              background: 'rgba(0, 0, 0, 0.8)',
                              color: '#fff',
                            }}
                          >
                            #{nftId}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div
                className="p-3 border-t text-center text-sm"
                style={{
                  borderColor: 'var(--color-border, rgba(255, 255, 255, 0.1))',
                  color: 'var(--color-text-muted)',
                }}
              >
                Click a Wojak to get BigPulp's analysis
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MyWojaksModal;
