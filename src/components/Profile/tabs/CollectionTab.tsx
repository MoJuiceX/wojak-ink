/**
 * CollectionTab Component (SPEC 15)
 *
 * Shows all purchased items from the shop (Achievement Drawer content).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';

interface CollectionItem {
  id: string;
  name: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  css_class?: string;
}

interface CollectionTabProps {
  items: CollectionItem[];
  totalSpent?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'emoji_badge', label: 'Emojis' },
  { id: 'frame', label: 'Frames' },
  { id: 'title', label: 'Titles' },
  { id: 'name_effect', label: 'Effects' },
  { id: 'background', label: 'Backgrounds' },
  { id: 'bigpulp', label: 'BigPulp' },
];

export function CollectionTab({ items, totalSpent = 0 }: CollectionTabProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Filter items
  const filteredItems = activeFilter === 'all'
    ? items
    : activeFilter === 'bigpulp'
    ? items.filter(item => item.category.startsWith('bigpulp'))
    : items.filter(item => item.category === activeFilter);

  // Get category counts
  const getCategoryCount = (category: string): number => {
    if (category === 'all') return items.length;
    if (category === 'bigpulp') {
      return items.filter(item => item.category.startsWith('bigpulp')).length;
    }
    return items.filter(item => item.category === category).length;
  };

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="collection-header">
        <div className="section-header">
          <Package size={20} className="section-icon" />
          <h2 className="section-title">Collection</h2>
        </div>
        <div className="collection-stats">
          <span className="collection-stat">
            <strong>{items.length}</strong> Items
          </span>
          {totalSpent > 0 && (
            <span className="collection-stat">
              <strong>{totalSpent.toLocaleString()}</strong> 🍊 Spent
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="collection-filters">
        {FILTERS.map(filter => {
          const count = getCategoryCount(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              className={`collection-filter ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
              {count > 0 && <span className="filter-count"> ({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filteredItems.length > 0 ? (
        <motion.div className="collection-grid" layout>
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                className="collection-item"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ y: -4 }}
                style={{ '--rarity-color': RARITY_COLORS[item.rarity] } as React.CSSProperties}
              >
                <span
                  className="collection-item-rarity"
                  style={{ background: RARITY_COLORS[item.rarity] }}
                >
                  {item.rarity}
                </span>

                <span className="collection-item-icon">
                  {item.icon || (item.category === 'frame' ? '🖼️' : '✨')}
                </span>

                <span className="collection-item-name">{item.name}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="empty-state">
          <span className="empty-state-icon">📦</span>
          <h3 className="empty-state-title">No items yet</h3>
          <p className="empty-state-text">
            Visit the shop to start building your collection!
          </p>
        </div>
      )}

      <style>{`
        .filter-count {
          opacity: 0.6;
          font-size: 0.75em;
        }
      `}</style>
    </div>
  );
}
