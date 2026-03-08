// src/components/generator/ai/AICreationsGallery.tsx

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import type { AIEnhancement } from '@/types/aiEnhance';

interface AICreationsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AICreationsGallery({ isOpen, onClose }: AICreationsGalleryProps) {
  const { creations, isLoadingCreations, fetchCreations } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [selectedCreation, setSelectedCreation] = useState<AIEnhancement | null>(null);

  // Reset selection when gallery closes so it opens fresh next time
  const handleClose = () => {
    setSelectedCreation(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      fetchCreations();
    }
  }, [isOpen, fetchCreations]);

  return (
    <Lightbox
      isOpen={isOpen}
      onClose={handleClose}
      title={selectedCreation ? 'AI Creation' : 'My AI Creations'}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Loading state */}
        {isLoadingCreations && (
          <div className="flex justify-center p-8">
            <p className="text-secondary">Loading your creations...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingCreations && creations.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8">
            <p className="text-secondary">No AI creations yet.</p>
            <p className="text-muted text-sm">Use "Enhance with AI" to create your first one!</p>
          </div>
        )}

        {/* Detail view */}
        {selectedCreation && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={`/api/ai/image/${selectedCreation.r2Key}`}
              alt={`AI ${selectedCreation.category} creation`}
              className="w-64 h-64 md:w-80 md:h-80 object-contain"
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
            <div className="text-center">
              <p className="text-sm font-semibold">{selectedCreation.category}</p>
              <p className="text-secondary text-xs">"{selectedCreation.prompt}"</p>
              <p className="text-muted text-xs mt-1">
                {new Date(selectedCreation.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              className="btn btn-ghost text-sm"
              onClick={() => setSelectedCreation(null)}
            >
              ← Back to gallery
            </button>
          </div>
        )}

        {/* Grid view */}
        {!selectedCreation && !isLoadingCreations && creations.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {creations.map((creation) => (
              <motion.button
                key={creation.id}
                className="card p-1 overflow-hidden"
                onClick={() => setSelectedCreation(creation)}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <img
                  src={`/api/ai/image/${creation.r2Key}`}
                  alt={`AI ${creation.category}`}
                  className="w-full aspect-square object-cover"
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
                <p className="text-muted text-xs text-center mt-1 truncate px-1">
                  {creation.prompt}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </Lightbox>
  );
}
