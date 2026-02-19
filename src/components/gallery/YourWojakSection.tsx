/**
 * YourWojakSection - Your Wojak collection from MintGarden
 *
 * Fetches NFTs from the Your Wojak collection and displays them in a grid.
 * Features emoji type filters, trait dropdown filters, and opens full-featured explorer on click.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Palette, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { YourWojakExplorer } from './YourWojakExplorer';

// Your Wojak collection ID on MintGarden
const YOUR_WOJAK_COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

// Combat types with emojis
const COMBAT_TYPES = [
  { id: 'FIRE', emoji: '🔥', label: 'Fire' },
  { id: 'WATER', emoji: '💧', label: 'Water' },
  { id: 'ELECTRIC', emoji: '⚡', label: 'Electric' },
  { id: 'GRASS', emoji: '🌿', label: 'Grass' },
  { id: 'ICE', emoji: '❄️', label: 'Ice' },
  { id: 'MARTIAL', emoji: '🥊', label: 'Martial' },
  { id: 'VENOM', emoji: '☠️', label: 'Venom' },
  { id: 'EARTH', emoji: '🌍', label: 'Earth' },
  { id: 'AIR', emoji: '💨', label: 'Air' },
  { id: 'PSYCHE', emoji: '🔮', label: 'Psyche' },
  { id: 'INSECT', emoji: '🐛', label: 'Insect' },
  { id: 'STONE', emoji: '🪨', label: 'Stone' },
  { id: 'GHOST', emoji: '👻', label: 'Ghost' },
  { id: 'DRAGON', emoji: '🐉', label: 'Dragon' },
  { id: 'SHADOW', emoji: '🌑', label: 'Shadow' },
  { id: 'METAL', emoji: '⚙️', label: 'Metal' },
  { id: 'MYSTIC', emoji: '✨', label: 'Mystic' },
  { id: 'NEUTRAL', emoji: '⚪', label: 'Neutral' },
];

// Actual trait values from the generator (extracted from traitNameMap.ts)
const TRAIT_OPTIONS: Record<string, string[]> = {
  background: [
    '$BEPE', '$CASTER', '$CHIA', '$HOA', '$HONK', '$LOVE', '$NECKCOIN', '$PIZZA',
    'Chia Green', 'Golden Hour', 'Green Candle', 'Hot Coral', 'Mellow Yellow',
    'Neo Mint', 'Radioactive Forest', 'Sky Dive', 'Sky Shock Blue', 'Tangerine Pop',
    'Bepe Barracks', 'Chia Farm', 'Hell', 'Matrix', 'Moms Basement', 'Moon',
    'Nesting Grounds', 'NYSE Dump', 'NYSE Pump', 'NYSE Rug', 'One Market',
    'Orange Grove', 'Ronin Dojo', 'Route 66', 'Silicon Data Center', 'Spell Room', 'White House',
  ].sort(),
  face: [
    'Classic', 'Rekt', 'Rugged', 'Bleeding Bags', 'Terminator', 'NPC',
  ].sort(),
  facewear: [
    '3D Glasses', 'Alpha Shades', 'Aviators', 'Cool Glasses', 'Cyber Shades',
    'Eye Patch', 'Laser Eyes', 'Matrix Lenses', 'MOG Glasses', 'Ninja Turtle Mask',
    'Shades', 'Tyson Tattoo', 'Wizard Glasses', 'Night Vision', 'VR Headset',
  ].sort(),
  mouth: [
    'Numb', 'Smile', 'Screaming', 'Teeth', 'Gold Teeth', 'Pizza', 'Pipe',
    'Bubble Gum', 'Cig', 'Cohiba', 'Joint', 'Bandana Mask', 'Hannibal Mask',
    'Copium Mask', 'Neckbeard', 'Stache',
  ].sort(),
  headwear: [
    '2Pac Bandana', 'Spikes', 'Beanie', 'Beer Hat', 'Cap', 'Centurion', 'Clown',
    'Comrade Hat', 'Construction Helmet', 'Cowboy Hat', 'Crown', 'Devil Horns',
    'Fedora', 'Field Cap', 'Firefighter Helmet', 'Hard Hat', 'Headphones',
    'Military Beret', 'Piccolo Turban', 'Pirate Hat', 'Propeller Hat',
    'Ronin Helmet', 'Standard Cut', 'Super Wojak Hat', 'Super Saiyan',
    'SWAT Helmet', 'Tin Foil Hat', 'Trump Wave', 'Viking Helmet', 'Wizard Hat',
  ].sort(),
  clothing: [
    'Astronaut', 'Bathrobe', 'Bepe Army', 'Bepe Suit', 'Born to Ride', 'Chia Farmer',
    'Drac', 'El Presidente', 'Firefighter Uniform', "God's Robe", 'Goose Suit',
    'Gopher Suit', 'Leather Jacket', 'Ninja Turtle Fit', 'Pepe Suit', 'Pickle Suit',
    'Proof of Prayer', 'Roman Drip', 'Ronin', 'Sonic Suit', 'Sports Jacket',
    'Straitjacket', 'Suit', 'Super Saiyan Uniform', 'SWAT Gear', 'Tank Top', 'Tee',
    'Topless', 'Viking Armor', 'Wizard Drip',
  ].sort(),
};

// Trait categories for dropdown filters
const TRAIT_CATEGORIES = [
  { id: 'background', label: 'Background' },
  { id: 'face', label: 'Face' },
  { id: 'facewear', label: 'Facewear' },
  { id: 'headwear', label: 'Headwear' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'clothing', label: 'Clothing' },
];

interface MintGardenNFT {
  id: string;
  encoded_id: string;
  name: string;
  description?: string;
  edition_number: number;
  edition_total: number;
  thumbnail_uri: string;
  collection_id: string;
  collection_name: string;
  owner_address_encoded_id?: string;
  minted_at: string;
}

// Fetch NFTs from MintGarden via proxy (avoids CORS issues)
async function fetchYourWojakNFTs(): Promise<MintGardenNFT[]> {
  // Use vite proxy for development, API proxy for production
  const isDev = import.meta.env.DEV;
  const basePath = isDev ? '/mintgarden-api' : '/api/mintgarden';
  const url = `${basePath}/collections/${YOUR_WOJAK_COLLECTION_ID}/nfts?size=100`;

  console.log('[YourWojak] Fetching from:', url, isDev ? '(dev proxy)' : '(prod proxy)');

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[YourWojak] API error:', response.status, text);
    throw new Error(`MintGarden API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[YourWojak] Received:', data.items?.length, 'NFTs');

  return data.items || [];
}

export function YourWojakSection() {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Cascading trait filter: category -> value
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTraitValue, setSelectedTraitValue] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'category' | 'value' | null>(null);

  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isLightboxOpen = selectedIndex !== null;

  // Fetch NFTs from MintGarden
  const { data: mintgardenNfts = [], isLoading, error, refetch } = useQuery<MintGardenNFT[]>({
    queryKey: ['your-wojak-collection'],
    queryFn: fetchYourWojakNFTs,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  // Filter NFTs based on selected filters (placeholder - would need metadata)
  const filteredNfts = useMemo(() => {
    return mintgardenNfts;
  }, [mintgardenNfts, typeFilter, selectedCategory, selectedTraitValue]);

  // Get the label for selected category
  const selectedCategoryLabel = selectedCategory
    ? TRAIT_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Category'
    : 'Category';

  // Get trait options for selected category
  const traitOptions = selectedCategory ? TRAIT_OPTIONS[selectedCategory] || [] : [];

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === selectedCategory) {
      // Clicking same category clears it
      setSelectedCategory(null);
      setSelectedTraitValue(null);
    } else {
      setSelectedCategory(categoryId);
      setSelectedTraitValue(null); // Reset value when category changes
    }
    setOpenDropdown(null);
  };

  const handleTraitValueSelect = (value: string) => {
    if (value === selectedTraitValue) {
      setSelectedTraitValue(null);
    } else {
      setSelectedTraitValue(value);
    }
    setOpenDropdown(null);
  };

  const clearFilter = () => {
    setSelectedCategory(null);
    setSelectedTraitValue(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Lightbox navigation
  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    document.body.style.overflow = '';
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Type Filter - Emoji buttons + Trait Dropdowns on same row */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', zIndex: 30 }}>
        {/* Type buttons */}
        <button
          type="button"
          className={`your-wojak-type-btn ${!typeFilter ? 'active' : ''}`}
          onClick={() => setTypeFilter(null)}
        >
          <span className="text-lg">🌐</span>
          <span className="text-xs">All</span>
        </button>
        {COMBAT_TYPES.map(t => (
          <button
            key={t.id}
            type="button"
            className={`your-wojak-type-btn ${typeFilter === t.id ? 'active' : ''}`}
            onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
          >
            <span className="text-lg">{t.emoji}</span>
            <span className="text-xs">{t.label}</span>
          </button>
        ))}

        {/* Spacer to push dropdowns to the right */}
        <div className="flex-1" />

        {/* Category Dropdown */}
        <div className="relative flex-shrink-0" style={{ zIndex: 50 }}>
          <button
            type="button"
            className={`your-wojak-filter-dropdown ${selectedCategory ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === 'category' ? null : 'category');
            }}
          >
            <span>{selectedCategoryLabel}</span>
            <ChevronDown size={14} />
          </button>
          {openDropdown === 'category' && (
            <div className="your-wojak-filter-menu" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="your-wojak-dropdown-item"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedTraitValue(null);
                  setOpenDropdown(null);
                }}
              >
                All Categories
              </button>
              {TRAIT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`your-wojak-dropdown-item ${selectedCategory === cat.id ? 'selected' : ''}`}
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Value Dropdown - always visible */}
        <div className="relative flex-shrink-0" style={{ zIndex: 50 }}>
          <button
            type="button"
            className={`your-wojak-filter-dropdown ${selectedTraitValue ? 'active' : ''} ${!selectedCategory ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedCategory) {
                setOpenDropdown(openDropdown === 'value' ? null : 'value');
              }
            }}
            disabled={!selectedCategory}
          >
            <span>{selectedTraitValue || (selectedCategory ? 'Select Trait' : 'Select category first')}</span>
            <ChevronDown size={14} />
          </button>
          {openDropdown === 'value' && selectedCategory && (
            <div className="your-wojak-filter-menu" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="your-wojak-dropdown-item"
                onClick={() => {
                  setSelectedTraitValue(null);
                  setOpenDropdown(null);
                }}
              >
                All {selectedCategoryLabel}s
              </button>
              {traitOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`your-wojak-dropdown-item ${selectedTraitValue === option ? 'selected' : ''}`}
                  onClick={() => handleTraitValueSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Display */}
      {selectedTraitValue && (
        <div className="flex gap-2 flex-wrap">
          <span className="badge badge-active flex items-center gap-1">
            {selectedCategoryLabel}: {selectedTraitValue}
            <button
              type="button"
              onClick={clearFilter}
              className="ml-1 hover:text-error"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card-static p-4 flex items-center gap-3" style={{ borderColor: 'var(--color-error)' }}>
          <AlertCircle size={20} className="text-error flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">Failed to load NFTs</p>
            <p className="text-xs text-secondary">{(error as Error).message}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn btn-ghost btn-sm flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* NFT Grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg animate-pulse"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            />
          ))}
        </div>
      ) : filteredNfts.length === 0 && !error ? (
        <div className="card-static p-8 text-center">
          <Palette size={48} className="text-muted mx-auto mb-3" />
          <p className="font-medium mb-1">No Wojaks yet</p>
          <p className="text-sm text-secondary mb-4">
            Create your first Wojak in the Generator.
          </p>
          <Link to="/generator" className="btn btn-primary">
            Create Wojak
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {filteredNfts.map((nft, index) => (
            <button
              key={nft.encoded_id}
              type="button"
              className="your-wojak-nft-card"
              onClick={() => openLightbox(index)}
              title={`View ${nft.name}`}
            >
              <img
                src={nft.thumbnail_uri || `https://assets.mintgarden.io/thumbnails/medium/${nft.encoded_id}.png`}
                alt={nft.name}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://assets.mintgarden.io/thumbnails/medium/${nft.encoded_id}.png`;
                }}
              />
              <div className="your-wojak-nft-overlay">
                <span className="text-xs font-medium">
                  #{nft.edition_number}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Full-featured Explorer Modal */}
      <YourWojakExplorer
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        nfts={filteredNfts}
        currentIndex={selectedIndex ?? 0}
        onIndexChange={handleIndexChange}
      />
    </div>
  );
}
