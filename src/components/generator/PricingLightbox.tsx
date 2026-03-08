/**
 * Pricing Lightbox
 *
 * Shows trait pricing for all categories — usage counts, surcharges,
 * credit costs, and popularity. Opened from the ActionBar overflow menu.
 *
 * Categories are collapsible accordions. Each trait row shows:
 * - Name, times minted, popularity bar, surcharge, total price, credit cost
 *
 * Data comes from /api/mint/pricing.
 */

import { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useGenerator } from '@/contexts/GeneratorContext';
import { API_ENDPOINTS } from '@/services/constants';

interface PricingLightboxProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
}

interface PricingData {
  traits: Record<string, TraitPricing>;
  top3: Record<string, string[]>;
  supply: { minted: number; total: number };
  floorPrice: number;
}

const BASE_PRICE = 0.2;

/** Display order for categories */
const SURCHARGE_CATEGORIES = ['Head', 'Clothes', 'Face Wear'];
const ALL_CATEGORIES = ['Head', 'Clothes', 'Face Wear', 'Face', 'Mouth', 'Background'];

type SortMode = 'popular' | 'price' | 'az';

/**
 * Complete list of all YourWojak generator traits per pricing category.
 * Built by cross-referencing actual layer files (G1 PNGs + G2 manifest)
 * with TRAIT_NAME_MAP canonical names. Categories per Phase 1 metadata.
 * Used to ensure every available trait is displayed, even with 0 mints.
 */
const ALL_TRAITS: Record<string, string[]> = {
  Head: [
    '2Pac Bandana', 'Beanie', 'Beer Hat', 'Cap', 'Centurion', 'Clown',
    'Comrade Hat', 'Construction Helmet', 'Cowboy Hat', 'Crown', 'Devil Horns',
    'Fedora', 'Field Cap', 'Firefighter Helmet', 'Hard Hat', 'Headphones',
    'Military Beret', 'Piccolo Turban', 'Pirate Hat', 'Propeller Hat',
    'Ronin Helmet', 'Spikes', 'Standard Cut', 'Super Saiyan',
    'Super Wojak Hat', 'SWAT Helmet', 'Tin Foil Hat', 'Trump Wave',
    'Viking Helmet', 'Wizard Hat',
  ],
  Clothes: [
    'Astronaut', 'Bathrobe', 'Bepe Army', 'Bepe Suit', 'Born to Ride',
    'Chia Farmer', 'Drac', 'El Presidente', 'Firefighter Uniform',
    "God's Robe", 'Goose Suit', 'Gopher Suit', 'Leather Jacket',
    'Ninja Turtle Fit', 'Pepe Suit', 'Pickle Suit', 'Proof of Prayer',
    'Roman Drip', 'Ronin', 'Sonic Suit', 'Sports Jacket', 'Straitjacket',
    'Suit', 'Super Saiyan Uniform', 'SWAT Gear', 'Tank Top', 'Tee',
    'Topless', 'Viking Armor', 'Wizard Drip',
  ],
  'Face Wear': [
    '3D Glasses', 'Alpha Shades', 'Aviators', 'Cool Glasses', 'Cyber Shades',
    'Eye Patch', 'Fake It Mask', 'Laser Eyes', 'Matrix Lenses', 'MOG Glasses',
    'Night Vision', 'Ninja Turtle Mask', 'Shades', 'Tyson Tattoo',
    'VR Headset', 'Wizard Glasses',
  ],
  Face: [
    'Classic', 'Rekt', 'Rugged', 'Bleeding Bags', 'Terminator',
  ],
  Mouth: [
    'Bandana Mask', 'Bubble Gum', 'Cig', 'Cohiba', 'Copium Mask',
    'Gold Teeth', 'Hannibal Mask', 'Joint', 'Neckbeard', 'Numb', 'Pipe',
    'Pizza', 'Screaming', 'Smile', 'Stache', 'Teeth',
  ],
  Background: [
    // Scenes
    'Bepe Barracks', 'Chia Farm', 'Hell', 'Matrix', 'Moms Basement', 'Moon',
    'Nesting Grounds', 'NYSE Dump', 'NYSE Pump', 'One Market', 'Orange Grove',
    'Ronin Dojo', 'Route 66', 'Silicon Data Center', 'Spell Room', 'White House',
    // Cashtags
    '$BEPE', '$CASTER', '$CHIA', '$HOA', '$HONK', '$LOVE', '$NECKCOIN', '$PIZZA',
    // Plain Backgrounds (pre-made named color PNGs)
    'Chia Green', 'Golden Hour', 'Hot Coral', 'Mellow Yellow', 'Neo Mint',
    'Radioactive Forest', 'Sky Dive', 'Sky Shock Blue', 'Tangerine Pop',
    // Solid colors (color picker)
    'Amethyst', 'Beige', 'Blood Red', 'Blush', 'Bronze', 'Canary Yellow',
    'Charcoal', 'Cyan', 'Dark Chocolate', 'Dark Orange', 'Dark Purple',
    'Dark Turquoise', 'Deep Pink', 'Deep Purple', 'Deep Teal', 'Dodger Blue',
    'Electric Blue', 'Emerald', 'Forest Green', 'Gold Rush', 'Gray',
    'Green Candle', 'Hot Pink', 'Lawn Green', 'Light Sea Green', 'Lime Green',
    'Magenta', 'Medium Blue', 'Medium Orchid', 'Metallic Gold', 'Midnight Void',
    'Navy', 'Near Black', 'Neon Green', 'Pure Orange', 'Purple Rain',
    'Red Candle', 'Rose', 'Royal Blue', 'Royal Purple', 'Saddle Brown',
    'Sea Green', 'Sienna', 'Silver', 'Sky Blue', 'Sunflower', 'Tan',
    'Tomato Red', 'Turquoise', 'Violet', 'White', 'Wojak Orange',
  ],
};

const EMPTY_PRICING: TraitPricing = { usageCount: 0, effectiveUsage: 0, surchargeXch: 0 };

/** Map generator layer keys to pricing category names */
const LAYER_TO_PRICING_CATEGORY: Record<string, string> = {
  Head: 'Head',
  Clothes: 'Clothes',
  Eyes: 'Face Wear',
  Mask: 'Face Wear',
  Base: 'Face',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth',
  FacialHair: 'Mouth',
  Background: 'Background',
};

function CategoryAccordion({
  category,
  items,
  isSurchargeCategory,
  maxMinted,
  sortMode,
  onToggleSort,
  selectedTraitNames,
}: {
  category: string;
  items: { name: string; pricing: TraitPricing }[];
  isSurchargeCategory: boolean;
  maxMinted: number;
  sortMode: SortMode;
  onToggleSort: (mode: SortMode) => void;
  selectedTraitNames: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const totalMinted = items.reduce((sum, i) => sum + i.pricing.usageCount, 0);
  const maxSurcharge = Math.max(...items.map((i) => i.pricing.surchargeXch));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'transparent',
        border: '1px solid var(--color-white-6)',
      }}
    >
      {/* Category header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 transition-colors"
        style={{
          background: 'transparent',
          padding: '14px 18px',
        }}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-white-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-muted" />
        </motion.div>
        <span className="text-primary" style={{ fontSize: '15px', fontWeight: 600, flex: 1, textAlign: 'left' }}>
          {category}
        </span>
        <span className="tabular-nums text-muted" style={{ fontSize: '13px' }}>
          {items.length} traits
        </span>
        <span className="tabular-nums text-secondary" style={{ fontSize: '13px' }}>
          {totalMinted} minted
        </span>
        {isSurchargeCategory && (
          <span
            className="tabular-nums text-accent"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              background: 'var(--color-primary-10)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {maxSurcharge > 0
              ? `${BASE_PRICE.toFixed(2)} – ${(BASE_PRICE + maxSurcharge).toFixed(2)} XCH`
              : `${BASE_PRICE.toFixed(2)} XCH`}
          </span>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--color-white-5)' }}>
              {/* Sort controls + Column headers */}
              <div
                className="flex items-center gap-2"
                style={{
                  background: 'var(--color-black-15)',
                  padding: '8px 18px',
                }}
              >
                <div className="flex items-center gap-1" style={{ flex: 1 }}>
                  {(['popular', 'price', 'az'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleSort(mode); }}
                      aria-pressed={sortMode === mode}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: sortMode === mode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        background: sortMode === mode ? 'var(--color-primary-10)' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: 'none',
                      }}
                    >
                      {mode === 'popular' ? 'Popular' : mode === 'price' ? 'Price' : 'A\u2013Z'}
                    </button>
                  ))}
                </div>
                <span className="text-muted section-label" style={{ width: 80, textAlign: 'right' }}>
                  Minted
                </span>
                {isSurchargeCategory && (
                  <>
                    <span className="text-muted section-label" style={{ width: 80, textAlign: 'right' }}>
                      Total
                    </span>
                    <span className="text-muted section-label" style={{ width: 72, textAlign: 'right' }}>
                      Credits
                    </span>
                  </>
                )}
              </div>

              {/* Trait rows */}
              {items.map(({ name, pricing }) => {
                const hasSurcharge = isSurchargeCategory && pricing.surchargeXch > 0;
                const totalPrice = BASE_PRICE + pricing.surchargeXch;
                const creditCost = Math.ceil(100 * totalPrice / BASE_PRICE);
                const barPct = maxMinted > 0 ? (pricing.usageCount / maxMinted) * 100 : 0;
                const isSelected = selectedTraitNames.has(name);

                return (
                  <div
                    key={name}
                    className="flex items-center relative"
                    style={{
                      padding: '10px 18px',
                      borderBottom: '1px solid var(--color-white-3)',
                      background: isSelected ? 'rgba(255, 107, 0, 0.04)' : 'transparent',
                    }}
                  >
                    {/* Selected indicator bar */}
                    {isSelected && (
                      <div
                        className="absolute left-0 top-0 bottom-0"
                        style={{ width: 3, background: 'var(--color-primary)', borderRadius: '0 2px 2px 0' }}
                      />
                    )}

                    {/* Trait name */}
                    <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className="truncate"
                        style={{
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                          fontSize: '14px',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {name}
                      </span>
                    </div>

                    {/* Minted count + inline popularity bar */}
                    <div className="flex items-center gap-2" style={{ width: 110, justifyContent: 'flex-end' }}>
                      <div
                        className="rounded-full overflow-hidden"
                        style={{ width: 40, height: 3, background: 'var(--color-white-6)', flexShrink: 0 }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barPct}%`,
                            background: barPct > 60 ? 'var(--color-primary)' : 'var(--color-white-25)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span className="tabular-nums text-secondary" style={{ fontSize: '14px', minWidth: 32, textAlign: 'right' }}>
                        {pricing.usageCount}
                      </span>
                    </div>

                    {/* Price + Credits (surcharge categories only) */}
                    {isSurchargeCategory && (
                      <>
                        <div
                          style={{
                            width: 80,
                            textAlign: 'right',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 1,
                          }}
                        >
                          <span
                            className="tabular-nums font-medium"
                            style={{
                              fontSize: '14px',
                              color: hasSurcharge ? 'var(--color-text)' : 'var(--color-text-muted)',
                            }}
                          >
                            {totalPrice.toFixed(2)}
                          </span>
                          {hasSurcharge && (
                            <span
                              className="tabular-nums text-accent"
                              style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}
                            >
                              +{pricing.surchargeXch.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span
                          className="tabular-nums"
                          style={{
                            width: 72,
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: creditCost > 100 ? 600 : 400,
                            color: creditCost > 100 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          }}
                        >
                          {creditCost}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingLightbox({ isOpen, onClose }: PricingLightboxProps) {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const { selectedLayers } = useGenerator();

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch(API_ENDPOINTS.mintPricing)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load pricing');
        return res.json();
      })
      .then((d) => setData(d as PricingData))
      .catch(() => {
        // API unavailable (e.g. local dev) — still show all traits with 0 usage
        setData({ traits: {}, top3: {}, supply: { minted: 0, total: 4200 }, floorPrice: 0.2 });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Determine which trait names the user currently has selected
  const selectedTraitNames = useMemo(() => {
    const names = new Set<string>();
    for (const [layerKey, path] of Object.entries(selectedLayers)) {
      if (!path || path === 'None') continue;
      const pricingCategory = LAYER_TO_PRICING_CATEGORY[layerKey];
      if (!pricingCategory) continue;
      const categoryTraits = ALL_TRAITS[pricingCategory];
      if (!categoryTraits) continue;
      const pathLower = path.toLowerCase();
      for (const name of categoryTraits) {
        if (pathLower.includes(name.toLowerCase().replace(/\s+/g, '-'))) {
          names.add(name);
        }
      }
    }
    return names;
  }, [selectedLayers]);

  // Build complete trait list: ALL_TRAITS merged with API pricing data.
  // Every trait appears even if never minted (usageCount 0).
  const grouped = useMemo(() => {
    const apiTraits = data?.traits ?? {};
    const result: Record<string, { name: string; pricing: TraitPricing }[]> = {};

    for (const [category, traitNames] of Object.entries(ALL_TRAITS)) {
      result[category] = traitNames.map((name) => {
        const key = `${category}_${name}`;
        return { name, pricing: apiTraits[key] ?? EMPTY_PRICING };
      });
    }

    // Also include any API traits not in the static list (future-proofing)
    for (const [key, pricing] of Object.entries(apiTraits)) {
      const sep = key.indexOf('_');
      if (sep < 0) continue;
      const category = key.slice(0, sep);
      const name = key.slice(sep + 1);
      if (!result[category]) result[category] = [];
      if (!result[category].some((t) => t.name === name)) {
        result[category].push({ name, pricing });
      }
    }

    for (const items of Object.values(result)) {
      if (sortMode === 'popular') {
        items.sort((a, b) => b.pricing.usageCount - a.pricing.usageCount || a.name.localeCompare(b.name));
      } else if (sortMode === 'price') {
        items.sort((a, b) => b.pricing.surchargeXch - a.pricing.surchargeXch || b.pricing.usageCount - a.pricing.usageCount || a.name.localeCompare(b.name));
      } else {
        items.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return result;
  }, [data, sortMode]);

  // Global max minted for popularity bar scaling
  const maxMinted = useMemo(() => {
    let max = 0;
    for (const items of Object.values(grouped)) {
      for (const item of items) {
        if (item.pricing.usageCount > max) max = item.pricing.usageCount;
      }
    }
    return max;
  }, [grouped]);

  // Order categories
  const sortedCategories = [
    ...ALL_CATEGORIES.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !ALL_CATEGORIES.includes(c)).sort(),
  ];

  const supplyPercent = data?.supply ? (data.supply.minted / data.supply.total) * 100 : 0;

  return (
    <Lightbox isOpen={isOpen} onClose={onClose} size="lg" title="Trait Prices" contentClassName="lightbox-fixed-height">
      {/* Supply bar + info */}
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--color-white-6)' }}>
        {/* Supply progress */}
        {data?.supply && (
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-white-6)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${supplyPercent}%`,
                  background: 'linear-gradient(90deg, var(--color-primary), #ff9500)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span className="tabular-nums shrink-0 text-secondary" style={{ fontSize: '14px', fontWeight: 600 }}>
              {data.supply.minted}<span className="text-muted">/{data.supply.total}</span>
            </span>
          </div>
        )}

        {/* Info pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="tabular-nums text-primary"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--color-white-5)',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-white-6)',
            }}
          >
            Base: {BASE_PRICE} XCH
          </span>
          <span className="text-muted" style={{ fontSize: '13px', lineHeight: 1.5 }}>
            All mints cost {BASE_PRICE} XCH base. Popular Head, Clothes & Face Wear traits add a surcharge — only the single highest surcharge applies to your total.
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      )}

      {error && (
        <p className="text-center py-12 text-secondary" style={{ fontSize: '14px' }}>{error}</p>
      )}

      {!loading && !error && data && (
        <div className="flex flex-col gap-3" style={{ paddingTop: 16 }}>
          {sortedCategories.map((category) => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;
            const isSurchargeCategory = SURCHARGE_CATEGORIES.includes(category);

            return (
              <CategoryAccordion
                key={category}
                category={category}
                items={items}
                isSurchargeCategory={isSurchargeCategory}
                maxMinted={maxMinted}
                sortMode={sortMode}
                onToggleSort={(mode) => setSortMode(mode)}
                selectedTraitNames={selectedTraitNames}
              />
            );
          })}
        </div>
      )}
    </Lightbox>
  );
}

export default PricingLightbox;
