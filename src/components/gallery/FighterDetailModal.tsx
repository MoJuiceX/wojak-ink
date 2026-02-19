/**
 * FighterDetailModal - Modal showing fighter image and combat stats
 *
 * Opens when clicking a WojakFighterCard in the Your Wojak section.
 * Shows the fighter's image and full combat identity via FighterStatsPanel.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FighterStatsPanel } from '@/components/combat/FighterStatsPanel';

interface FighterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  edition: number;
}

export function FighterDetailModal({ isOpen, onClose, nftId, edition }: FighterDetailModalProps) {
  const imageUrl = `https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`;

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
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center px-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-bold">Wojak #{edition}</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-secondary transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Fighter Image */}
            <div className="p-4 pb-0">
              <div className="aspect-square rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                <img
                  src={imageUrl}
                  alt={`Wojak #${edition}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Fighter Stats Panel */}
            <div className="p-4">
              <FighterStatsPanel nftId={nftId} edition={edition} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
