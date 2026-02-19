/**
 * Achievement Drawer Page (SPEC 12 + 12B) - Redesigned
 *
 * Public showcase of a user's Tang Gang collection.
 * Shareable link: /drawer/:userId
 * Supports full customization via SPEC 12B.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Share2, ArrowLeft, Trophy, Sparkles, Crown, Star, ShoppingBag, Package, Zap } from 'lucide-react';
import { BigPulp } from '@/components/Shop/BigPulp';
import type { BigPulpMood } from '@/components/Shop/BigPulp';
import { PageSEO } from '@/components/seo';
import '@/styles/drawer-customization.css';

interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  category: string;
  rarity: string;
  css_class: string | null;
  emoji: string | null;
  acquired_at: string;
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

interface DrawerData {
  userId: string;
  username: string;
  totalItems: number;
  totalSpent: number;
  emojiRing: Record<string, string>;
  ownedEmojis: string[];
  frames: InventoryItem[];
  titles: InventoryItem[];
  nameEffects: InventoryItem[];
  backgrounds: InventoryItem[];
  celebrations: InventoryItem[];
  bigpulp: {
    current_hat: string | null;
    current_mood: string;
    current_accessory: string | null;
  };
  bigpulpItems: {
    hats: InventoryItem[];
    moods: InventoryItem[];
    accessories: InventoryItem[];
  };
  equipped: {
    frame: { id: string; name: string; css_class: string } | null;
    title: { id: string; name: string } | null;
    nameEffect: { id: string; name: string; css_class: string } | null;
    background: { id: string; name: string; css_class: string } | null;
  };
  bigpulpComment: string;
  bigpulpMood: string;
  customization?: DrawerCustomization;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_GRADIENTS: Record<string, string> = {
  common: 'from-gray-500/20 to-gray-600/10',
  uncommon: 'from-green-500/20 to-green-600/10',
  rare: 'from-blue-500/20 to-blue-600/10',
  epic: 'from-purple-500/20 to-purple-600/10',
  legendary: 'from-amber-500/20 to-orange-600/10',
};

export default function Drawer() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<DrawerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const fetchDrawer = async () => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/drawer/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
          } else {
            setError('Failed to load drawer');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (_err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrawer();
  }, [userId]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${data?.username}'s Tang Gang Collection`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share
    }
  };

  if (isLoading) {
    return (
      <div className="drawer-page drawer-loading-page">
        <div className="drawer-loading">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={48} className="text-orange-500" />
          </motion.div>
          <span>Loading collection...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="drawer-page drawer-error-page">
        <div className="drawer-error">
          <motion.span
            className="error-emoji"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            😢
          </motion.span>
          <h2>{error || 'Something went wrong'}</h2>
          <p>This drawer doesn't exist or couldn't be loaded.</p>
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const hasCollection = data.totalItems > 0;
  const cust = data.customization;

  // Build customization classes
  const bgClass = cust?.page_background
    ? `drawer-bg-${cust.page_background.replace(/_/g, '-')}`
    : (data.equipped?.background?.css_class || '');
  const entranceClass = cust?.entrance_animation && cust.entrance_animation !== 'none'
    ? `entrance-${cust.entrance_animation}`
    : '';
  const fontStyleClass = cust?.font_style && cust.font_style !== 'normal'
    ? `font-style-${cust.font_style.replace(/_/g, '-')}`
    : '';
  const fontFamilyClass = cust?.font_family && cust.font_family !== 'default'
    ? `font-family-${cust.font_family.replace(/_/g, '-')}`
    : '';
  const avatarGlowClass = cust?.avatar_glow && cust.avatar_glow !== 'none'
    ? `avatar-glow-${cust.avatar_glow}`
    : '';
  const avatarSizeClass = cust?.avatar_size && cust.avatar_size !== 'normal'
    ? `avatar-size-${cust.avatar_size}`
    : '';
  const cardStyleClass = cust?.card_style && cust.card_style !== 'default'
    ? `card-${cust.card_style}`
    : 'card-default';
  const layoutClass = cust?.collection_layout && cust.collection_layout !== 'grid'
    ? `layout-${cust.collection_layout}`
    : 'layout-grid';
  const statsStyleClass = cust?.stats_style && cust.stats_style !== 'default'
    ? `stats-${cust.stats_style}`
    : 'stats-default';
  const tabsStyleClass = cust?.category_tabs_style && cust.category_tabs_style !== 'default'
    ? `tabs-${cust.category_tabs_style}`
    : 'tabs-default';
  // Note: dialogueStyleClass would be used if BigPulp supported it
  const bigpulpPositionClass = cust?.bigpulp_position
    ? `bigpulp-${cust.bigpulp_position}`
    : 'bigpulp-right';

  // Get font color style
  const getFontColorStyle = (): React.CSSProperties => {
    if (!cust?.font_color || cust.font_color === 'orange') {
      return {};
    }
    // Check if it's a gradient
    if (cust.font_color.startsWith('gradient-')) {
      return {
        background: 'var(--font-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }
    // Solid color mapping
    const colorMap: Record<string, string> = {
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
    return { color: colorMap[cust.font_color] || '#F97316' };
  };

  // Combine all items for "all" tab
  const allItems = [
    ...data.frames,
    ...data.titles,
    ...data.nameEffects,
    ...data.backgrounds,
    ...data.celebrations,
    ...data.bigpulpItems.hats,
    ...data.bigpulpItems.accessories,
  ];

  const tabs = [
    { id: 'all', label: 'All', count: allItems.length, icon: Package },
    { id: 'emojis', label: 'Emojis', count: data.ownedEmojis.length, icon: Star },
    { id: 'frames', label: 'Frames', count: data.frames.length, icon: Crown },
    { id: 'effects', label: 'Effects', count: data.nameEffects.length, icon: Sparkles },
    { id: 'bigpulp', label: 'BigPulp', count: data.bigpulpItems.hats.length + data.bigpulpItems.accessories.length, icon: Zap },
  ];

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'emojis': return data.ownedEmojis.map((e, i) => ({ id: `emoji-${i}`, name: e, emoji: e, rarity: 'common', category: 'emoji' }));
      case 'frames': return data.frames;
      case 'effects': return [...data.nameEffects, ...data.backgrounds, ...data.celebrations];
      case 'bigpulp': return [...data.bigpulpItems.hats, ...data.bigpulpItems.accessories];
      default: return allItems;
    }
  };

  return (
    <div className={`drawer-page ${bgClass} ${entranceClass}`}>
      <PageSEO
        title="My Collection"
        description="Browse your Wojak NFTs and manage your collection."
        path="/drawer"
        noIndex
      />
      {/* Animated Background Overlay */}
      <div className="drawer-bg-overlay" />

      {/* Header */}
      <header className="drawer-header">
        <Link to="/" className="back-button">
          <ArrowLeft size={20} />
        </Link>
        <h1>Achievement Drawer</h1>
        <motion.button
          onClick={handleShare}
          className="share-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copied ? 'Copied!' : <Share2 size={20} />}
        </motion.button>
      </header>

      {/* Hero Banner */}
      <section className="drawer-hero">
        <div className="hero-glow" />

        {/* BigPulp Mascot */}
        {bigpulpPositionClass !== 'bigpulp-hidden' && (
          <motion.div
            className={`hero-bigpulp ${bigpulpPositionClass} ${avatarGlowClass} ${avatarSizeClass}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
          >
            <div className={`bigpulp-frame ${data.equipped?.frame?.css_class || ''}`}>
              <BigPulp
                hat={data.bigpulp.current_hat}
                mood={data.bigpulpMood as BigPulpMood}
                accessory={data.bigpulp.current_accessory}
                size="large"
                dialogue={data.bigpulpComment}
                showDialogue={true}
              />
            </div>
          </motion.div>
        )}

        {/* User Info */}
        <motion.div
          className="hero-user-info"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2
            className={`hero-username ${fontStyleClass} ${fontFamilyClass} ${data.equipped?.nameEffect?.css_class || ''}`}
            style={getFontColorStyle()}
            data-text={data.username}
          >
            {data.username}
          </h2>
          {data.equipped?.title && (
            <span className="hero-title">"{data.equipped.title.name}"</span>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className={`hero-stats ${statsStyleClass}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-card">
            <div className="stat-icon">
              <Trophy size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{data.totalItems}</span>
              <span className="stat-label">Items</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Star size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{data.ownedEmojis.length}</span>
              <span className="stat-label">Emojis</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <span className="stat-emoji">🍊</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{data.totalSpent.toLocaleString()}</span>
              <span className="stat-label">Spent</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Collection Section */}
      <section className="drawer-collection">
        {!hasCollection ? (
          <motion.div
            className="empty-collection"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="empty-icon">
              <motion.span
                animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                📦
              </motion.span>
            </div>
            <h3>Empty Drawer</h3>
            <p>This collection is waiting to be filled with awesome items!</p>
            <Link to="/shop" className="shop-cta">
              <ShoppingBag size={18} />
              Visit the Shop
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Category Tabs */}
            <div className={`collection-tabs ${tabsStyleClass}`}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    <span className="tab-count">{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Items Grid */}
            <motion.div
              className={`collection-grid ${layoutClass}`}
              layout
            >
              <AnimatePresence mode="popLayout">
                {getFilteredItems().map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (item: any, index: number) => (
                  <motion.div
                    key={item.id}
                    className={`collection-card collection-item ${cardStyleClass} ${RARITY_GRADIENTS[item.rarity] || ''}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    style={{ '--rarity-color': RARITY_COLORS[item.rarity] } as React.CSSProperties}
                  >
                    <div className="card-rarity" style={{ background: RARITY_COLORS[item.rarity] }}>
                      {item.rarity}
                    </div>

                    <div className="card-preview">
                      {item.emoji ? (
                        <span className="preview-emoji">{item.emoji}</span>
                      ) : item.css_class ? (
                        item.category === 'frame' ? (
                          <div className={`preview-frame ${item.css_class}`}>🍊</div>
                        ) : item.category === 'name_effect' ? (
                          <span className={`preview-effect ${item.css_class}`} data-text="Abc">Abc</span>
                        ) : item.category === 'background' ? (
                          <div className={`preview-bg ${item.css_class}`} />
                        ) : (
                          <Sparkles size={32} />
                        )
                      ) : (
                        <Package size={32} />
                      )}
                    </div>

                    <span className="card-name">{item.name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </section>

      <style>{`
        .drawer-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%);
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }

        .drawer-bg-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(249, 115, 22, 0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .drawer-loading-page,
        .drawer-error-page {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drawer-loading,
        .drawer-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
          color: var(--color-white-60);
          text-align: center;
          padding: 20px;
        }

        .drawer-error .error-emoji {
          font-size: 5rem;
        }

        .drawer-error h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }

        .drawer-error p {
          margin: 0;
          color: var(--color-white-50);
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f97316;
          text-decoration: none;
          font-size: 0.9rem;
          margin-top: 16px;
          padding: 10px 20px;
          background: var(--color-primary-10);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .back-link:hover {
          background: var(--color-primary-20);
        }

        /* Header */
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 18, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-white-5);
        }

        .drawer-header h1 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .back-button,
        .share-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--color-white-10);
          border-radius: 12px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          font-size: 0.75rem;
        }

        .back-button:hover,
        .share-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* Hero Section */
        .drawer-hero {
          position: relative;
          padding: 40px 20px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .hero-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, var(--color-primary-15) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-bigpulp {
          position: relative;
          z-index: 1;
        }

        .bigpulp-frame {
          padding: 12px;
          border-radius: 50%;
          background: var(--color-white-3);
        }

        .hero-user-info {
          text-align: center;
          z-index: 1;
        }

        .hero-username {
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #fff 0%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-title {
          display: block;
          margin-top: 4px;
          font-size: 0.9rem;
          color: var(--color-white-60);
          font-style: italic;
        }

        /* Stats Cards */
        .hero-stats {
          display: flex;
          gap: 12px;
          z-index: 1;
          flex-wrap: wrap;
          justify-content: center;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: var(--color-white-5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          min-width: 120px;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-20), rgba(234, 88, 12, 0.1));
          border-radius: 12px;
          color: #f97316;
        }

        .stat-icon.orange {
          background: linear-gradient(135deg, var(--color-primary-30), rgba(234, 88, 12, 0.15));
        }

        .stat-emoji {
          font-size: 1.5rem;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-white-50);
          margin-top: 2px;
        }

        /* Collection Section */
        .drawer-collection {
          padding: 0 20px 40px;
          position: relative;
          z-index: 1;
        }

        .empty-collection {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          text-align: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--color-white-10);
          border-radius: 24px;
          margin-top: 20px;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 16px;
        }

        .empty-collection h3 {
          margin: 0 0 8px;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .empty-collection p {
          margin: 0 0 24px;
          color: var(--color-white-50);
          max-width: 280px;
        }

        .shop-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          border-radius: 14px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px var(--color-primary-30);
        }

        .shop-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px var(--color-primary-40);
        }

        /* Collection Tabs */
        .collection-tabs {
          display: flex;
          gap: 8px;
          padding: 20px 0;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .collection-tabs::-webkit-scrollbar {
          display: none;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: var(--color-white-5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: var(--color-white-60);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-button:hover {
          background: var(--color-white-10);
          color: #fff;
        }

        .tab-button.active {
          background: linear-gradient(135deg, var(--color-primary-20), rgba(234, 88, 12, 0.1));
          border-color: var(--color-primary-30);
          color: #fff;
        }

        .tab-count {
          padding: 2px 8px;
          background: var(--color-white-10);
          border-radius: 10px;
          font-size: 0.75rem;
        }

        .tab-button.active .tab-count {
          background: var(--color-primary-30);
        }

        /* Collection Grid */
        .collection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }

        .collection-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 12px 16px;
          background: linear-gradient(135deg, var(--color-white-5), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .collection-card:hover {
          border-color: var(--rarity-color, rgba(255, 255, 255, 0.2));
          box-shadow: 0 8px 32px var(--color-black-30), 0 0 20px color-mix(in srgb, var(--rarity-color) 20%, transparent);
        }

        .card-rarity {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #fff;
        }

        .card-preview {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .card-preview .preview-emoji {
          font-size: 2.5rem;
        }

        .card-preview .preview-frame {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          border-radius: 8px;
        }

        .card-preview .preview-effect {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .card-preview .preview-bg {
          width: 56px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--color-white-10);
        }

        .card-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          line-height: 1.2;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .hero-username {
            font-size: 1.5rem;
          }

          .hero-stats {
            width: 100%;
          }

          .stat-card {
            flex: 1;
            min-width: 0;
            padding: 12px 14px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .collection-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
