// src/components/generator/ai/AICreationsGallery.tsx

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import type { AIEnhancement } from '@/types/aiEnhance';

interface AICreationsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AICreationsGallery({ isOpen, onClose }: AICreationsGalleryProps) {
  const { creations, isLoadingCreations, fetchCreations, loadImageForEnhancing, sessionToken } = useAIEnhance();
  const prefersReducedMotion = useReducedMotion();
  const [selectedCreation, setSelectedCreation] = useState<AIEnhancement | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Build authenticated image URL (token in query param for <img> tags)
  const imageUrl = (r2Key: string) =>
    sessionToken ? `/api/ai/image/${r2Key}?token=${sessionToken}` : `/api/ai/image/${r2Key}`;

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

  // Fetch the R2 image, convert to base64 data URL, load into AI wizard
  const handleContinueEnhancing = useCallback(async (creation: AIEnhancement) => {
    if (creation.isLegacy || !creation.generatorSnapshot) return;
    setIsLoadingImage(true);
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      const res = await fetch(`/api/ai/image/${creation.r2Key}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch image');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        loadImageForEnhancing(dataUrl, creation.aiTraitOverrides, creation.generatorSnapshot);
        setSelectedCreation(null);
        onClose();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load creation for enhancing:', err);
    } finally {
      setIsLoadingImage(false);
    }
  }, [loadImageForEnhancing, onClose, sessionToken]);

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
              src={imageUrl(selectedCreation.r2Key)}
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
              {selectedCreation.isLegacy && (
                <p className="text-muted text-xs mt-2">
                  Legacy creation. View or download only.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary text-sm"
                onClick={() => handleContinueEnhancing(selectedCreation)}
                disabled={isLoadingImage || selectedCreation.isLegacy}
              >
                <Wand2 size={14} />
                <span>
                  {selectedCreation.isLegacy
                    ? 'Minting unavailable'
                    : isLoadingImage
                      ? 'Loading...'
                      : 'Continue Enhancing'}
                </span>
              </button>
              <button
                className="btn btn-ghost text-sm"
                onClick={() => setSelectedCreation(null)}
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Grid view */}
        {!selectedCreation && !isLoadingCreations && creations.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {creations.map((creation) => (
              <motion.button
                type="button"
                key={creation.id}
                className="card p-1 overflow-hidden"
                onClick={() => setSelectedCreation(creation)}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <img
                  src={imageUrl(creation.r2Key)}
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
