/**
 * InventorySection Component
 *
 * Shows purchased shop items with equip/unequip toggles.
 * Uses unified items table categories.
 */

import { Check, Sparkles } from 'lucide-react';
import './Account.css';

// Database item categories from unified items table
type ItemCategory =
  | 'frame'
  | 'title'
  | 'name_effect'
  | 'background'
  | 'celebration'
  | 'emoji_badge'
  | 'bigpulp_hat'
  | 'bigpulp_mood'
  | 'bigpulp_accessory'
  | 'consumable'
  // Drawer customization categories
  | 'font_color'
  | 'font_style'
  | 'font_family'
  | 'page_background'
  | 'avatar_glow'
  | 'avatar_size'
  | 'bigpulp_position'
  | 'dialogue_style'
  | 'collection_layout'
  | 'card_style'
  | 'entrance_animation'
  | 'stats_style'
  | 'tabs_style'
  | 'visitor_counter';

export interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  category: ItemCategory;
  tier: 'free' | 'basic' | 'premium';
  css_class: string | null;
  css_value: string | null;
  emoji: string | null;
  acquired_at: string;
  equipped: boolean;
  state?: 'owned' | 'equipped' | 'gifted' | 'consumed';
}

interface InventorySectionProps {
  items: InventoryItem[];
  isOwnProfile: boolean;
  onEquip?: (itemId: string, category: string) => void;
  onUnequip?: (category: string) => void;
  onGift?: (itemId: string) => void;
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  emoji_badge: 'Emoji Badges',
  frame: 'Frames',
  title: 'Titles',
  name_effect: 'Name Effects',
  background: 'Backgrounds',
  celebration: 'Celebrations',
  bigpulp_hat: 'BigPulp Hats',
  bigpulp_mood: 'BigPulp Moods',
  bigpulp_accessory: 'BigPulp Accessories',
  consumable: 'Consumables',
  // Drawer customization
  font_color: 'Font Colors',
  font_style: 'Font Styles',
  font_family: 'Font Families',
  page_background: 'Page Backgrounds',
  avatar_glow: 'Avatar Glows',
  avatar_size: 'Avatar Sizes',
  bigpulp_position: 'BigPulp Positions',
  dialogue_style: 'Dialogue Styles',
  collection_layout: 'Collection Layouts',
  card_style: 'Card Styles',
  entrance_animation: 'Entrance Animations',
  stats_style: 'Stats Styles',
  tabs_style: 'Tab Styles',
  visitor_counter: 'Visitor Counters',
};

const CATEGORY_ORDER: ItemCategory[] = [
  'emoji_badge',
  'frame',
  'title',
  'name_effect',
  'background',
  'celebration',
  'bigpulp_hat',
  'bigpulp_mood',
  'bigpulp_accessory',
  // Drawer customization categories
  'font_color',
  'font_style',
  'font_family',
  'page_background',
  'avatar_glow',
  'avatar_size',
  'bigpulp_position',
  'dialogue_style',
  'collection_layout',
  'card_style',
  'entrance_animation',
  'stats_style',
  'tabs_style',
  'visitor_counter',
  'consumable',
];

// Categories that can be equipped
const EQUIPPABLE_CATEGORIES = [
  'frame', 'title', 'name_effect', 'background', 'celebration',
  'bigpulp_hat', 'bigpulp_mood', 'bigpulp_accessory',
  'font_color', 'font_style', 'font_family', 'page_background',
  'avatar_glow', 'avatar_size', 'bigpulp_position', 'dialogue_style',
  'collection_layout', 'card_style', 'entrance_animation',
  'stats_style', 'tabs_style', 'visitor_counter',
];

// Tier color badges
const TIER_COLORS: Record<string, string> = {
  free: '#9ca3af',
  basic: '#22c55e',
  premium: '#ffd700',
};

export function InventorySection({
  items,
  isOwnProfile,
  onEquip,
  onUnequip,
}: InventorySectionProps) {
  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.category as ItemCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<ItemCategory, InventoryItem[]>);

  if (items.length === 0) {
    return (
      <div className="inventory-section">
        <h2 className="section-title">Inventory</h2>
        <div className="inventory-empty">
          <span className="empty-icon">🛒</span>
          <p>No items purchased yet</p>
        </div>
      </div>
    );
  }

  const renderItemPreview = (item: InventoryItem) => {
    if (item.emoji) {
      return <span className="preview-emoji">{item.emoji}</span>;
    }
    if (item.css_class) {
      if (item.category === 'frame') {
        return <div className={`preview-frame ${item.css_class}`}>🍊</div>;
      }
      if (item.category === 'name_effect') {
        return <span className={`preview-effect ${item.css_class}`} data-text="Abc">Abc</span>;
      }
      if (item.category === 'background') {
        return <div className={`preview-bg ${item.css_class}`} />;
      }
    }
    return <Sparkles size={20} />;
  };

  return (
    <div className="inventory-section">
      <h2 className="section-title">
        Inventory
        <span className="item-count">({items.length} items)</span>
      </h2>

      {CATEGORY_ORDER.map((category) => {
        const categoryItems = itemsByCategory[category];
        if (!categoryItems?.length) return null;

        const isEquippable = EQUIPPABLE_CATEGORIES.includes(category);

        return (
          <div key={category} className="inventory-category">
            <h3 className="category-title">{CATEGORY_LABELS[category]}</h3>
            <div className="inventory-items-grid">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`inventory-card tier-${item.tier} ${item.equipped ? 'equipped' : ''}`}
                  onClick={() => {
                    if (!isOwnProfile || !isEquippable) return;
                    if (item.equipped) {
                      onUnequip?.(category);
                    } else {
                      onEquip?.(item.item_id, category);
                    }
                  }}
                  role={isOwnProfile && isEquippable ? 'button' : undefined}
                  tabIndex={isOwnProfile && isEquippable ? 0 : undefined}
                >
                  <div className="card-preview">
                    {renderItemPreview(item)}
                  </div>
                  <div className="card-details">
                    <span className="card-name">{item.name}</span>
                    <span
                      className="card-tier"
                      style={{ color: TIER_COLORS[item.tier] }}
                    >
                      {item.tier}
                    </span>
                  </div>
                  {item.equipped && (
                    <div className="card-equipped-badge">
                      <Check size={10} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
