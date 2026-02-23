/**
 * Shop Component (SPEC 12)
 *
 * Browse and purchase Tang Gang collectibles.
 * Categories: Emojis, Frames, Name Effects, Titles, Backgrounds, Celebrations, BigPulp Items
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Sparkles, Crown, Flame, Zap, Star, Package, Target, Palette, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { CurrencyDisplay } from '../Currency/CurrencyDisplay';
import { EmojiRing } from './EmojiRing';
import { EmojiFrame, EMOJI_FRAME_MAP } from './EmojiFrame';
import { ItemInfoButton } from './ItemInfoButton';
import { DrawerStylePreview } from './DrawerStylePreview';
import { useIsMobile } from '../../hooks/useMediaQuery';
import './Shop.css';
import './frames.css';
import './ItemInfoButton.css';
import './DrawerStylePreview.css';

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tier: 'free' | 'basic' | 'premium';
  price_oranges: number;
  price_gems: number;
  css_class: string | null;
  css_value: string | null;
  emoji: string | null;
  preview_type: string | null;
  effect: string | null;
  is_limited: number;
  stock_limit: number | null;
  stock_remaining: number | null;
  available_from: string | null;
  available_until: string | null;
  bundle_items: string | null;
  bundle_discount: number | null;
  is_consumable: number;
  sort_order: number;
  owned?: boolean;
  isAvailable?: boolean;
}

interface InventoryItem {
  id: string;
  item_id: string;
  acquired_at: string;
}

interface EquippedState {
  frame_id: string | null;
  title_id: string | null;
  name_effect_id: string | null;
  background_id: string | null;
  celebration_id: string | null;
}

const CATEGORIES = [
  { value: 'consumable', label: 'Ammo', icon: Target },
  { value: 'emoji_badge', label: 'Emojis', icon: Star },
  { value: 'frame', label: 'Frames', icon: Package },
  { value: 'name_effect', label: 'Effects', icon: Sparkles },
  { value: 'title', label: 'Titles', icon: Crown },
  { value: 'background', label: 'Backgrounds', icon: Zap },
  { value: 'celebration', label: 'Celebrations', icon: Flame },
  { value: 'bigpulp', label: 'BigPulp', icon: Star },
  { value: 'drawer', label: 'Drawer Style', icon: Palette },
  { value: 'bundle', label: 'Bundles', icon: Gift },
];

// Tier colors for item badges
const TIER_COLORS: Record<string, string> = {
  free: '#9ca3af',
  basic: '#22c55e',
  premium: '#f59e0b',
};

const TIER_ORDER = ['free', 'basic', 'premium'];

// BigPulp item emoji mappings
const BIGPULP_EMOJIS: Record<string, string> = {
  // Hats
  'bigpulp-hat-party': '🎉',
  'bigpulp-hat-cowboy': '🤠',
  'bigpulp-hat-chef': '👨‍🍳',
  'bigpulp-hat-viking': '⚔️',
  'bigpulp-hat-pirate': '🏴‍☠️',
  'bigpulp-hat-beret': '🎨',
  'bigpulp-hat-tophat': '🎩',
  'bigpulp-hat-wizard': '🧙',
  'bigpulp-hat-devil': '😈',
  'bigpulp-hat-crown': '👑',
  'bigpulp-hat-halo': '😇',
  // Moods
  'bigpulp-mood-happy': '😊',
  'bigpulp-mood-chill': '😎',
  'bigpulp-mood-sleepy': '😴',
  'bigpulp-mood-hype': '🤩',
  'bigpulp-mood-grumpy': '😤',
  'bigpulp-mood-sergeant': '🫡',
  'bigpulp-mood-numb': '😐',
  'bigpulp-mood-rekt': '😵',
  // Accessories
  'bigpulp-acc-bowtie': '🎀',
  'bigpulp-acc-bandana': '🧣',
  'bigpulp-acc-earring': '💎',
  'bigpulp-acc-headphones': '🎧',
  'bigpulp-acc-cigar': '🚬',
  'bigpulp-acc-monocle': '🧐',
  'bigpulp-acc-scar': '⚡',
};

// Celebration type extraction from item ID
const CELEBRATION_TYPES: Record<string, string> = {
  'celebration-confetti': 'confetti',
  'celebration-orange-rain': 'orange-rain',
  'celebration-citrus-burst': 'citrus-burst',
  'celebration-fireworks': 'fireworks',
};

interface ShopProps {
  onClose?: () => void;
}

export function Shop({ onClose }: ShopProps) {
  const { getToken, isSignedIn } = useAuth();
  const { refreshBalance, currency } = useCurrency();
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState('consumable');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasedId, setPurchasedId] = useState<string | null>(null);
  const [equipingId, setEquipingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRafRef = useRef(0);

  // Mobile carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Confetti celebration system
  const CONFETTI_EMOJIS = useMemo(() => ['🎉', '🎊', '✨', '💫', '⭐', '🌟', '🍊'], []);

  // Pre-render emoji sprites once (expensive text shaping happens only here)
  const emojiSprites = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const getEmojiSprite = useCallback((emoji: string, size: number): HTMLCanvasElement => {
    const key = `${emoji}_${size}`;
    const cached = emojiSprites.current.get(key);
    if (cached) return cached;

    const s = document.createElement('canvas');
    const pad = Math.ceil(size * 0.3); // padding for glyph overflow
    s.width = size + pad * 2;
    s.height = size + pad * 2;
    const sCtx = s.getContext('2d');
    if (sCtx) {
      sCtx.font = `${size}px serif`;
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(emoji, s.width / 2, s.height / 2);
    }
    emojiSprites.current.set(key, s);
    return s;
  }, []);

  const startConfettiAnimation = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      sprite: HTMLCanvasElement; size: number; opacity: number;
      rotation: number; rotSpeed: number;
    }

    const emojis = CONFETTI_EMOJIS;
    const particles: Particle[] = [];

    const makeParticle = (x: number, y: number, vx: number, vy: number): Particle => {
      const size = 16 + Math.random() * 16;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return {
        x, y, vx, vy,
        sprite: getEmojiSprite(emoji, Math.round(size)),
        size,
        opacity: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
      };
    };

    // Spawn from top (40), left (25), right (25)
    for (let i = 0; i < 40; i++) {
      particles.push(makeParticle(
        Math.random() * canvas.width,
        -20 - Math.random() * 60,
        (Math.random() - 0.5) * 4,
        2 + Math.random() * 4,
      ));
    }
    for (let i = 0; i < 25; i++) {
      particles.push(makeParticle(
        -20,
        Math.random() * canvas.height * 0.6,
        3 + Math.random() * 4,
        -1 + Math.random() * 3,
      ));
    }
    for (let i = 0; i < 25; i++) {
      particles.push(makeParticle(
        canvas.width + 20,
        Math.random() * canvas.height * 0.6,
        -(3 + Math.random() * 4),
        -1 + Math.random() * 3,
      ));
    }

    let alive = particles.length;
    const startTime = performance.now();
    const animate = (now: number) => {
      if (now - startTime > 8000 || alive === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setShowConfetti(false);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      alive = 0;
      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive++;
        p.vy += 0.1;
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.003;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        // drawImage is GPU-accelerated — no text shaping per frame
        ctx.drawImage(p.sprite, -p.sprite.width / 2, -p.sprite.height / 2);
        ctx.restore();
      }
      confettiRafRef.current = requestAnimationFrame(animate);
    };
    confettiRafRef.current = requestAnimationFrame(animate);
  }, [CONFETTI_EMOJIS, getEmojiSprite]);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    const canvas = confettiCanvasRef.current;
    if (!canvas) {
      // Canvas not mounted yet — try again next frame
      requestAnimationFrame(() => {
        const c = confettiCanvasRef.current;
        if (c) startConfettiAnimation(c);
      });
      return;
    }
    startConfettiAnimation(canvas);
  }, [startConfettiAnimation]);

  // Cleanup confetti on unmount
  useEffect(() => {
    return () => {
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
    };
  }, []);

  // Fetch shop items (with owned status if authenticated)
  const fetchItems = useCallback(async () => {
    try {
      const token = await getToken();
      // If authenticated, include userId to get owned status
      const url = token ? '/api/shop/items?includeOwned=true' : '/api/shop/items';
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('[Shop] Failed to fetch items:', err);
    }
  }, [getToken]);

  // Fetch user inventory
  const fetchInventory = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/shop/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.inventory) {
        setInventory(data.inventory);
      }
      if (data.equipped) {
        setEquipped(data.equipped);
      }
    } catch (err) {
      console.error('[Shop] Failed to fetch inventory:', err);
    }
  }, [getToken]);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchItems(), fetchInventory()]);
      setIsLoading(false);
    };
    load();
  }, [fetchItems, fetchInventory]);

  // Check if item is owned (consumables are never "owned" - they can always be bought)
  const isOwned = (item: ShopItem): boolean => {
    if (item.category === 'consumable') return false;
    // Use owned flag from API if available
    if (item.owned !== undefined) return item.owned;
    // Fallback to inventory check
    return inventory.some(inv => inv.item_id === item.id);
  };

  // Check if item is equipped
  const isEquipped = (item: ShopItem): boolean => {
    if (!equipped) return false;
    switch (item.category) {
      case 'frame': return equipped.frame_id === item.id;
      case 'title': return equipped.title_id === item.id;
      case 'name_effect': return equipped.name_effect_id === item.id;
      case 'background': return equipped.background_id === item.id;
      case 'celebration': return equipped.celebration_id === item.id;
      default: return false;
    }
  };

  // Check affordability
  const canAfford = (item: ShopItem): boolean => {
    if (!currency) return false;
    return item.price_oranges <= currency.oranges;
  };

  // Track buttons that are reverting from purchased → normal for CSS animation
  const [revertingId, setRevertingId] = useState<string | null>(null);

  // Handle purchase — optimistic: show "Purchased!" immediately, API call in background
  const handlePurchase = async (item: ShopItem) => {
    setMessage(null);

    // Optimistically show purchased state + confetti immediately
    setPurchasedId(item.id);
    triggerConfetti();

    try {
      const token = await getToken();
      if (!token) {
        setPurchasedId(null);
        setMessage({ type: 'error', text: 'Please sign in to purchase' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json();

      if (res.ok) {
        // Refresh data in background
        Promise.all([fetchItems(), fetchInventory(), refreshBalance()]);
      } else {
        // Revert optimistic state on failure
        setPurchasedId(null);
        setMessage({ type: 'error', text: data.error || 'Purchase failed' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
    } catch {
      setPurchasedId(null);
      setMessage({ type: 'error', text: 'Network error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Revert button after 3s with a smooth transition
    setTimeout(() => {
      setRevertingId(item.id);
      setPurchasedId(null);
      // Clear reverting class after animation completes
      setTimeout(() => setRevertingId(null), 400);
    }, 3000);
  };

  // Handle equip/unequip
  const handleEquip = async (item: ShopItem) => {
    const slot = item.category as 'frame' | 'title' | 'name_effect' | 'background' | 'celebration';
    if (!['frame', 'title', 'name_effect', 'background', 'celebration'].includes(slot)) return;

    setEquipingId(item.id);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) return;

      const isCurrentlyEquipped = isEquipped(item);

      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot,
          itemId: isCurrentlyEquipped ? null : item.id,
        }),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: isCurrentlyEquipped ? `Unequipped ${item.name}` : `Equipped ${item.name}!`,
        });
        await fetchInventory();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to equip item' });
    }

    setEquipingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  // Filter items by category
  const getFilteredItems = (): ShopItem[] => {
    let filtered: ShopItem[];

    if (activeCategory === 'bigpulp') {
      // Combine all BigPulp categories
      filtered = items.filter(item =>
        item.category === 'bigpulp_hat' ||
        item.category === 'bigpulp_accessory' ||
        item.category === 'bigpulp_mood'
      );
    } else if (activeCategory === 'drawer') {
      // Combine all drawer customization categories
      filtered = items.filter(item =>
        item.category === 'font_color' ||
        item.category === 'font_style' ||
        item.category === 'font_family' ||
        item.category === 'page_background' ||
        item.category === 'avatar_glow' ||
        item.category === 'avatar_size' ||
        item.category === 'bigpulp_position' ||
        item.category === 'dialogue_style' ||
        item.category === 'collection_layout' ||
        item.category === 'card_style' ||
        item.category === 'entrance_animation' ||
        item.category === 'stats_style' ||
        item.category === 'tabs_style' ||
        item.category === 'visitor_counter'
      );
    } else if (activeCategory === 'bundle') {
      // Show items that have bundle_items defined
      filtered = items.filter(item => item.bundle_items !== null);
    } else {
      filtered = items.filter(item => item.category === activeCategory);
    }

    // Sort by tier then price
    return filtered.sort((a, b) => {
      const tierDiff = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.price_oranges - b.price_oranges;
    });
  };

  const filteredItems = getFilteredItems();

  // Reset carousel when category changes
  useEffect(() => {
    queueMicrotask(() => setCarouselIndex(0));
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeCategory]);

  // Carousel navigation
  const goToItem = (index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, filteredItems.length - 1));
    setCarouselIndex(clampedIndex);
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.scrollWidth / filteredItems.length;
      carouselRef.current.scrollTo({ left: itemWidth * clampedIndex, behavior: 'smooth' });
    }
  };

  const nextItem = () => goToItem(carouselIndex + 1);
  const prevItem = () => goToItem(carouselIndex - 1);

  // Handle scroll snap to update current index
  const handleCarouselScroll = () => {
    if (carouselRef.current && filteredItems.length > 0) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const itemWidth = carouselRef.current.scrollWidth / filteredItems.length;
      const newIndex = Math.round(scrollLeft / itemWidth);
      if (newIndex !== carouselIndex && newIndex >= 0 && newIndex < filteredItems.length) {
        setCarouselIndex(newIndex);
      }
    }
  };

  // Render item preview based on category
  const renderItemPreview = (item: ShopItem, isLarge = false) => {
    // Emoji badges - show the emoji
    if (item.emoji) {
      return <span className="preview-emoji">{item.emoji}</span>;
    }

    // BigPulp items (hats, moods, accessories) - show mapped emoji
    if (item.category === 'bigpulp_hat' || item.category === 'bigpulp_mood' || item.category === 'bigpulp_accessory') {
      const bigpulpEmoji = BIGPULP_EMOJIS[item.id];
      if (bigpulpEmoji) {
        return <span className="preview-emoji">{bigpulpEmoji}</span>;
      }
      // Fallback to orange for BigPulp
      return <span className="preview-emoji">🍊</span>;
    }

    // Titles - show the actual title text
    if (item.category === 'title') {
      return (
        <div className={`title-preview ${item.tier === 'premium' ? 'premium' : ''}`}>
          <span className="title-text">"{item.name}"</span>
        </div>
      );
    }

    // Celebrations - show animated preview
    if (item.category === 'celebration') {
      const celebType = CELEBRATION_TYPES[item.id] || 'confetti';
      return (
        <div className={`celebration-preview celebration-${celebType}`}>
          <span className="celebration-icon">
            {celebType === 'confetti' && '🎊'}
            {celebType === 'orange-rain' && '🍊'}
            {celebType === 'citrus-burst' && '💥'}
            {celebType === 'fireworks' && '🎆'}
          </span>
        </div>
      );
    }

    if (item.css_class) {
      // For frames, show a demo frame with proper styling
      if (item.category === 'frame') {
        // Check if it's an emoji frame
        const frameEmoji = item.css_class ? EMOJI_FRAME_MAP[item.css_class] : null;

        if (frameEmoji) {
          // Use EmojiFrame component for emoji-based frames
          return (
            <EmojiFrame
              emoji={frameEmoji}
              size={isLarge ? 'large' : 'small'}
            >
              <span style={{ fontSize: isLarge ? '2.5rem' : '1.5rem' }}>🍊</span>
            </EmojiFrame>
          );
        }

        // Regular frame with CSS effects
        return (
          <div className={`preview-frame ${item.css_class}`}>
            <span>🍊</span>
          </div>
        );
      }
      // For name effects, show styled text
      if (item.category === 'name_effect') {
        return (
          <span className={`preview-name-effect ${item.css_class}`} data-text="Name">
            Name
          </span>
        );
      }
      // For backgrounds, show a swatch
      if (item.category === 'background') {
        return <div className={`preview-background ${item.css_class}`} />;
      }
    }

    // Drawer style items - use special preview component
    const drawerCategories = [
      'font_color', 'font_style', 'font_family', 'page_background',
      'avatar_glow', 'avatar_size', 'bigpulp_position', 'dialogue_style',
      'collection_layout', 'card_style', 'entrance_animation',
      'stats_style', 'tabs_style', 'visitor_counter'
    ];
    if (drawerCategories.includes(item.category)) {
      return <DrawerStylePreview item={item} />;
    }

    // Fallback
    return <span className="preview-emoji">✨</span>;
  };

  return (
    <div className="shop-page">
      {/* Header */}
      <div className="shop-header">
        <div className="shop-title-row">
          <h1>Two Grove Shop</h1>
          {onClose && (
            <button className="close-button" onClick={onClose} aria-label="Close shop">
              ✕
            </button>
          )}
        </div>
        <CurrencyDisplay size="medium" />
      </div>

      {/* Error Message (success is now shown via button state + confetti) */}
      {message && message.type === 'error' && (
        <div className={`purchase-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isDisabled = cat.value !== 'consumable'; // Only Ammo tab is enabled
          return (
            <button
              key={cat.value}
              className={`category-tab ${activeCategory === cat.value ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && setActiveCategory(cat.value)}
              disabled={isDisabled}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
              {isDisabled && <span className="coming-soon-badge">Soon</span>}
            </button>
          );
        })}
      </div>

      {/* Items Display */}
      {isLoading ? (
        <div className="loading-state" role="status" aria-label="Loading shop">
          <Loader2 className="animate-spin" size={32} aria-hidden="true" />
          <span>Loading shop...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <p>No items in this category yet!</p>
        </div>
      ) : isMobile ? (
        /* ===== MOBILE: Fixed Card with Inner Carousel ===== */
        <div className="mobile-shop-container">
          {/* Fixed Card Frame */}
          <div className={`mobile-card-frame tier-${filteredItems[carouselIndex]?.tier || 'basic'}`}>
            {/* Inner Carousel - Only this scrolls */}
            <div 
              ref={carouselRef}
              className="mobile-carousel"
              onScroll={handleCarouselScroll}
            >
              {filteredItems.map((item, index) => {
                const owned = isOwned(item);
                const equippedItem = isEquipped(item);
                const affordable = canAfford(item);
                const isEquiping = equipingId === item.id;
                const canEquip = ['frame', 'title', 'name_effect', 'background', 'celebration'].includes(item.category);

                return (
                  <div
                    key={item.id}
                    className={`carousel-slide ${index === carouselIndex ? 'active' : ''}`}
                    onClick={() => setPreviewItem(item)}
                  >
                    {/* Emoji Preview */}
                    <div className="carousel-preview">
                      {renderItemPreview(item)}
                    </div>

                    {/* Item Name */}
                    <div className="carousel-name">{item.name}</div>

                    {/* Tier Badge (subtle) */}
                    <div className={`carousel-tier tier-${item.tier}`}>
                      {item.tier}
                    </div>

                    {/* Action Button */}
                    <div className="carousel-action" onClick={e => e.stopPropagation()}>
                      {owned ? (
                        canEquip ? (
                          <button
                            className={`carousel-btn equip ${equippedItem ? 'unequip' : ''}`}
                            onClick={() => handleEquip(item)}
                            disabled={isEquiping}
                          >
                            {isEquiping ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : equippedItem ? (
                              'Unequip'
                            ) : (
                              'Equip'
                            )}
                          </button>
                        ) : (
                          <span className="carousel-owned">✓ Owned</span>
                        )
                      ) : (
                        <button
                          className={`carousel-btn buy ${purchasedId === item.id ? 'purchased' : ''} ${revertingId === item.id ? 'reverting' : ''} ${!isSignedIn ? 'signin-required' : ''} ${!affordable && isSignedIn ? 'not-affordable' : ''}`}
                          disabled={purchasedId === item.id || (item.is_limited === 1 && item.stock_remaining === 0)}
                          onClick={() => handlePurchase(item)}
                        >
                          {purchasedId === item.id ? (
                            '✓ Purchased!'
                          ) : item.is_limited === 1 && item.stock_remaining === 0 ? (
                            'Sold Out'
                          ) : (
                            item.price_oranges > 0 ? `🍊 ${item.price_oranges}` : item.price_gems > 0 ? `💎 ${item.price_gems}` : 'Free'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Arrows */}
            {filteredItems.length > 1 && (
              <>
                <button 
                  className={`carousel-nav prev ${carouselIndex === 0 ? 'hidden' : ''}`}
                  onClick={(e) => { e.stopPropagation(); prevItem(); }}
                  aria-label="Previous item"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className={`carousel-nav next ${carouselIndex === filteredItems.length - 1 ? 'hidden' : ''}`}
                  onClick={(e) => { e.stopPropagation(); nextItem(); }}
                  aria-label="Next item"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Pagination Dots */}
          {filteredItems.length > 1 && (
            <div className="carousel-dots">
              {filteredItems.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === carouselIndex ? 'active' : ''}`}
                  onClick={() => goToItem(index)}
                  aria-label={`Go to item ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ===== DESKTOP: Original Grid Layout ===== */
        <div className="items-grid">
          {filteredItems.map((item) => {
            const owned = isOwned(item);
            const equippedItem = isEquipped(item);
            const affordable = canAfford(item);
            const isEquiping = equipingId === item.id;
            const canEquip = ['frame', 'title', 'name_effect', 'background', 'celebration'].includes(item.category);

            return (
              <div
                key={item.id}
                className={`shop-item-card tier-${item.tier} ${owned ? 'owned' : ''} ${equippedItem ? 'equipped' : ''} ${item.is_limited ? 'limited' : ''}`}
                style={{ '--tier-color': TIER_COLORS[item.tier] } as React.CSSProperties}
                onClick={() => setPreviewItem(item)}
              >
                {/* Tier Badge (hidden for consumables) */}
                {item.category !== 'consumable' && (
                  <span className={`tier-badge tier-${item.tier}`}>
                    {item.tier}
                  </span>
                )}

                {/* Info Button (hidden for consumables) */}
                {item.category !== 'consumable' && (
                  <div className="item-info-position" onClick={e => e.stopPropagation()}>
                    <ItemInfoButton item={item} />
                  </div>
                )}

                {/* Limited Edition Badge */}
                {item.is_limited === 1 && item.stock_remaining !== null && (
                  <span className="limited-badge">
                    {item.stock_remaining > 0 ? `${item.stock_remaining} left` : 'Sold Out'}
                  </span>
                )}

                {/* Equipped Badge */}
                {equippedItem && <span className="equipped-badge">Equipped</span>}

                {/* Item Preview */}
                <div className="item-preview">
                  {renderItemPreview(item)}
                </div>

                {/* Item Info */}
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  {item.description && (
                    <span className="item-description">
                      {item.category === 'consumable'
                        ? item.description
                            .replace(/at NFTs/gi, 'at your favorite game')
                            .replace(/to throw at/gi, 'to throw at')
                            .replace(/to flick at/gi, 'to flick at')
                        : item.description}
                    </span>
                  )}
                </div>

                {/* Footer: Price / Actions */}
                <div className="item-footer" onClick={e => e.stopPropagation()}>
                  {owned ? (
                    canEquip ? (
                      <button
                        className={`equip-button ${equippedItem ? 'unequip' : ''}`}
                        onClick={() => handleEquip(item)}
                        disabled={isEquiping}
                      >
                        {isEquiping ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : equippedItem ? (
                          'Unequip'
                        ) : (
                          'Equip'
                        )}
                      </button>
                    ) : (
                      <span className="owned-badge">✓ Owned</span>
                    )
                  ) : (
                    <>
                      <button
                        className={`buy-button ${purchasedId === item.id ? 'purchased' : ''} ${revertingId === item.id ? 'reverting' : ''} ${!isSignedIn ? 'signin-required' : ''} ${!affordable && isSignedIn ? 'not-affordable' : ''}`}
                        disabled={purchasedId === item.id || (item.is_limited === 1 && item.stock_remaining === 0)}
                        onClick={() => handlePurchase(item)}
                      >
                        {purchasedId === item.id ? (
                          '✓ Purchased!'
                        ) : item.is_limited === 1 && item.stock_remaining === 0 ? (
                          'Sold Out'
                        ) : (
                          <>
                            <span className="buy-text-desktop">
                              {item.price_oranges > 0 ? `🍊 ${item.price_oranges}` : item.price_gems > 0 ? `💎 ${item.price_gems}` : 'Free'}
                            </span>
                            <span className="buy-text-mobile">
                              {item.price_oranges > 0 ? `🍊 ${item.price_oranges}` : item.price_gems > 0 ? `💎 ${item.price_gems}` : 'Free'}
                            </span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confetti Overlay */}
      {showConfetti && (
        <canvas
          ref={confettiCanvasRef}
          className="confetti-canvas"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="preview-modal" onClick={() => setPreviewItem(null)}>
          <div
            className="preview-content"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-preview-title"
          >
            <button className="preview-close" onClick={() => setPreviewItem(null)} aria-label="Close preview">
              ✕
            </button>
            <div className="preview-header">
              <span className={`tier-badge tier-${previewItem.tier}`}>
                {previewItem.tier}
              </span>
              {previewItem.is_limited === 1 && (
                <span className="limited-badge-preview">Limited Edition</span>
              )}
              <h2 id="shop-preview-title">{previewItem.name}</h2>
            </div>
            <div className="preview-large">
              {renderItemPreview(previewItem, true)}
            </div>
            {previewItem.description && (
              <p className="preview-description">{previewItem.description}</p>
            )}
            {previewItem.category === 'emoji_badge' && (
              <div className="preview-demo">
                <p className="demo-label">Preview in emoji ring:</p>
                <EmojiRing
                  username="YourName"
                  positions={{
                    left_1: previewItem.emoji,
                    right_1: previewItem.emoji,
                  }}
                  size="large"
                />
              </div>
            )}
            {previewItem.category === 'name_effect' && previewItem.css_class && (
              <div className="preview-demo">
                <p className="demo-label">Preview effect:</p>
                <span className={`demo-name ${previewItem.css_class}`} data-text="YourName">
                  YourName
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Shop;
