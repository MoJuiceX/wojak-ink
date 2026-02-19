/**
 * Drawer Editor Component (SPEC 12B)
 *
 * Granular customization editor for Achievement Drawer.
 * Purchase and apply customization options.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, X, Type, Image, User, MessageSquare,
  LayoutGrid, Square, Sparkles, Eye, Lock, Check, ChevronRight
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import '@/styles/drawer-customization.css';

interface CatalogItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price_oranges: number;
  css_class: string | null;
  css_value: string | null;
  sort_order: number;
}

interface CategoryData {
  label: string;
  items: CatalogItem[];
}

interface DrawerCustomization {
  font_color: string;
  font_style: string;
  font_family: string;
  page_background: string;
  avatar_glow: string;
  avatar_size: string;
  bigpulp_position: string;
  dialogue_style: string;
  dialogue_color: string;
  stats_style: string;
  stats_color: string;
  stats_visible: string;
  collection_layout: string;
  card_style: string;
  featured_slots: number;
  featured_items: string | null;
  category_tabs_style: string;
  page_theme: string;
  page_border: string;
  entrance_animation: string;
  background_music: string | null;
  visitor_counter_style: string;
}

// Category sections for organized UI
const CATEGORY_SECTIONS = [
  {
    id: 'typography',
    label: 'Typography',
    icon: Type,
    categories: ['font_color', 'font_style', 'font_family'],
  },
  {
    id: 'background',
    label: 'Background',
    icon: Image,
    categories: ['page_background'],
  },
  {
    id: 'avatar',
    label: 'Avatar',
    icon: User,
    categories: ['avatar_glow', 'avatar_size'],
  },
  {
    id: 'bigpulp',
    label: 'BigPulp',
    icon: MessageSquare,
    categories: ['bigpulp_position', 'dialogue_style'],
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: LayoutGrid,
    categories: ['collection_layout', 'card_style', 'category_tabs_style'],
  },
  {
    id: 'effects',
    label: 'Effects',
    icon: Sparkles,
    categories: ['entrance_animation', 'stats_style', 'visitor_counter_style'],
  },
];

// Preview color mapping for font colors
const PREVIEW_COLORS: Record<string, string> = {
  orange: '#F97316',
  white: '#FFFFFF',
  red: '#EF4444',
  yellow: '#FBBF24',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#EC4899',
  cyan: '#06B6D4',
  black: '#1A1A1A',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

// Preview backgrounds - solid colors
const BACKGROUND_PREVIEWS: Record<string, string> = {
  midnight_black: '#0a0a0a',
  deep_navy: '#0a1628',
  forest_green: '#0a1f0a',
  wine_red: '#1f0a0a',
  royal_purple: '#1a0a28',
  charcoal: '#1a1a1a',
  // Gradients
  gradient_sunset: 'linear-gradient(135deg, #0a0a0a 0%, #4a1942 50%, #0a1628 100%)',
  gradient_ocean: 'linear-gradient(135deg, #0a1628 0%, #0a4a4a 50%, #0a0a1f 100%)',
  gradient_aurora: 'linear-gradient(135deg, #1a0a28 0%, #0a281a 50%, #0a1f4a 100%)',
  gradient_ember: 'linear-gradient(135deg, #0a0a0a 0%, #3d0a0a 50%, #4a2800 100%)',
  gradient_golden: 'linear-gradient(135deg, #0a0a0a 0%, #3d3d00 50%, #4a2800 100%)',
  // Patterns
  pattern_grid: '#0a0a0a',
  pattern_dots: '#0a0a0a',
  pattern_diagonal: '#0a0a0a',
  pattern_hexagons: '#0a0a0a',
  pattern_circuit: '#0a0a0a',
  pattern_stars: '#0a0a0a',
  // Animated
  anim_floating_oranges: '#0a0a0a',
  anim_particles: '#0a0a0a',
  anim_matrix: '#0a0a0a',
  anim_starfield: 'linear-gradient(to bottom, #0a1628, #0a0a0a)',
  anim_aurora: 'linear-gradient(to bottom, #0a0a0a, #0a1f0a)',
  anim_grove: 'linear-gradient(to bottom, #0a0a0a, #1f2a0a)',
  // Legendary
  legendary_void: 'radial-gradient(ellipse at center, #1a0a28 0%, #0a0a0a 70%)',
  legendary_supernova: 'radial-gradient(ellipse at center, #2a1a0a 0%, #0a0a0a 60%)',
  legendary_holographic: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 25%, #0a1a2a 50%, #2a1a0a 75%, #0a0a1a 100%)',
};

interface DrawerEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DrawerEditor({ isOpen, onClose }: DrawerEditorProps) {
  const { getToken, userId } = useAuth();
  const { refreshBalance, currency } = useCurrency();
  const [catalog, setCatalog] = useState<Record<string, CategoryData>>({});
  const [owned, setOwned] = useState<Record<string, string[]>>({});
  const [customization, setCustomization] = useState<DrawerCustomization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('typography');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch catalog and user customization
  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [catalogRes, customRes] = await Promise.all([
        fetch('/api/customization/catalog'),
        fetch('/api/drawer/customization', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const catalogData = await catalogRes.json();
      const customData = await customRes.json();

      if (catalogData.categories) {
        setCatalog(catalogData.categories);
      }
      if (customData.customization) {
        setCustomization(customData.customization);
      }
      if (customData.owned) {
        setOwned(customData.owned);
      }
    } catch (err) {
      console.error('[DrawerEditor] Failed to fetch data:', err);
      setMessage({ type: 'error', text: 'Failed to load customization options' });
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Check if item is owned
  const isOwned = (category: string, itemId: string): boolean => {
    return owned[category]?.includes(itemId) ?? false;
  };

  // Check if item is currently selected
  const isSelected = (category: string, itemId: string): boolean => {
    if (!customization) return false;
    const value = customization[category as keyof DrawerCustomization];
    return value === itemId;
  };

  // Check if user can afford item
  const canAfford = (price: number): boolean => {
    return (currency?.oranges ?? 0) >= price;
  };

  // Purchase item
  const handlePurchase = async (category: string, itemId: string) => {
    setPurchasingId(itemId);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/drawer/customization/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, itemId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Update owned state
      setOwned(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), itemId],
      }));

      // Refresh balance
      refreshBalance();

      setMessage({ type: 'success', text: `Purchased ${data.item}!` });

      // Auto-equip after purchase
      await handleSelect(category, itemId);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Purchase failed' });
    } finally {
      setPurchasingId(null);
    }
  };

  // Select/equip item
  const handleSelect = async (category: string, itemId: string) => {
    if (!isOwned(category, itemId)) return;

    setSavingField(category);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/drawer/customization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [category]: itemId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      // Update local state
      setCustomization(prev => prev ? { ...prev, [category]: itemId } : null);
      setMessage({ type: 'success', text: 'Saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSavingField(null);
    }
  };

  // Render preview for an item
  const renderPreview = (item: CatalogItem) => {
    const { category, id } = item;

    // Font colors
    if (category === 'font_color') {
      if (id.startsWith('gradient-')) {
        return (
          <div
            className={`preview-swatch preview-gradient font-${id}`}
            style={{ background: `var(--font-gradient-${id.replace('gradient-', '')})` }}
          />
        );
      }
      return (
        <div
          className="preview-swatch"
          style={{ background: PREVIEW_COLORS[id] || '#F97316' }}
        />
      );
    }

    // Font styles
    if (category === 'font_style') {
      return (
        <span className={`preview-text font-style-${id}`}>Aa</span>
      );
    }

    // Font families
    if (category === 'font_family') {
      return (
        <span className={`preview-text font-family-${id}`}>Abc</span>
      );
    }

    // Backgrounds
    if (category === 'page_background') {
      const bgStyle = BACKGROUND_PREVIEWS[id] || '#0a0a0a';
      return (
        <div
          className="preview-bg"
          style={{ background: bgStyle }}
        />
      );
    }

    // Avatar glow
    if (category === 'avatar_glow') {
      return (
        <div className={`preview-avatar avatar-glow-${id}`}>
          <span>🍊</span>
        </div>
      );
    }

    // Avatar size
    if (category === 'avatar_size') {
      const sizes: Record<string, string> = { small: '20px', normal: '28px', large: '36px', huge: '44px' };
      return (
        <div className="preview-avatar" style={{ width: sizes[id], height: sizes[id] }}>
          <span style={{ fontSize: sizes[id] === '44px' ? '1.5rem' : '1rem' }}>🍊</span>
        </div>
      );
    }

    // BigPulp position
    if (category === 'bigpulp_position') {
      const positions: Record<string, string> = {
        left: '🍊←',
        right: '→🍊',
        center: '↔🍊',
        hidden: '🚫',
      };
      return <span className="preview-icon">{positions[id] || '🍊'}</span>;
    }

    // Dialogue style
    if (category === 'dialogue_style') {
      return (
        <div className={`preview-dialogue dialogue-${id}`}>
          <span>Hi!</span>
        </div>
      );
    }

    // Collection layout
    if (category === 'collection_layout') {
      const layouts: Record<string, React.ReactNode> = {
        grid: <LayoutGrid size={20} />,
        list: <Square size={20} />,
        compact: <div className="preview-compact">▪▪▪</div>,
        masonry: <div className="preview-masonry">▪▫▪</div>,
        carousel: <div className="preview-carousel">◀▪▶</div>,
      };
      return <span className="preview-icon">{layouts[id] || <LayoutGrid size={20} />}</span>;
    }

    // Card style
    if (category === 'card_style') {
      return (
        <div className={`preview-card card-${id}`}>
          <span>🍊</span>
        </div>
      );
    }

    // Category tabs
    if (category === 'category_tabs_style') {
      return (
        <div className={`preview-tabs tabs-${id}`}>
          <span className="tab active">Tab</span>
        </div>
      );
    }

    // Entrance animation
    if (category === 'entrance_animation') {
      return (
        <motion.div
          className="preview-animation"
          animate={id === 'none' ? {} : { scale: [0.8, 1], opacity: [0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <Sparkles size={20} />
        </motion.div>
      );
    }

    // Stats style
    if (category === 'stats_style') {
      return (
        <div className={`preview-stats stats-${id}`}>
          <span>42</span>
        </div>
      );
    }

    // Visitor counter
    if (category === 'visitor_counter_style') {
      return (
        <div className={`preview-visitor visitor-${id}`}>
          <Eye size={14} />
          <span>123</span>
        </div>
      );
    }

    return <Sparkles size={20} />;
  };

  // Get items for a category
  const getCategoryItems = (categoryId: string): CatalogItem[] => {
    return catalog[categoryId]?.items || [];
  };

  // Get label for a category
  const getCategoryLabel = (categoryId: string): string => {
    return catalog[categoryId]?.label || categoryId;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="drawer-editor-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="drawer-editor"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-editor-title"
        >
          {/* Header */}
          <header className="editor-header">
            <h2 id="drawer-editor-title">Customize Profile Card</h2>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <X size={24} />
            </button>
          </header>

          {/* Balance */}
          <div className="editor-balance">
            <span className="balance-label">Balance:</span>
            <span className="balance-amount">
              <span className="orange-icon">🍊</span>
              {currency?.oranges?.toLocaleString() || 0}
            </span>
          </div>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                className={`editor-message ${message.type}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? (
            <div className="editor-loading">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={32} />
              </motion.div>
              <span>Loading options...</span>
            </div>
          ) : (
            <div className="editor-content">
              {/* Section Navigation */}
              <nav className="editor-nav">
                {CATEGORY_SECTIONS.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      className={`nav-btn ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon size={18} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Options Panel */}
              <div className="editor-panel">
                {CATEGORY_SECTIONS.filter(s => s.id === activeSection).map(section => (
                  <div key={section.id} className="panel-section">
                    {section.categories.map(categoryId => {
                      const items = getCategoryItems(categoryId);
                      if (items.length === 0) return null;

                      return (
                        <div key={categoryId} className="category-group">
                          <h3 className="category-label">{getCategoryLabel(categoryId)}</h3>
                          <div className="items-grid">
                            {items.map(item => {
                              const owned = isOwned(categoryId, item.id);
                              const selected = isSelected(categoryId, item.id);
                              const affordable = canAfford(item.price_oranges);
                              const isPurchasing = purchasingId === item.id;
                              const isSaving = savingField === categoryId && selected;

                              return (
                                <motion.button
                                  key={item.id}
                                  className={`item-btn ${owned ? 'owned' : ''} ${selected ? 'selected' : ''} ${!owned && !affordable ? 'unaffordable' : ''}`}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => owned ? handleSelect(categoryId, item.id) : handlePurchase(categoryId, item.id)}
                                  disabled={isPurchasing || isSaving || (!owned && !affordable)}
                                >
                                  <div className="item-preview">
                                    {renderPreview(item)}
                                  </div>
                                  <div className="item-info">
                                    <span className="item-name">{item.name}</span>
                                    {!owned && (
                                      <span className="item-price">
                                        <span className="orange-icon">🍊</span>
                                        {item.price_oranges.toLocaleString()}
                                      </span>
                                    )}
                                    {owned && !selected && (
                                      <span className="item-owned">Owned</span>
                                    )}
                                    {selected && (
                                      <span className="item-selected">
                                        <Check size={14} />
                                        Equipped
                                      </span>
                                    )}
                                  </div>
                                  {!owned && !affordable && (
                                    <div className="item-locked">
                                      <Lock size={14} />
                                    </div>
                                  )}
                                  {(isPurchasing || isSaving) && (
                                    <div className="item-loading">
                                      <Loader2 size={16} className="spin" />
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Drawer Link */}
          {userId && (
            <a href={`/drawer/${userId}`} className="view-drawer-link" target="_blank" rel="noopener noreferrer">
              View Your Drawer
              <ChevronRight size={16} />
            </a>
          )}
        </motion.div>
      </motion.div>

      <style>{`
        .drawer-editor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .drawer-editor {
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          background: rgba(20, 20, 28, 0.98);
          border: 1px solid var(--color-white-10);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 
            0 20px 60px var(--color-black-50),
            0 0 0 1px var(--color-white-5);
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 12px;
          border-bottom: 1px solid var(--color-white-8);
        }

        .editor-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .close-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-white-8);
          border: none;
          border-radius: 12px;
          color: var(--color-white-60);
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: var(--color-white-15);
          color: #fff;
        }

        .editor-balance {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--color-primary-10);
          border-bottom: 1px solid var(--color-white-5);
        }

        .balance-label {
          color: var(--color-white-50);
          font-size: 0.85rem;
        }

        .balance-amount {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          color: #f97316;
          font-size: 1.1rem;
        }

        .orange-icon {
          font-size: 1rem;
        }

        .editor-message {
          padding: 12px 20px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .editor-message.success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .editor-message.error {
          background: var(--color-error-15);
          color: #ef4444;
        }

        .editor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
          color: var(--color-white-50);
        }

        .editor-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .editor-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 8px;
          background: var(--color-black-20);
          border-right: 1px solid var(--color-white-5);
          overflow-y: auto;
        }

        .nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--color-white-50);
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .nav-btn:hover {
          background: var(--color-white-8);
          color: rgba(255, 255, 255, 0.8);
        }

        .nav-btn.active {
          background: var(--color-primary-15);
          color: #f97316;
        }

        .editor-panel {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .category-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-label {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-white-60);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }

        .item-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 14px 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--color-white-8);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .item-btn:hover:not(:disabled) {
          background: var(--color-white-8);
          border-color: var(--color-white-15);
        }

        .item-btn.owned {
          border-color: var(--color-primary-20);
        }

        .item-btn.selected {
          background: rgba(249, 115, 22, 0.12);
          border-color: var(--color-primary-40);
        }

        .item-btn.unaffordable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .item-btn:disabled {
          cursor: not-allowed;
        }

        .item-preview {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-swatch {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 2px solid var(--color-white-10);
        }

        .preview-gradient {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .preview-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .preview-bg {
          width: 48px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--color-white-10);
        }

        .preview-avatar {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--color-white-10);
        }

        .preview-icon {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .preview-dialogue {
          padding: 4px 10px;
          background: var(--color-white-10);
          border-radius: 8px;
          font-size: 0.75rem;
          color: #fff;
        }

        .preview-card {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-white-5);
          border-radius: 8px;
          border: 1px solid var(--color-white-10);
        }

        .preview-tabs {
          display: flex;
          gap: 4px;
        }

        .preview-tabs .tab {
          padding: 2px 8px;
          background: var(--color-white-10);
          border-radius: 6px;
          font-size: 0.65rem;
          color: var(--color-white-60);
        }

        .preview-tabs .tab.active {
          background: var(--color-primary-30);
          color: #fff;
        }

        .preview-animation {
          color: #f97316;
        }

        .preview-stats {
          padding: 4px 10px;
          background: var(--color-white-10);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
        }

        .preview-visitor {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--color-white-10);
          border-radius: 6px;
          font-size: 0.7rem;
          color: var(--color-white-60);
        }

        .preview-compact {
          font-size: 0.7rem;
          letter-spacing: 2px;
        }

        .preview-masonry {
          font-size: 0.7rem;
          letter-spacing: 2px;
        }

        .preview-carousel {
          font-size: 0.7rem;
          letter-spacing: 1px;
        }

        .item-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .item-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          line-height: 1.2;
        }

        .item-price {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #f97316;
        }

        .item-owned {
          font-size: 0.7rem;
          color: var(--color-white-40);
        }

        .item-selected {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #22c55e;
        }

        .item-locked {
          position: absolute;
          top: 8px;
          right: 8px;
          color: var(--color-white-30);
        }

        .item-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-black-50);
          border-radius: 14px;
          color: #f97316;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .view-drawer-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 20px;
          background: var(--color-primary-10);
          border-top: 1px solid var(--color-white-5);
          color: #f97316;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .view-drawer-link:hover {
          background: var(--color-primary-15);
        }

        /* Mobile adjustments */
        @media (max-width: 639px) {
          .drawer-editor-overlay {
            padding: 0;
          }

          .drawer-editor {
            width: 100%;
            max-width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            border: none;
          }

          .editor-header {
            padding-top: calc(20px + env(safe-area-inset-top, 0));
          }

          .view-drawer-link {
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
          }

          .editor-nav {
            padding: 8px 4px;
          }

          .nav-btn {
            padding: 10px 12px;
            font-size: 0.65rem;
          }

          .items-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

export default DrawerEditor;
