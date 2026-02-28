/**
 * Favorites Modal Component
 *
 * Modal for saving and managing favorite Wojaks.
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Heart, Trash2, Pencil, Check } from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import type { FavoriteWojak } from '@/types/generator';
import {
  modalBackdropVariants,
  modalContentVariants,
  favoriteCardVariants,
  favoriteGridVariants,
} from '@/config/generatorAnimations';

interface FavoritesModalProps {
  className?: string;
}

export function FavoritesModal({ className = '' }: FavoritesModalProps) {
  const {
    isFavoritesOpen,
    toggleFavorites,
    favorites,
    removeFavorite,
    renameFavorite,
    loadFavorite,
  } = useGenerator();
  const prefersReducedMotion = useReducedMotion();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFavorite(id);
  };

  const handleLoad = (favorite: FavoriteWojak) => {
    loadFavorite(favorite);
  };

  const handleStartEdit = (favorite: FavoriteWojak) => {
    setEditingId(favorite.id);
    setEditName(favorite.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      renameFavorite(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleClose = () => {
    toggleFavorites(false);
    setEditingId(null);
    setEditName('');
  };

  return (
    <AnimatePresence>
      {isFavoritesOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 z-50 ${className}`}
            style={{ background: 'var(--color-black-70)' }}
            variants={prefersReducedMotion ? undefined : modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:w-full sm:max-w-2xl sm:max-h-[80vh] rounded-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="favorites-modal-title"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            variants={prefersReducedMotion ? undefined : modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <Heart
                  size={20}
                  className="text-accent"
                />
                <h2
                  id="favorites-modal-title"
                  className="text-lg font-semibold text-primary"
                >
                  Favorites
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs text-muted"
                  style={{
                    background: 'var(--color-surface)',
                  }}
                >
                  {favorites.length}
                </span>
              </div>

              <button
                type="button"
                className="p-2 rounded-lg transition-colors text-secondary"
                style={{
                  background: 'var(--color-surface)',
                }}
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Favorites grid */}
              {favorites.length > 0 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  variants={prefersReducedMotion ? undefined : favoriteGridVariants}
                  initial="initial"
                  animate="animate"
                >
                  {favorites.map((favorite) => (
                    <motion.div
                      key={favorite.id}
                      className="relative rounded-xl overflow-hidden"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                      }}
                      variants={prefersReducedMotion ? undefined : favoriteCardVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      {/* Thumbnail */}
                      <button
                        type="button"
                        className="w-full aspect-square"
                        onClick={() => handleLoad(favorite)}
                      >
                        <img
                          src={favorite.thumbnailDataUrl}
                          alt={favorite.name}
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </button>

                      {/* Name and Actions */}
                      <div
                        className="px-2 py-2"
                        style={{
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        {editingId === favorite.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-2 py-1 rounded text-xs min-w-0 text-primary"
                              style={{
                                background: 'var(--color-bg)',
                                border: '1px solid var(--color-border)',
                              }}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(favorite.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <button
                              type="button"
                              className="p-1 rounded transition-colors flex-shrink-0 text-white"
                              style={{
                                background: 'var(--color-primary)',
                              }}
                              onClick={() => handleSaveEdit(favorite.id)}
                              title="Save"
                              aria-label="Save name"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded transition-colors flex-shrink-0 text-secondary"
                              style={{
                                background: 'var(--color-surface)',
                              }}
                              onClick={handleCancelEdit}
                              title="Cancel"
                              aria-label="Cancel rename"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span
                              className="flex-1 text-xs font-medium truncate text-primary"
                            >
                              {favorite.name}
                            </span>
                            <button
                              type="button"
                              className="p-1 rounded transition-colors flex-shrink-0 text-secondary"
                              style={{
                                background: 'var(--color-surface)',
                              }}
                              onClick={(e) => { e.stopPropagation(); handleStartEdit(favorite); }}
                              title="Edit name"
                              aria-label={`Rename ${favorite.name}`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              className="flex items-center justify-center rounded transition-colors flex-shrink-0 hover:!bg-[var(--color-error)] hover:!text-white text-error"
                              style={{
                                width: '24px',
                                height: '24px',
                                background: 'var(--color-surface)',
                              }}
                              onClick={(e) => handleDelete(e, favorite.id)}
                              title="Delete"
                              aria-label={`Delete ${favorite.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <Heart
                    size={48}
                    className="mx-auto mb-4 opacity-30 text-muted"
                  />
                  <p className="text-muted">
                    No favorites yet
                  </p>
                  <p className="text-sm mt-1 text-muted">
                    Create a design and save it here
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FavoritesModal;
