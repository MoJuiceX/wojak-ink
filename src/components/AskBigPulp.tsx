import { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Diamond,
  BarChart3,
  GraduationCap,
  Flame,
  Tag
} from 'lucide-react';
import { LoadingSpinner, LoadingDots } from './ui/LoadingSpinner';
import { fetchTradeValues, fetchCollectionStats, formatXCH, formatRelativeTime, type TraitStats, type CollectionStats } from '../services/tradeValuesService';
import { getXchPrice, getCachedXchPrice } from '../services/treasuryApi';
import './AskBigPulp.css';

interface NamedCombo {
  requires: string[];
  count: number;
  best_nft: string;
  best_rank: number;
  all_nfts: string[];
  lore: string;
  cultural_significance: string;
  rarity_note: string;
}

interface ComboDatabase {
  named_combos: Record<string, NamedCombo>;
  rare_pairings: Array<{
    traits: string[];
    count: number;
    best_nft: string;
    best_rank: number;
    nft_ids: string[];
  }>;
}

interface TraitInsight {
  count: number;
  percentile: number;
  category: string;
  provenance_tier: string;
  cultural_note: string;
  community_meme?: string;
  pairs_well_with: string[];
  best_holder: {
    nft_id: string;
    rank: number;
  };
  fun_fact: string;
}

interface HpTrait {
  count: number;
  creator: string;
  lore: string;
}

interface HpTraitsData {
  head: Record<string, HpTrait>;
  clothes: Record<string, HpTrait>;
  faceWear: Record<string, HpTrait>;
  mouth: Record<string, HpTrait>;
}

type HpTraitsNfts = Record<string, Record<string, number[]>>;

interface ComboRequirement {
  [category: string]: string;
}

interface Combo {
  id: string;
  name: string;
  emoji: string;
  category: 'legendary' | 'signature' | 'military' | 'character' | 'divine' | 'location' | 'single_trait';
  logic: 'exact' | 'any_two' | 'trait_plus_base' | 'single';
  requirements?: ComboRequirement;
  requirementPool?: ComboRequirement[];
  requiredBases?: string[];
  lore: string;
}

interface CombosData {
  combos: Combo[];
  categories: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
}

type ComboBadgesNfts = Record<string, number[]>;

interface TopSale {
  edition: number;
  price_xch: number;
  timestamp: string;
  nftName: string;
}

interface AskBigPulpProps {
  onNftClick: (nftId: string) => void;
}

const getNftImageUrl = (id: string | number) => {
  const paddedId = String(id).padStart(4, '0');
  return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`;
};

// Format USD value
const formatUsd = (xch: number, xchPrice: number): string => {
  const usd = xch * xchPrice;
  if (usd >= 1000) {
    return `$${(usd / 1000).toFixed(1)}k`;
  }
  return `$${usd.toFixed(0)}`;
};

const AskBigPulp: React.FC<AskBigPulpProps> = ({ onNftClick }) => {
  const [comboData, setComboData] = useState<ComboDatabase | null>(null);
  const [, setTraitInsights] = useState<Record<string, TraitInsight> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('stats');

  // Trade data from API
  const [topTraits, setTopTraits] = useState<TraitStats[]>([]);
  const [topSales, setTopSales] = useState<TopSale[]>([]);
  const [tradeDataLoading, setTradeDataLoading] = useState(true);

  // Collection stats from MintGarden API
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // XCH price for USD conversion
  const [xchPriceUsd, setXchPriceUsd] = useState<number>(getCachedXchPrice());

  // High Provenance traits data
  const [hpTraits, setHpTraits] = useState<HpTraitsData | null>(null);
  const [hpTraitsNfts, setHpTraitsNfts] = useState<HpTraitsNfts | null>(null);
  const [expandedHpCategory, setExpandedHpCategory] = useState<string | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Combo badges data
  const [combosData, setCombosData] = useState<CombosData | null>(null);
  const [comboBadgesNfts, setComboBadgesNfts] = useState<ComboBadgesNfts | null>(null);
  const [expandedComboCategory, setExpandedComboCategory] = useState<string | null>(null);
  const [comboCarouselIndices, setComboCarouselIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [comboRes, traitsRes, hpRes, hpNftsRes, comboBadgesRes, comboBadgesNftsRes] = await Promise.all([
          fetch('/assets/BigPulp/combo_database.json'),
          fetch('/assets/BigPulp/trait_insights.json'),
          fetch('/assets/BigPulp/hp_traits.json'),
          fetch('/assets/BigPulp/hp_traits_nfts.json'),
          fetch('/assets/BigPulp/combos_badges.json'),
          fetch('/assets/BigPulp/combo_badges_nfts.json')
        ]);
        const combos = await comboRes.json();
        const traits = await traitsRes.json();
        const hp = await hpRes.json();
        const hpNfts = await hpNftsRes.json();
        const comboBadges = await comboBadgesRes.json();
        const comboBadgesNftsData = await comboBadgesNftsRes.json();
        setComboData(combos);
        setTraitInsights(traits);
        setHpTraits(hp);
        setHpTraitsNfts(hpNfts);
        setCombosData(comboBadges);
        setComboBadgesNfts(comboBadgesNftsData);
      } catch (err) {
        console.error('Failed to load BigPulp data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load trade values data
  useEffect(() => {
    const loadTradeData = async () => {
      try {
        const data = await fetchTradeValues();

        // Top 10 traits by average XCH
        setTopTraits(data.trait_stats.slice(0, 10));

        // Top 10 sales from all_sales (sorted by price, unique NFTs only)
        if (data.all_sales && data.all_sales.length > 0) {
          // Sort by price descending
          const sortedSales = [...data.all_sales].sort((a, b) => b.price_xch - a.price_xch);

          // Deduplicate: keep only the highest sale for each NFT edition
          const seenEditions = new Set<number>();
          const uniqueSales = sortedSales.filter(sale => {
            if (seenEditions.has(sale.edition)) {
              return false;
            }
            seenEditions.add(sale.edition);
            return true;
          });

          setTopSales(uniqueSales.slice(0, 10) as TopSale[]);
        }
      } catch (err) {
        console.error('Failed to load trade data:', err);
      } finally {
        setTradeDataLoading(false);
      }
    };
    loadTradeData();
  }, []);

  // Load collection stats from MintGarden and XCH price
  useEffect(() => {
    const loadCollectionStats = async () => {
      try {
        const [stats, price] = await Promise.all([
          fetchCollectionStats(),
          getXchPrice()
        ]);
        setCollectionStats(stats);
        setXchPriceUsd(price);
      } catch (err) {
        console.error('Failed to load collection stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadCollectionStats();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="ask-loading">
        <LoadingSpinner size={24} />
        <p>Loading BigPulp Intelligence...</p>
      </div>
    );
  }

  // HP category labels
  const hpCategoryLabels: Record<string, string> = {
    head: 'Head',
    clothes: 'Clothes',
    faceWear: 'Face Wear',
    mouth: 'Mouth'
  };

  const toggleHpCategory = (category: string) => {
    setExpandedHpCategory(expandedHpCategory === category ? null : category);
  };

  // Combo badges category labels and toggle
  const comboCategoryInfo = [
    { id: 'legendary', name: 'Legendary Combos', emoji: '🏆' },
    { id: 'signature', name: 'Signature Combos', emoji: '✍️' },
    { id: 'military', name: 'Military Combos', emoji: '🪖' },
    { id: 'character', name: 'Character Combos', emoji: '🎭' },
    { id: 'divine', name: 'Divine Combos', emoji: '✨' },
    { id: 'location', name: 'Location Combos', emoji: '📍' },
    { id: 'single_trait', name: 'Single Trait Badges', emoji: '🎖️' },
  ];

  const toggleComboCategory = (category: string) => {
    setExpandedComboCategory(expandedComboCategory === category ? null : category);
  };

  const formatComboRequirements = (combo: Combo): string => {
    switch (combo.logic) {
      case 'exact':
        return Object.values(combo.requirements || {}).join(' + ');
      case 'any_two': {
        const traits = (combo.requirementPool || []).map(req => Object.values(req)[0]);
        return `Any 2 of: ${traits.join(', ')}`;
      }
      case 'trait_plus_base': {
        const trait = Object.values(combo.requirements || {})[0];
        return `${trait} + ${(combo.requiredBases || []).join('/')} base`;
      }
      case 'single':
        return Object.values(combo.requirements || {})[0] + ' (single trait)';
      default:
        return '';
    }
  };

  // Carousel navigation for combo badges
  const getComboCarouselIndex = (comboId: string): number => {
    return comboCarouselIndices[comboId] || 0;
  };

  const navigateComboCarousel = (comboId: string, direction: 'prev' | 'next', maxLength: number) => {
    setComboCarouselIndices(prev => {
      const current = prev[comboId] || 0;
      let newIndex: number;
      if (direction === 'next') {
        newIndex = current < maxLength - 1 ? current + 1 : 0;
      } else {
        newIndex = current > 0 ? current - 1 : maxLength - 1;
      }
      return { ...prev, [comboId]: newIndex };
    });
  };

  // Carousel navigation for HP traits
  const getCarouselIndex = (traitName: string): number => {
    return carouselIndices[traitName] || 0;
  };

  const navigateCarousel = (traitName: string, direction: 'prev' | 'next', maxLength: number) => {
    setCarouselIndices(prev => {
      const current = prev[traitName] || 0;
      let newIndex: number;
      if (direction === 'next') {
        newIndex = current < maxLength - 1 ? current + 1 : 0;
      } else {
        newIndex = current > 0 ? current - 1 : maxLength - 1;
      }
      return { ...prev, [traitName]: newIndex };
    });
  };

  // Get rarest 1-of-1 pairings (deduplicated by NFT)
  const rarestPairings = comboData?.rare_pairings
    ? (() => {
        const seenNfts = new Set<string>();
        return comboData.rare_pairings
          .filter(p => p.count === 1)
          .filter(p => {
            if (seenNfts.has(p.best_nft)) {
              return false;
            }
            seenNfts.add(p.best_nft);
            return true;
          })
          .slice(0, 20);
      })()
    : [];


  return (
    <div className="ask-bigpulp">
      {/* 1. Collection Stats Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'stats' ? 'expanded' : ''}`}
          onClick={() => toggleSection('stats')}
        >
          <div className="section-header-left">
            <BarChart3 size={20} className="section-icon green" />
            <span className="section-title">Collection Stats</span>
          </div>
          {expandedSection === 'stats' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'stats' && (
          <div className="section-content">
            {statsLoading ? (
              <div className="section-loading">
                <LoadingDots size={8} />
              </div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{collectionStats?.supply.toLocaleString() || '4,200'}</span>
                  <span className="stat-label">Total Supply</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{collectionStats?.trade_count.toLocaleString() || '—'}</span>
                  <span className="stat-label">Total Trades</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number green-text">{formatXCH(collectionStats?.floor_xch, 1)} XCH</span>
                  <div className="stat-label-row">
                    <span className="stat-usd">{formatUsd(collectionStats?.floor_xch || 0, xchPriceUsd)}</span>
                    <span className="stat-label">Floor Price</span>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{formatXCH(collectionStats?.volume_xch, 0)} XCH</span>
                  <div className="stat-label-row">
                    <span className="stat-usd">{formatUsd(collectionStats?.volume_xch || 0, xchPriceUsd)}</span>
                    <span className="stat-label">Total Volume</span>
                  </div>
                </div>
                <div className="stat-card wide">
                  <span className="stat-number">{formatXCH(collectionStats?.market_cap_xch, 0)} XCH</span>
                  <div className="stat-label-row">
                    <span className="stat-usd">{formatUsd(collectionStats?.market_cap_xch || 0, xchPriceUsd)}</span>
                    <span className="stat-label">Market Cap (Floor × Supply)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Learn Provenance Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'provenance' ? 'expanded' : ''}`}
          onClick={() => toggleSection('provenance')}
        >
          <div className="section-header-left">
            <GraduationCap size={20} className="section-icon blue" />
            <span className="section-title">Learn Provenance</span>
          </div>
          {expandedSection === 'provenance' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'provenance' && (
          <div className="section-content">
            <div className="provenance-cards">
              <div className="provenance-card">
                <h4>High Provenance</h4>
                <p>These aren't necessarily the rarest attributes, but they're the most valuable. The community has spoken — Crown, Military Beret, Wizard Hat, Fedora, and Neckbeard command premium prices because of their cultural significance and meme status.</p>
              </div>
              <div className="provenance-card">
                <h4>Rarest Attributes</h4>
                <p>The scarcest attributes in the collection. Piccolo Turban, Piccolo Uniform, Fake It Mask, El Presidente, and Goose Suit are among the rarest pieces you can find. These dominate the top rankings.</p>
              </div>
              <div className="provenance-card">
                <h4>Bases</h4>
                <p>Monkey Zoo represents the OG ape heritage from the early grove — primal energy meets Wojak culture. Papa Tang is the founder energy, the king of the grove himself, inspired by Tales of the Grove and WMC creator lore.</p>
              </div>
              <div className="provenance-card">
                <h4>Named Combos</h4>
                <p>The artist crafted these matching sets with intention. Ronin Helmet pairs with Ronin clothes and Ronin Dojo background. Wizard Hat matches Wizard Drip and Wizard Glasses. These aren't random — they're designed to work together as complete transformations.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Top 10 Most Valuable Traits Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'topTraits' ? 'expanded' : ''}`}
          onClick={() => toggleSection('topTraits')}
        >
          <div className="section-header-left">
            <Flame size={20} className="section-icon color-orange" />
            <span className="section-title">Top 10 Valuable Attributes</span>
          </div>
          {expandedSection === 'topTraits' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'topTraits' && (
          <div className="section-content">
            {tradeDataLoading ? (
              <div className="section-loading">
                <LoadingDots size={8} />
              </div>
            ) : topTraits.length > 0 ? (
              <>
                <p className="section-intro">Attributes with highest average sale prices</p>
                <div className="top-list">
                  {topTraits.map((trait, idx) => (
                    <div key={`${trait.trait_category}-${trait.trait_name}`} className="top-list-item">
                      <span className="top-rank">#{idx + 1}</span>
                      <div className="top-info">
                        <span className="top-name">{trait.trait_name}</span>
                        <span className="top-category">{trait.trait_category}</span>
                      </div>
                      <div className="top-stats">
                        <span className="top-price">{formatXCH(trait.average_xch)} XCH</span>
                        <span className="top-usd">{formatUsd(trait.average_xch, xchPriceUsd)}</span>
                        <span className="top-sales">{trait.total_sales} sales</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="section-empty">No trade data available</p>
            )}
          </div>
        )}
      </div>

      {/* 4. Top 10 Most Valuable Sales Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'topSales' ? 'expanded' : ''}`}
          onClick={() => toggleSection('topSales')}
        >
          <div className="section-header-left">
            <Tag size={20} className="section-icon gold" />
            <span className="section-title">Top 10 Highest Sales</span>
          </div>
          {expandedSection === 'topSales' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'topSales' && (
          <div className="section-content">
            {tradeDataLoading ? (
              <div className="section-loading">
                <LoadingDots size={8} />
              </div>
            ) : topSales.length > 0 ? (
              <>
                <p className="section-intro">Highest individual NFT sales recorded</p>
                <div className="top-sales-gallery">
                  {topSales.map((sale, idx) => (
                    <div
                      key={`${sale.edition}-${sale.timestamp}`}
                      className="top-sale-card"
                      onClick={() => onNftClick(String(sale.edition))}
                    >
                      <div className="sale-rank-badge">#{idx + 1}</div>
                      <img
                        src={getNftImageUrl(sale.edition)}
                        alt={sale.nftName || `#${sale.edition}`}
                        className="sale-image"
                        loading="lazy"
                      />
                      <div className="sale-info">
                        <span className="sale-name">{sale.nftName || `#${sale.edition}`}</span>
                        <span className="sale-price">{formatXCH(sale.price_xch)} XCH <span className="sale-usd">{formatUsd(sale.price_xch, xchPriceUsd)}</span></span>
                        <span className="sale-date">{formatRelativeTime(sale.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="section-empty">No sales data available</p>
            )}
          </div>
        )}
      </div>

      {/* 5. Rarest Finds Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'rarest' ? 'expanded' : ''}`}
          onClick={() => toggleSection('rarest')}
        >
          <div className="section-header-left">
            <Diamond size={20} className="section-icon purple" />
            <span className="section-title">Rarest Finds</span>
          </div>
          {expandedSection === 'rarest' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'rarest' && (
          <div className="section-content">
            <p className="section-intro">1-of-1 attribute combinations</p>
            <div className="rarest-gallery">
              {rarestPairings.map((pairing, idx) => (
                <div
                  key={idx}
                  className="rarest-item"
                  onClick={() => onNftClick(pairing.best_nft)}
                >
                  <img
                    src={getNftImageUrl(pairing.best_nft)}
                    alt={`#${pairing.best_nft}`}
                    className="rarest-image"
                    loading="lazy"
                  />
                  <div className="rarest-info">
                    <span className="rarest-rank">Rank #{pairing.best_rank}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. High Provenance Traits Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'stier' ? 'expanded' : ''}`}
          onClick={() => toggleSection('stier')}
        >
          <div className="section-header-left">
            <span className="section-emoji">👑</span>
            <span className="section-title">High Provenance</span>
            <span className="hp-count-badge">43</span>
          </div>
          {expandedSection === 'stier' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'stier' && (
          <div className="section-content">
            <p className="section-intro">Community-valued attributes with lore</p>
            {hpTraits && hpTraitsNfts && (
              <div className="hp-categories">
                {(['head', 'clothes', 'faceWear', 'mouth'] as const).map(category => {
                  const traits = hpTraits[category];
                  const nftsData = hpTraitsNfts[category];
                  const traitCount = Object.keys(traits).length;
                  return (
                    <div key={category} className="hp-category">
                      <button
                        type="button"
                        className={`hp-category-header ${expandedHpCategory === category ? 'expanded' : ''}`}
                        onClick={() => toggleHpCategory(category)}
                      >
                        <span className="hp-category-title">
                          {hpCategoryLabels[category]} <span className="hp-category-count">({traitCount})</span>
                        </span>
                        {expandedHpCategory === category ? (
                          <ChevronLeft size={16} className="hp-category-chevron" />
                        ) : (
                          <ChevronRight size={16} className="hp-category-chevron" />
                        )}
                      </button>

                      {expandedHpCategory === category && (
                        <div className="hp-traits-list">
                          {Object.entries(traits).map(([name, trait]) => {
                            const nfts = nftsData?.[name] || [];
                            const currentIndex = getCarouselIndex(name);
                            const prevIndex = currentIndex > 0 ? currentIndex - 1 : nfts.length - 1;
                            const nextIndex = currentIndex < nfts.length - 1 ? currentIndex + 1 : 0;

                            return (
                              <div key={name} className="hp-trait-card">
                                <div className="hp-trait-content">
                                  {/* Carousel */}
                                  {nfts.length > 0 && (
                                    <div className="hp-carousel">
                                      <button
                                        type="button"
                                        className="hp-carousel-btn prev"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateCarousel(name, 'prev', nfts.length);
                                        }}
                                      >
                                        <ChevronLeft size={16} />
                                      </button>

                                      <div className="hp-carousel-track">
                                        {/* Previous NFT (hint) */}
                                        <div
                                          className="hp-carousel-item hint prev"
                                          onClick={() => onNftClick(String(nfts[prevIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[prevIndex])}
                                            alt={`#${nfts[prevIndex]}`}
                                            loading="lazy"
                                          />
                                        </div>

                                        {/* Current NFT */}
                                        <div
                                          className="hp-carousel-item current"
                                          onClick={() => onNftClick(String(nfts[currentIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[currentIndex])}
                                            alt={`#${nfts[currentIndex]}`}
                                            loading="lazy"
                                          />
                                        </div>

                                        {/* Next NFT (hint) */}
                                        <div
                                          className="hp-carousel-item hint next"
                                          onClick={() => onNftClick(String(nfts[nextIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[nextIndex])}
                                            alt={`#${nfts[nextIndex]}`}
                                            loading="lazy"
                                          />
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        className="hp-carousel-btn next"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateCarousel(name, 'next', nfts.length);
                                        }}
                                      >
                                        <ChevronRight size={16} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Trait info */}
                                  <div className="hp-trait-info">
                                    <div className="hp-trait-header">
                                      <span className="hp-trait-name">{name}</span>
                                      <span className="hp-trait-count">{trait.count} exist</span>
                                    </div>
                                    <div className="hp-trait-lore">{trait.lore}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Combo Badges Section */}
      <div className="ask-section">
        <button
          type="button"
          className={`section-header ${expandedSection === 'comboBadges' ? 'expanded' : ''}`}
          onClick={() => toggleSection('comboBadges')}
        >
          <div className="section-header-left">
            <span className="section-emoji">🏆</span>
            <span className="section-title">Combo Badges</span>
            <span className="hp-count-badge">26</span>
          </div>
          {expandedSection === 'comboBadges' ? (
            <ChevronLeft size={18} className="section-chevron" />
          ) : (
            <ChevronRight size={18} className="section-chevron" />
          )}
        </button>

        {expandedSection === 'comboBadges' && (
          <div className="section-content">
            <p className="section-intro">Earn badges by holding specific trait combinations</p>
            {combosData && (
              <div className="combo-categories">
                {comboCategoryInfo.map(cat => {
                  const combosInCategory = combosData.combos.filter(c => c.category === cat.id);
                  if (combosInCategory.length === 0) return null;
                  return (
                    <div key={cat.id} className="combo-category">
                      <button
                        type="button"
                        className={`combo-category-header ${expandedComboCategory === cat.id ? 'expanded' : ''}`}
                        onClick={() => toggleComboCategory(cat.id)}
                      >
                        <span className="combo-category-title">
                          <span className="combo-category-emoji">{cat.emoji}</span>
                          {cat.name} <span className="combo-category-count">({combosInCategory.length})</span>
                        </span>
                        {expandedComboCategory === cat.id ? (
                          <ChevronLeft size={16} className="combo-category-chevron" />
                        ) : (
                          <ChevronRight size={16} className="combo-category-chevron" />
                        )}
                      </button>

                      {expandedComboCategory === cat.id && (
                        <div className="combo-badges-list">
                          {combosInCategory.map(combo => {
                            const nfts = comboBadgesNfts?.[combo.id] || [];
                            const currentIndex = getComboCarouselIndex(combo.id);
                            const prevIndex = currentIndex > 0 ? currentIndex - 1 : nfts.length - 1;
                            const nextIndex = currentIndex < nfts.length - 1 ? currentIndex + 1 : 0;

                            return (
                              <div key={combo.id} className="combo-badge-card">
                                <div className="combo-badge-content">
                                  {/* Carousel */}
                                  {nfts.length > 0 && (
                                    <div className="hp-carousel">
                                      <button
                                        type="button"
                                        className="hp-carousel-btn prev"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateComboCarousel(combo.id, 'prev', nfts.length);
                                        }}
                                      >
                                        <ChevronLeft size={16} />
                                      </button>

                                      <div className="hp-carousel-track">
                                        {/* Previous NFT (hint) */}
                                        <div
                                          className="hp-carousel-item hint prev"
                                          onClick={() => onNftClick(String(nfts[prevIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[prevIndex])}
                                            alt={`NFT`}
                                            loading="lazy"
                                          />
                                        </div>

                                        {/* Current NFT */}
                                        <div
                                          className="hp-carousel-item current"
                                          onClick={() => onNftClick(String(nfts[currentIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[currentIndex])}
                                            alt={`NFT`}
                                            loading="lazy"
                                          />
                                        </div>

                                        {/* Next NFT (hint) */}
                                        <div
                                          className="hp-carousel-item hint next"
                                          onClick={() => onNftClick(String(nfts[nextIndex]))}
                                        >
                                          <img
                                            src={getNftImageUrl(nfts[nextIndex])}
                                            alt={`NFT`}
                                            loading="lazy"
                                          />
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        className="hp-carousel-btn next"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateComboCarousel(combo.id, 'next', nfts.length);
                                        }}
                                      >
                                        <ChevronRight size={16} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Badge info */}
                                  <div className="combo-badge-info">
                                    <div className="combo-badge-header">
                                      <span className="combo-badge-emoji">{combo.emoji}</span>
                                      <span className="combo-badge-name">{combo.name}</span>
                                      <span className="combo-badge-count">{nfts.length} NFTs</span>
                                    </div>
                                    <div className="combo-badge-requirements">
                                      {formatComboRequirements(combo)}
                                    </div>
                                    <div className="combo-badge-lore">{combo.lore}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AskBigPulp;
