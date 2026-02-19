/**
 * FightClubGuideModal - Combat guide as modal overlay
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Zap, Shield, Sparkles } from 'lucide-react';
import { COMBAT_TYPES } from '@/lib/combat/types';
import { TYPE_COLORS, DARK_TEXT_TYPES } from '@/lib/combat/data/type-colors';

interface FightClubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FightClubGuideModal({ isOpen, onClose }: FightClubGuideModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between p-4 border-b"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <Swords size={20} className="text-primary" />
                <h2 className="text-lg font-bold">Combat Guide</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-4">
              {/* Combat Types */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  18 Combat Types
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COMBAT_TYPES.map((type) => (
                    <div
                      key={type}
                      className="text-center p-2 rounded-lg text-xs font-medium"
                      style={{
                        background: TYPE_COLORS[type],
                        color: DARK_TEXT_TYPES.includes(type) ? '#000' : '#fff',
                      }}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Tips */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-cyan" />
                  Quick Tips
                </h3>
                <ul className="text-sm text-secondary space-y-2">
                  <li>Type matchups deal 2x or 0.5x damage</li>
                  <li>Natures boost one stat +10%, reduce another -10%</li>
                  <li>Abilities provide passive bonuses in battle</li>
                  <li>Power increases with wins and votes received</li>
                </ul>
              </section>

              {/* How to Play */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-gold" />
                  How to Play
                </h3>
                <div className="text-sm text-secondary space-y-2">
                  <p><strong>Vote:</strong> Rate Wojaks to earn points and shape rankings. No NFT required.</p>
                  <p><strong>Battle:</strong> Turn-based combat using your minted Wojaks. Wins earn Power.</p>
                  <p><strong>Rankings:</strong> See top fighters by Power level.</p>
                  <p><strong>Burn:</strong> Sacrifice Wojaks to boost others or earn rewards.</p>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
