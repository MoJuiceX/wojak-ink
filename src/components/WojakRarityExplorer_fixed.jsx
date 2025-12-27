import React, { useState, useEffect, memo } from 'react';

const rarityData = {
  "Base": [
    { name: "Wojak", count: 1996, pct: 47.52, tier: "common" },
    { name: "Soyjak", count: 750, pct: 17.86, tier: "common" },
    { name: "Waifu", count: 250, pct: 5.95, tier: "uncommon" },
    { name: "Papa Tang", count: 250, pct: 5.95, tier: "uncommon" },
    { name: "Baddie", count: 200, pct: 4.76, tier: "rare" },
    { name: "Monkey Zoo", count: 200, pct: 4.76, tier: "rare" },
    { name: "Bepe Wojak", count: 124, pct: 2.95, tier: "rare" },
    { name: "Alien Wojak", count: 100, pct: 2.38, tier: "rare" },
    { name: "Bepe Soyjak", count: 96, pct: 2.29, tier: "rare" },
    { name: "Alien Soyjak", count: 80, pct: 1.90, tier: "rare" },
    { name: "Bepe Waifu", count: 42, pct: 1.00, tier: "rare" },
    { name: "Bepe Baddie", count: 42, pct: 1.00, tier: "rare" },
    { name: "Alien Waifu", count: 35, pct: 0.83, tier: "legendary" },
    { name: "Alien Baddie", count: 35, pct: 0.83, tier: "legendary" }
  ],
  "Face": [
    { name: "Classic", count: 2080, pct: 49.52, tier: "common" },
    { name: "Rekt", count: 654, pct: 15.57, tier: "common" },
    { name: "Terminator", count: 435, pct: 10.36, tier: "uncommon" },
    { name: "Rugged", count: 413, pct: 9.83, tier: "uncommon" },
    { name: "Bleeding Bags", count: 364, pct: 8.67, tier: "uncommon" },
    { name: "NPC", count: 254, pct: 6.05, tier: "uncommon" }
  ],
  "Mouth": [
    { name: "Numb", count: 490, pct: 11.67, tier: "uncommon" },
    { name: "Cig", count: 414, pct: 9.86, tier: "uncommon" },
    { name: "Screaming", count: 348, pct: 8.29, tier: "uncommon" },
    { name: "Joint", count: 303, pct: 7.21, tier: "uncommon" },
    { name: "Cohiba", count: 302, pct: 7.19, tier: "uncommon" },
    { name: "Gold Teeth", count: 275, pct: 6.55, tier: "uncommon" },
    { name: "Teeth", count: 248, pct: 5.90, tier: "uncommon" },
    { name: "Pizza", count: 220, pct: 5.24, tier: "uncommon" },
    { name: "Bubble Gum", count: 187, pct: 4.45, tier: "rare" },
    { name: "Neckbeard", count: 184, pct: 4.38, tier: "rare" },
    { name: "Pipe", count: 183, pct: 4.36, tier: "rare" },
    { name: "Smile", count: 179, pct: 4.26, tier: "rare" },
    { name: "Glossed Lips", count: 147, pct: 3.50, tier: "rare" },
    { name: "Vampire Teeth", count: 146, pct: 3.48, tier: "rare" },
    { name: "Stache", count: 138, pct: 3.29, tier: "rare" },
    { name: "Bandana Mask", count: 106, pct: 2.52, tier: "rare" },
    { name: "Copium Mask", count: 105, pct: 2.50, tier: "rare" },
    { name: "Stunned", count: 90, pct: 2.14, tier: "rare" },
    { name: "Hannibal Mask", count: 76, pct: 1.81, tier: "rare" },
    { name: "Sexy Lip Bite", count: 59, pct: 1.40, tier: "rare" }
  ],
  "Face Wear": [
    { name: "No Face Wear", count: 1490, pct: 35.48, tier: "common" },
    { name: "MOG Glasses", count: 302, pct: 7.19, tier: "uncommon" },
    { name: "Shades", count: 267, pct: 6.36, tier: "uncommon" },
    { name: "Alpha Shades", count: 222, pct: 5.29, tier: "uncommon" },
    { name: "Aviators", count: 194, pct: 4.62, tier: "rare" },
    { name: "Matrix Lenses", count: 180, pct: 4.29, tier: "rare" },
    { name: "Clown Nose", count: 180, pct: 4.29, tier: "rare" },
    { name: "3D Glasses", count: 164, pct: 3.90, tier: "rare" },
    { name: "Cool Glasses", count: 161, pct: 3.83, tier: "rare" },
    { name: "Cyber Shades", count: 157, pct: 3.74, tier: "rare" },
    { name: "Laser Eyes", count: 149, pct: 3.55, tier: "rare" },
    { name: "Wizard Glasses", count: 145, pct: 3.45, tier: "rare" },
    { name: "Ninja Turtle Mask", count: 143, pct: 3.40, tier: "rare" },
    { name: "Eye Patch", count: 122, pct: 2.90, tier: "rare" },
    { name: "Night Vision", count: 121, pct: 2.88, tier: "rare" },
    { name: "Tyson Tattoo", count: 97, pct: 2.31, tier: "rare" },
    { name: "VR Headset", count: 67, pct: 1.60, tier: "rare" },
    { name: "Fake It Mask", count: 39, pct: 0.93, tier: "legendary" }
  ],
  "Head": [
    { name: "No Headgear", count: 643, pct: 15.31, tier: "common" },
    { name: "Wizard Hat", count: 248, pct: 5.90, tier: "uncommon" },
    { name: "Super Saiyan", count: 195, pct: 4.64, tier: "rare" },
    { name: "Military Beret", count: 164, pct: 3.90, tier: "rare" },
    { name: "Clown", count: 143, pct: 3.40, tier: "rare" },
    { name: "Crown", count: 140, pct: 3.33, tier: "rare" },
    { name: "Construction Helmet", count: 140, pct: 3.33, tier: "rare" },
    { name: "Propeller Hat", count: 137, pct: 3.26, tier: "rare" },
    { name: "Viking Helmet", count: 135, pct: 3.21, tier: "rare" },
    { name: "Centurion", count: 132, pct: 3.14, tier: "rare" },
    { name: "Ronin Helmet", count: 129, pct: 3.07, tier: "rare" },
    { name: "Field Cap", count: 126, pct: 3.00, tier: "rare" },
    { name: "Cap", count: 126, pct: 3.00, tier: "rare" },
    { name: "SWAT Helmet", count: 124, pct: 2.95, tier: "rare" },
    { name: "Tin Foil Hat", count: 117, pct: 2.79, tier: "rare" },
    { name: "Fedora", count: 111, pct: 2.64, tier: "rare" },
    { name: "Firefighter Helmet", count: 108, pct: 2.57, tier: "rare" },
    { name: "Pirate Hat", count: 99, pct: 2.36, tier: "rare" },
    { name: "Hard Hat", count: 94, pct: 2.24, tier: "rare" },
    { name: "Super Wojak Hat", count: 92, pct: 2.19, tier: "rare" },
    { name: "Devil Horns", count: 91, pct: 2.17, tier: "rare" },
    { name: "Cowboy Hat", count: 88, pct: 2.10, tier: "rare" },
    { name: "Beer Hat", count: 85, pct: 2.02, tier: "rare" },
    { name: "Spikes", count: 85, pct: 2.02, tier: "rare" },
    { name: "Trump Wave", count: 78, pct: 1.86, tier: "rare" },
    { name: "Comrade Hat", count: 73, pct: 1.74, tier: "rare" },
    { name: "Halo", count: 71, pct: 1.69, tier: "rare" },
    { name: "Beanie", count: 69, pct: 1.64, tier: "rare" },
    { name: "Hip Hop Hat", count: 64, pct: 1.52, tier: "rare" },
    { name: "Mermaid Waves", count: 46, pct: 1.10, tier: "rare" },
    { name: "Vixen Waves", count: 38, pct: 0.90, tier: "legendary" },
    { name: "Ponytail", count: 33, pct: 0.79, tier: "legendary" },
    { name: "Power Bob", count: 29, pct: 0.69, tier: "legendary" },
    { name: "Twin Braids", count: 29, pct: 0.69, tier: "legendary" },
    { name: "Standard Cut", count: 27, pct: 0.64, tier: "legendary" },
    { name: "2Pac Bandana", count: 24, pct: 0.57, tier: "legendary" },
    { name: "Tiara", count: 24, pct: 0.57, tier: "legendary" },
    { name: "Soy Hair", count: 21, pct: 0.50, tier: "legendary" },
    { name: "Headphones", count: 13, pct: 0.31, tier: "legendary" },
    { name: "Piccolo Turban", count: 9, pct: 0.21, tier: "legendary" }
  ],
  "Clothes": [
    { name: "Topless", count: 271, pct: 6.45, tier: "uncommon" },
    { name: "Suit", count: 236, pct: 5.62, tier: "uncommon" },
    { name: "Sports Jacket", count: 236, pct: 5.62, tier: "uncommon" },
    { name: "Chia Farmer", count: 215, pct: 5.12, tier: "uncommon" },
    { name: "Bepe Army", count: 208, pct: 4.95, tier: "rare" },
    { name: "Born to Ride", count: 205, pct: 4.88, tier: "rare" },
    { name: "Leather Jacket", count: 199, pct: 4.74, tier: "rare" },
    { name: "Wizard Drip", count: 198, pct: 4.71, tier: "rare" },
    { name: "Roman Drip", count: 194, pct: 4.62, tier: "rare" },
    { name: "Super Saiyan Uniform", count: 190, pct: 4.52, tier: "rare" },
    { name: "Ronin", count: 168, pct: 4.00, tier: "rare" },
    { name: "Ninja Turtle Fit", count: 142, pct: 3.38, tier: "rare" },
    { name: "Viking Armor", count: 129, pct: 3.07, tier: "rare" },
    { name: "SWAT Gear", count: 127, pct: 3.02, tier: "rare" },
    { name: "Bathrobe", count: 124, pct: 2.95, tier: "rare" },
    { name: "Tee", count: 116, pct: 2.76, tier: "rare" },
    { name: "Tank Top", count: 107, pct: 2.55, tier: "rare" },
    { name: "Proof of Prayer", count: 101, pct: 2.40, tier: "rare" },
    { name: "Drac", count: 97, pct: 2.31, tier: "rare" },
    { name: "Firefighter Uniform", count: 93, pct: 2.21, tier: "rare" },
    { name: "Gopher Suit", count: 88, pct: 2.10, tier: "rare" },
    { name: "Straitjacket", count: 86, pct: 2.05, tier: "rare" },
    { name: "God's Robe", count: 80, pct: 1.90, tier: "rare" },
    { name: "Pepe Suit", count: 63, pct: 1.50, tier: "rare" },
    { name: "Goose Suit", count: 59, pct: 1.40, tier: "rare" },
    { name: "Sports Bra", count: 59, pct: 1.40, tier: "rare" },
    { name: "Bepe Suit", count: 56, pct: 1.33, tier: "rare" },
    { name: "Pickle Suit", count: 50, pct: 1.19, tier: "rare" },
    { name: "Vintage Dress", count: 50, pct: 1.19, tier: "rare" },
    { name: "El Presidente", count: 49, pct: 1.17, tier: "rare" },
    { name: "Astronaut", count: 44, pct: 1.05, tier: "rare" },
    { name: "Sonic Suit", count: 43, pct: 1.02, tier: "rare" },
    { name: "Denim Vest", count: 40, pct: 0.95, tier: "legendary" },
    { name: "Prom Dress", count: 32, pct: 0.76, tier: "legendary" },
    { name: "School Uniform", count: 31, pct: 0.74, tier: "legendary" },
    { name: "Piccolo Uniform", count: 14, pct: 0.33, tier: "legendary" }
  ],
  "Background": [
    { name: "Chia Green", count: 232, pct: 5.52, tier: "uncommon" },
    { name: "$CHIA", count: 219, pct: 5.21, tier: "uncommon" },
    { name: "Sky Dive", count: 206, pct: 4.90, tier: "rare" },
    { name: "Sky Shock Blue", count: 205, pct: 4.88, tier: "rare" },
    { name: "Green Candle", count: 192, pct: 4.57, tier: "rare" },
    { name: "Neo Mint", count: 176, pct: 4.19, tier: "rare" },
    { name: "Tangerine Pop", count: 148, pct: 3.52, tier: "rare" },
    { name: "Moon", count: 148, pct: 3.52, tier: "rare" },
    { name: "Bepe Barracks", count: 145, pct: 3.45, tier: "rare" },
    { name: "Orange Grove", count: 140, pct: 3.33, tier: "rare" },
    { name: "$HOA", count: 133, pct: 3.17, tier: "rare" },
    { name: "Mellow Yellow", count: 127, pct: 3.02, tier: "rare" },
    { name: "Radioactive Forest", count: 114, pct: 2.71, tier: "rare" },
    { name: "Hell", count: 113, pct: 2.69, tier: "rare" },
    { name: "Matrix", count: 107, pct: 2.55, tier: "rare" },
    { name: "Hot Coral", count: 94, pct: 2.24, tier: "rare" },
    { name: "$LOVE", count: 90, pct: 2.14, tier: "rare" },
    { name: "Heaven", count: 89, pct: 2.12, tier: "rare" },
    { name: "Golden Hour", count: 87, pct: 2.07, tier: "rare" },
    { name: "Chia Farm", count: 87, pct: 2.07, tier: "rare" },
    { name: "$BEPE", count: 82, pct: 1.95, tier: "rare" },
    { name: "Price Down", count: 79, pct: 1.88, tier: "rare" },
    { name: "One Market", count: 79, pct: 1.88, tier: "rare" },
    { name: "Pirate Ship", count: 76, pct: 1.81, tier: "rare" },
    { name: "NYSE Pump", count: 75, pct: 1.79, tier: "rare" },
    { name: "Price Up", count: 74, pct: 1.76, tier: "rare" },
    { name: "Route 66", count: 73, pct: 1.74, tier: "rare" },
    { name: "Silicon Data Center", count: 68, pct: 1.62, tier: "rare" },
    { name: "NYSE Dump", count: 63, pct: 1.50, tier: "rare" },
    { name: "Moms Basement", count: 61, pct: 1.45, tier: "rare" },
    { name: "Spell Room", count: 59, pct: 1.40, tier: "rare" },
    { name: "Nesting Grounds", count: 54, pct: 1.29, tier: "rare" },
    { name: "$PIZZA", count: 51, pct: 1.21, tier: "rare" },
    { name: "$NECKCOIN", count: 49, pct: 1.17, tier: "rare" },
    { name: "Ronin Dojo", count: 45, pct: 1.07, tier: "rare" },
    { name: "NYSE Rug", count: 45, pct: 1.07, tier: "rare" },
    { name: "White House", count: 45, pct: 1.07, tier: "rare" },
    { name: "$CASTER", count: 43, pct: 1.02, tier: "rare" },
    { name: "Everythings Fine", count: 42, pct: 1.00, tier: "rare" },
    { name: "Rome", count: 42, pct: 1.00, tier: "rare" },
    { name: "$HONK", count: 38, pct: 0.90, tier: "legendary" },
    { name: "Morning Routine", count: 36, pct: 0.86, tier: "legendary" },
    { name: "Rainforest", count: 30, pct: 0.71, tier: "legendary" },
    { name: "Crazy Room", count: 25, pct: 0.60, tier: "legendary" },
    { name: "Signal Lost", count: 14, pct: 0.33, tier: "legendary" }
  ]
};

const tierColors = {
  legendary: { bg: '#9333ea', text: '#ffffff', label: '🟣 LEGENDARY' },
  rare: { bg: '#3b82f6', text: '#ffffff', label: '🔵 RARE' },
  uncommon: { bg: '#22c55e', text: '#ffffff', label: '🟢 UNCOMMON' },
  common: { bg: '#9ca3af', text: '#ffffff', label: '⚪ COMMON' }
};

const tierThresholds = {
  legendary: '< 1%',
  rare: '1% - 5%',
  uncommon: '5% - 15%',
  common: '> 15%'
};

const categories = Object.keys(rarityData);

function WojakRarityExplorer() {
  const [activeTab, setActiveTab] = useState('Base');
  const [sortBy, setSortBy] = useState('count');
  const [filterTier, setFilterTier] = useState('all');
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftId, setNftId] = useState('');
  const [selectedNft, setSelectedNft] = useState(null);
  const [showError, setShowError] = useState(false);
  const [nftRarityData, setNftRarityData] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentData = rarityData[activeTab] || [];
  
  const filteredData = currentData
    .filter(item => filterTier === 'all' || item.tier === filterTier)
    .sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rarity') {
        const tierOrder = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
        return tierOrder[a.tier] - tierOrder[b.tier];
      }
      return 0;
    });

  const maxCount = Math.max(...currentData.map(d => d.count));

  const totalTraits = Object.values(rarityData).reduce((acc, arr) => acc + arr.length, 0);
  const legendaryCount = Object.values(rarityData).flat().filter(t => t.tier === 'legendary').length;

  // Load NFT rarity data on mount
  useEffect(() => {
    const loadNftData = async () => {
      try {
        const response = await fetch('/nftRarityData.json');
        if (response.ok) {
          const data = await response.json();
          setNftRarityData(data);
        }
      } catch (error) {
        console.error('Error loading NFT rarity data:', error);
      }
    };
    loadNftData();
  }, []);

  // Reset image loading state when nftId changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [nftId]);

  // Loading state when switching tabs
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Helper to get tier info from letter
  const getTierFromLetter = (letter) => {
    const tiers = {
      'l': { name: 'legendary', color: '#9333ea', label: '🟣 LEGENDARY' },
      'r': { name: 'rare', color: '#3b82f6', label: '🔵 RARE' },
      'u': { name: 'uncommon', color: '#22c55e', label: '🟢 UNCOMMON' },
      'c': { name: 'common', color: '#9ca3af', label: '⚪ COMMON' }
    };
    return tiers[letter] || tiers['c'];
  };

  // NFT lookup handlers
  const handleSearchWithId = (id) => {
    if (!nftRarityData) {
      setShowError(true);
      setSelectedNft(null);
      return;
    }
    
    const numId = parseInt(id, 10);
    
    if (isNaN(numId) || numId < 1 || numId > 4200) {
      setShowError(true);
      setSelectedNft(null);
      return;
    }
    
    const nft = nftRarityData[String(numId)];
    if (nft) {
      setSelectedNft(nft);
      setShowError(false);
    } else {
      setShowError(true);
      setSelectedNft(null);
    }
  };

  const handleNftIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setNftId(value);
    
    if (value.length === 4) {
      setTimeout(() => handleSearchWithId(value), 100);
    }
  };

  const handleNftIdKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClear();
    } else if (e.key === 'ArrowUp' && nftId) {
      e.preventDefault();
      const newId = Math.min(4200, parseInt(nftId || '0', 10) + 1);
      setNftId(String(newId));
      setTimeout(() => handleSearchWithId(String(newId)), 50);
    } else if (e.key === 'ArrowDown' && nftId) {
      e.preventDefault();
      const newId = Math.max(1, parseInt(nftId || '2', 10) - 1);
      setNftId(String(newId));
      setTimeout(() => handleSearchWithId(String(newId)), 50);
    }
  };

  const handleSearch = () => {
    if (!nftId) {
      handleClear();
      return;
    }
    handleSearchWithId(nftId);
  };

  const handleClear = () => {
    setNftId('');
    setSelectedNft(null);
    setShowError(false);
  };

  const scrollToHighlightedTrait = (traitValue) => {
    setTimeout(() => {
      const highlightedElement = document.querySelector('[data-highlighted="true"]');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const getRowStyle = (trait, idx) => {
    const isHighlighted = selectedNft && (
      (activeTab === 'Base' && trait.name === selectedNft[3]) ||
      (activeTab === 'Face' && trait.name === selectedNft[4]) ||
      (activeTab === 'Mouth' && trait.name === selectedNft[5]) ||
      (activeTab === 'Face Wear' && trait.name === selectedNft[6]) ||
      (activeTab === 'Head' && trait.name === selectedNft[7]) ||
      (activeTab === 'Clothes' && trait.name === selectedNft[8]) ||
      (activeTab === 'Background' && trait.name === selectedNft[9])
    );
    
    if (isHighlighted) {
      return {
        background: 'linear-gradient(90deg, rgba(255,165,0,0.3), rgba(255,165,0,0.15), rgba(255,165,0,0.3))',
        boxShadow: '0 0 12px 4px rgba(255,165,0,0.6), inset 0 0 8px rgba(255,165,0,0.2)',
        border: '2px solid #ff8c00',
        animation: 'pulse-glow 1.5s ease-in-out infinite'
      };
    }
    
    if (hoveredTrait === trait.name) {
      return {
        background: 'var(--surface-3, #e0e0ff)',
        border: '1px solid var(--title-active-bg, #000080)'
      };
    }
    
    return {
      background: idx % 2 === 0 ? 'var(--inset-face, #ffffff)' : 'var(--surface-2, #f8f8f8)',
      border: '1px solid transparent'
    };
  };

  return (
    <div style={{
      fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '100%',
      overflow: 'hidden',
      minHeight: 0
    }}>
      {/* Header Stats - Fixed */}
      <div style={{
        background: 'var(--surface-3, #ffffcc)',
        padding: '12px 16px',
        borderBottom: '2px solid',
        borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🍊</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-1, #000000)' }}>Wojak Farmers Plot</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2, #666)' }}>4,200 NFTs • {totalTraits} Traits • {legendaryCount} Legendary</div>
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          background: 'var(--title-active-bg, #000080)',
          padding: '6px 10px',
          border: '2px solid',
          borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)'
        }}>
          <span style={{ 
            color: 'var(--title-active-text, #00ff00)', 
            fontFamily: 'monospace', 
            fontSize: '11px',
            whiteSpace: 'nowrap'
          }}>
            NFT ID:
          </span>
          <input
            type="text"
            value={nftId}
            onChange={handleNftIdChange}
            onKeyDown={handleNftIdKeyDown}
            placeholder="0001"
            maxLength={4}
            style={{
              width: '55px',
              padding: '3px 6px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '2px inset var(--border-dark)',
              background: 'var(--inset-face, #ffffff)',
              color: 'var(--text-1, #000000)',
              textAlign: 'center'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '3px 8px',
              fontSize: '12px',
              background: 'var(--surface-1, #c0c0c0)',
              border: '2px solid',
              borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-1, #000000)'
            }}
            title="Search"
          >
            🔍
          </button>
          {(nftId || selectedNft) && (
            <button
              onClick={handleClear}
              style={{
                padding: '3px 8px',
                fontSize: '12px',
                background: 'var(--surface-1, #c0c0c0)',
                border: '2px solid',
                borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
                cursor: 'pointer',
                color: 'var(--text-1, #000000)'
              }}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* NFT Details Panel - Fixed when visible */}
      {selectedNft && (
        <div style={{
          margin: '8px',
          border: '2px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
          background: 'var(--surface-1, #c0c0c0)',
          flexShrink: 0
        }}>
          {/* Panel Title Bar */}
          <div style={{
            background: 'linear-gradient(90deg, var(--title-active-bg, #000080), var(--dialog-blue-light, #1084d0))',
            padding: '4px 8px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>📋 NFT Details</span>
            <span style={{
              background: getTierFromLetter(selectedNft[2]).color,
              padding: '2px 8px',
              fontSize: '10px',
              textTransform: 'uppercase'
            }}>
              {getTierFromLetter(selectedNft[2]).name}
            </span>
          </div>
          
          {/* Panel Content */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            background: 'var(--inset-face, #ffffff)',
            border: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            margin: '4px'
          }}>
            
            {/* Left Column: NFT Preview */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              minWidth: '120px'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                border: '2px solid',
                borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {!imageLoaded && !imageError && (
                  <div style={{ 
                    position: 'absolute', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#888'
                  }}>
                    Loading...
                  </div>
                )}
                {imageError && (
                  <div style={{ fontSize: '24px' }}>🖼️❌</div>
                )}
                <img 
                  src={`https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${String(parseInt(nftId)).padStart(4, '0')}.png`}
                  alt={`Wojak #${nftId}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  style={{
                    width: '96px',
                    height: '96px',
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.2s'
                  }}
                />
              </div>
              
              <div style={{
                background: getTierFromLetter(selectedNft[2]).color,
                color: '#ffffff',
                padding: '8px 12px',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  #{selectedNft[0]}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.9 }}>
                  of 4,200
                </div>
              </div>
              
              <div style={{
                background: 'var(--surface-2, #f0f0f0)',
                border: '1px solid var(--border-dark)',
                padding: '6px',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
                fontSize: '10px',
                color: 'var(--text-1, #000000)'
              }}>
                <div>Score: <strong>{selectedNft[1].toFixed(2)}</strong></div>
                <div>Top {((selectedNft[0] / 4200) * 100).toFixed(1)}%</div>
              </div>
            </div>
            
            {/* Right Column: Traits Table */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border-mid, #c0c0c0)',
                color: 'var(--text-1, #000000)'
              }}>
                {selectedNft[3]} #{String(parseInt(nftId)).padStart(4, '0')}
              </div>
              
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px'
              }}>
                <thead>
                  <tr style={{ background: 'var(--surface-3, #e0e0e0)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)' }}>Trait</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)' }}>Value</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)' }}>Rarity</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)' }}>%</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'Base', idx: 3 },
                    { key: 'Face', idx: 4 },
                    { key: 'Mouth', idx: 5 },
                    { key: 'Face Wear', idx: 6 },
                    { key: 'Head', idx: 7 },
                    { key: 'Clothes', idx: 8 },
                    { key: 'Background', idx: 9 },
                  ].map(({ key, idx }, rowIdx) => {
                    const value = selectedNft[idx];
                    const traitData = rarityData[key]?.find(t => t.name === value);
                    const tier = traitData?.tier || 'common';
                    const pct = traitData?.pct || 0;
                    const count = traitData?.count || 0;
                    
                    return (
                      <tr 
                        key={key}
                        style={{ 
                          background: rowIdx % 2 === 0 ? 'var(--inset-face, #ffffff)' : 'var(--surface-2, #f8f8f8)',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setActiveTab(key);
                          setTimeout(() => {
                            scrollToHighlightedTrait(value);
                          }, 150);
                        }}
                        title={`Click to view all ${key} traits`}
                      >
                        <td style={{ 
                          padding: '6px 8px', 
                          color: 'var(--text-2, #666)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)'
                        }}>
                          {key}
                        </td>
                        <td style={{ 
                          padding: '6px 8px', 
                          fontWeight: tier === 'legendary' ? 'bold' : 'normal',
                          color: tier === 'legendary' ? '#9333ea' : 'var(--text-1, #000000)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)'
                        }}>
                          {tier === 'legendary' && '⭐ '}{value}
                        </td>
                        <td style={{ 
                          padding: '6px 8px', 
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            background: tierColors[tier]?.bg || '#9ca3af',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {tier.slice(0, 3)}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '6px 8px', 
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                          color: 'var(--text-1, #000000)'
                        }}>
                          {pct.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '6px 8px', 
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          color: 'var(--text-2, #888)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)'
                        }}>
                          ({count.toLocaleString()})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div style={{
                marginTop: '8px',
                fontSize: '10px',
                color: 'var(--text-2, #888)',
                fontStyle: 'italic'
              }}>
                💡 Click any trait row to jump to that category
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs - Fixed */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        padding: '8px 8px 0 8px',
        gap: '2px',
        flexShrink: 0
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: activeTab === cat ? 'var(--surface-1, #c0c0c0)' : 'var(--surface-2, #a0a0a0)',
              border: '2px solid',
              borderColor: activeTab === cat 
                ? 'var(--border-light) var(--border-dark) var(--surface-1) var(--border-light)' 
                : 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
              borderBottom: activeTab === cat ? 'none' : `2px solid var(--border-dark)`,
              marginBottom: activeTab === cat ? '-2px' : '0',
              cursor: 'pointer',
              fontWeight: activeTab === cat ? 'bold' : 'normal',
              position: 'relative',
              zIndex: activeTab === cat ? 1 : 0,
              color: 'var(--text-1, #000000)'
            }}
          >
            {cat} ({rarityData[cat].length})
          </button>
        ))}
      </div>

      {/* Content Area - Main container with scrollable traits list */}
      <div style={{
        flex: 1,
        minHeight: 0,
        maxHeight: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 8px 8px 8px',
        background: 'var(--inset-face, #ffffff)',
        border: '2px solid',
        borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)'
      }}>
          {/* Toolbar - Fixed */}
          <div style={{
            background: 'var(--surface-1, #c0c0c0)',
            padding: '8px',
            borderBottom: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px' }}>Sort:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '3px 6px',
                  fontSize: '11px',
                  border: '2px solid',
                  borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                  background: 'var(--inset-face, #ffffff)',
                  color: '#000000',
                  cursor: 'pointer'
                }}
              >
                <option value="count" style={{ color: '#000000', background: '#ffffff' }}>By Count</option>
                <option value="rarity" style={{ color: '#000000', background: '#ffffff' }}>By Rarity</option>
                <option value="name" style={{ color: '#000000', background: '#ffffff' }}>By Name</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px' }}>Filter:</span>
              <select 
                value={filterTier} 
                onChange={(e) => setFilterTier(e.target.value)}
                style={{
                  padding: '3px 6px',
                  fontSize: '11px',
                  border: '2px solid',
                  borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                  background: 'var(--inset-face, #ffffff)',
                  color: '#000000',
                  cursor: 'pointer'
                }}
              >
                <option value="all" style={{ color: '#000000', background: '#ffffff' }}>All Tiers</option>
                <option value="legendary" style={{ color: '#000000', background: '#ffffff' }}>🟣 Legendary</option>
                <option value="rare" style={{ color: '#000000', background: '#ffffff' }}>🔵 Rare</option>
                <option value="uncommon" style={{ color: '#000000', background: '#ffffff' }}>🟢 Uncommon</option>
                <option value="common" style={{ color: '#000000', background: '#ffffff' }}>⚪ Common</option>
              </select>
            </div>
            <div style={{ 
              marginLeft: 'auto', 
              fontSize: '11px', 
              color: 'var(--text-2, #666)' 
            }}>
              Showing {filteredData.length} of {currentData.length} traits
            </div>
          </div>

          {/* Rarity Legend - Fixed */}
          <div style={{
            padding: '8px 12px',
            background: 'var(--surface-2, #f0f0f0)',
            borderBottom: '1px solid var(--border-mid, #c0c0c0)',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '11px',
            color: 'var(--text-1, #000000)',
            flexShrink: 0
          }}>
            {Object.entries(tierColors).map(([tier, colors]) => (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: colors.bg,
                  border: '1px solid var(--border-dark)'
                }} />
                <span>{tier.toUpperCase()}</span>
                <span style={{ color: 'var(--text-2, #888)' }}>({tierThresholds[tier]})</span>
              </div>
            ))}
          </div>

          {/* Traits List - SCROLLABLE */}
          <div 
            className="traits-list-scrollable"
            style={{ 
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'scroll',
              overflowX: 'hidden',
              padding: '8px',
              boxSizing: 'border-box',
              scrollbarWidth: 'auto',
              scrollbarColor: 'var(--surface-1, #c0c0c0) var(--surface-2, #e0e0e0)',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                fontSize: '12px',
                color: 'var(--text-2, #666)'
              }}>
                Loading...
              </div>
            ) : (
              filteredData.map((trait, idx) => {
                const isHighlighted = selectedNft && (
                  (activeTab === 'Base' && trait.name === selectedNft[3]) ||
                  (activeTab === 'Face' && trait.name === selectedNft[4]) ||
                  (activeTab === 'Mouth' && trait.name === selectedNft[5]) ||
                  (activeTab === 'Face Wear' && trait.name === selectedNft[6]) ||
                  (activeTab === 'Head' && trait.name === selectedNft[7]) ||
                  (activeTab === 'Clothes' && trait.name === selectedNft[8]) ||
                  (activeTab === 'Background' && trait.name === selectedNft[9])
                );

                const rowStyle = getRowStyle(trait, idx);

                return (
                  <div
                    key={trait.name}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    onMouseEnter={() => setHoveredTrait(trait.name)}
                    onMouseLeave={() => setHoveredTrait(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      marginBottom: '4px',
                      ...rowStyle,
                      transition: 'all 0.1s'
                    }}
                  >
                    <div style={{
                      width: '30px',
                      fontSize: '11px',
                      color: 'var(--text-2, #888)',
                      textAlign: 'center'
                    }}>
                      #{idx + 1}
                    </div>

                    <div style={{
                      width: '90px',
                      padding: '2px 6px',
                      background: tierColors[trait.tier].bg,
                      color: tierColors[trait.tier].text,
                      fontSize: '9px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginRight: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {trait.tier}
                    </div>

                    <div style={{
                      width: '160px',
                      fontSize: '12px',
                      fontWeight: trait.tier === 'legendary' ? 'bold' : 'normal',
                      color: trait.tier === 'legendary' ? '#9333ea' : 'var(--text-1, #000000)'
                    }}>
                      {trait.tier === 'legendary' && '⭐ '}{trait.name}
                    </div>

                    <div style={{
                      flex: 1,
                      height: '18px',
                      background: 'var(--surface-2, #e0e0e0)',
                      border: '1px solid var(--border-dark)',
                      marginRight: '10px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${(trait.count / maxCount) * 100}%`,
                        background: `linear-gradient(to bottom, ${tierColors[trait.tier].bg}dd, ${tierColors[trait.tier].bg})`,
                        transition: 'width 0.3s ease'
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 10px)'
                      }} />
                    </div>

                    <div style={{
                      width: '50px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      color: 'var(--text-1, #000000)'
                    }}>
                      {trait.count.toLocaleString()}
                    </div>

                    <div style={{
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '11px',
                      color: 'var(--text-2, #666)',
                      fontFamily: 'monospace'
                    }}>
                      {trait.pct.toFixed(2)}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* Error Dialog */}
      {showError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--surface-1, #c0c0c0)',
            border: '2px solid',
            borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
            boxShadow: '2px 2px 0 var(--text-1, #000)',
            minWidth: '300px'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--title-active-bg, #000080), var(--dialog-blue-light, #1084d0))',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
                ⚠️ Error
              </span>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '32px' }}>❌</span>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-1, #000000)' }}>
                  This is not a valid Wojak Farmers Plot NFT ID.
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-2, #666)' }}>
                  Please enter a number between 0001 and 4200.
                </p>
              </div>
            </div>
            
            <div style={{ padding: '8px 16px 16px', textAlign: 'center' }}>
              <button
                onClick={() => setShowError(false)}
                style={{
                  padding: '4px 24px',
                  fontSize: '12px',
                  background: 'var(--surface-1, #c0c0c0)',
                  border: '2px solid',
                  borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
                  cursor: 'pointer',
                  color: 'var(--text-1, #000000)'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar - Fixed */}
      <div style={{
        background: 'var(--surface-1, #c0c0c0)',
        padding: '4px 8px',
        borderTop: '2px solid',
        borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
        display: 'flex',
        gap: '16px',
        fontSize: '11px',
        flexShrink: 0
      }}>
        <div style={{
          flex: 1,
          border: '1px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
          padding: '2px 6px',
          background: 'var(--surface-1, #c0c0c0)',
          color: 'var(--text-1, #000000)'
        }}>
          Category: {activeTab} • {filteredData.length} traits displayed • Made with 🍊 by MoJuice for the Tang Gang
        </div>
        <div style={{
          width: '150px',
          border: '1px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
          padding: '2px 6px',
          background: 'var(--surface-1, #c0c0c0)',
          color: 'var(--text-1, #000000)'
        }}>
          Total: 4,200 NFTs
        </div>
      </div>
    </div>
  );
}

export default memo(WojakRarityExplorer);
