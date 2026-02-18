import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, Swords } from 'lucide-react';

interface PickerNft {
  nftId: string;
  editionNumber: number;
  name: string;
  imageUri: string;
  likes: number;
  dislikes: number;
  netScore: number;
  battleCount: number;
  battleWins: number;
}

interface BattleNftPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQueue: (nft: PickerNft) => Promise<{ success: boolean; error?: string }>;
  nfts: PickerNft[];
  loading: boolean;
}

export function BattleNftPickerModal({ isOpen, onClose, onQueue, nfts, loading }: BattleNftPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const nft = nfts.find(n => n.nftId === selectedId);
    if (!nft) return;
    setQueueing(true);
    setError(null);
    const result = await onQueue(nft);
    setQueueing(false);
    if (result.success) {
      setSelectedId(null);
      onClose();
    } else {
      setError(result.error || 'Failed to queue');
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    setError(null);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="modal"
            style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column' }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-lg font-bold">Select a Wojak for Battle</h2>
                <p className="text-secondary text-sm">Choose your champion</p>
              </div>
              <button
                className="btn btn-ghost p-2"
                onClick={handleClose}
                style={{ borderRadius: '50%', width: '36px', height: '36px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 gap-3">
                  <div className="text-secondary">Loading your Wojaks...</div>
                </div>
              ) : nfts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 gap-3">
                  <div className="text-lg font-bold">No Wojaks Available</div>
                  <p className="text-secondary text-sm text-center">
                    All your Wojaks are already in the queue or in active battles.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                  {nfts.map((nft, index) => (
                    <motion.button
                      key={nft.nftId}
                      className="card p-0"
                      style={{
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: selectedId === nft.nftId
                          ? '2px solid var(--color-primary)'
                          : '2px solid transparent',
                        boxShadow: selectedId === nft.nftId
                          ? 'var(--glow-primary)'
                          : undefined,
                        textAlign: 'left',
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedId(nft.nftId)}
                    >
                      {/* Image */}
                      <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--color-bg)' }}>
                        {nft.imageUri ? (
                          <img
                            src={nft.imageUri}
                            alt={nft.name}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                            <span className="text-muted text-2xl">?</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2 flex flex-col gap-1">
                        <div className="text-xs font-semibold truncate">{nft.name}</div>

                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <span className="flex items-center gap-0.5">
                            <ThumbsUp size={10} /> {nft.likes}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <ThumbsDown size={10} /> {nft.dislikes}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted">
                          <Swords size={10} />
                          <span>
                            {nft.battleCount === 0
                              ? 'No battles'
                              : `${nft.battleCount} battle${nft.battleCount !== 1 ? 's' : ''} (${nft.battleWins}W)`}
                          </span>
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {selectedId === nft.nftId && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--color-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
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
              <div className="flex flex-col gap-2 p-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                {error && (
                  <div className="text-sm text-center" style={{ color: 'var(--color-error)' }}>{error}</div>
                )}
                <div className="flex gap-3">
                  <button className="btn btn-secondary flex-1" onClick={handleClose} disabled={queueing}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    disabled={!selectedId || queueing}
                    onClick={handleConfirm}
                  >
                    {queueing ? 'Queueing...' : 'Enter Battle Queue'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
