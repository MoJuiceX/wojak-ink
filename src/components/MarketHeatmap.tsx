// UPDATED: amber colors + dynamic columns v2
import { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchAllListings, calculateFloorPrice, getCachedListings, getNftImageUrl, type NFTListing } from '../services/marketApi';
import { getCachedXchPrice, getXchPrice } from '../services/treasuryApi';
import './MarketHeatmap.css';

interface MarketHeatmapProps {
  rankData?: Record<string, number>; // NFT ID -> rank (1-4200)
  onNftClick?: (nftId: string) => void;
}

interface HeatmapCell {
  rarityRange: string;
  priceRange: string;
  rarityMin: number;
  rarityMax: number;
  priceMin: number;
  priceMax: number;
  listings: NFTListing[];
  count: number;
}

type HeatmapMode = 'all' | 'sleepy' | 'delusion' | 'floor' | 'rare' | 'whale';
type ViewType = 'heatmap' | 'distribution';

const HEATMAP_MODES: { key: HeatmapMode; label: string; description: string }[] = [
  { key: 'all', label: 'All', description: 'Show all listed NFTs' },
  { key: 'sleepy', label: 'Sleepy Deals', description: 'Rare NFTs at low prices' },
  { key: 'delusion', label: 'Delusion', description: 'Overpriced listings' },
  { key: 'floor', label: 'Floor', description: 'NFTs at floor price' },
  { key: 'rare', label: 'Rare & Reasonable', description: 'Top rarity, fair price' },
  { key: 'whale', label: 'Whale', description: 'Premium rare NFTs' },
];

// Rarity ranges (percentile-based) - cleaner labels
const RARITY_RANGES = [
  { label: 'Top 10%', min: 0, max: 10 },
  { label: '20%', min: 10, max: 20 },
  { label: '30%', min: 20, max: 30 },
  { label: '40%', min: 30, max: 40 },
  { label: '50%', min: 40, max: 50 },
  { label: '60%', min: 50, max: 60 },
  { label: '70%', min: 60, max: 70 },
  { label: '80%', min: 70, max: 80 },
  { label: '90%', min: 80, max: 90 },
  { label: 'Bottom 10%', min: 90, max: 100 },
];

// Price ranges in absolute XCH (logarithmic scale)
// Empty ranges will be filtered out dynamically
const PRICE_BUCKETS = [
  { min: 0, max: 1, label: '0-1' },
  { min: 1, max: 2, label: '1-2' },
  { min: 2, max: 3, label: '2-3' },
  { min: 3, max: 4, label: '3-4' },
  { min: 4, max: 5, label: '4-5' },
  { min: 5, max: 7, label: '5-7' },
  { min: 7, max: 10, label: '7-10' },
  { min: 10, max: 15, label: '10-15' },
  { min: 15, max: 25, label: '15-25' },
  { min: 25, max: Infinity, label: '25+' },
];

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ rankData, onNftClick }) => {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [mode, setMode] = useState<HeatmapMode>('all');
  const [viewType, setViewType] = useState<ViewType>('heatmap');
  const [internalRankData, setInternalRankData] = useState<Record<string, number>>({});
  const [xchPriceUsd, setXchPriceUsd] = useState<number>(getCachedXchPrice());
  const [selectedBar, setSelectedBar] = useState<{ priceRange: string; listings: NFTListing[] } | null>(null);
  const [showBadges, setShowBadges] = useState(false);
  const [nftBadges, setNftBadges] = useState<Map<number, string[]>>(new Map());
  const [comboLegend, setComboLegend] = useState<{ emoji: string; name: string }[]>([]);

  // Load combo badges data
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const [combosRes, nftsRes] = await Promise.all([
          fetch('/assets/BigPulp/combos_badges.json'),
          fetch('/assets/BigPulp/combo_badges_nfts.json')
        ]);

        const combosData = await combosRes.json();
        const nftsData = await nftsRes.json();

        // Build combo id -> emoji map and legend
        const comboEmojis = new Map<string, string>();
        const legendItems: { emoji: string; name: string }[] = [];

        if (combosData.combos && Array.isArray(combosData.combos)) {
          for (const combo of combosData.combos) {
            comboEmojis.set(combo.id, combo.emoji);
            legendItems.push({ emoji: combo.emoji, name: combo.name });
          }
        }
        setComboLegend(legendItems);

        // Build NFT id -> emojis array map
        const badgeMap = new Map<number, string[]>();
        for (const [comboId, nftIds] of Object.entries(nftsData)) {
          const emoji = comboEmojis.get(comboId);
          if (emoji) {
            for (const nftId of nftIds as number[]) {
              const existing = badgeMap.get(nftId) || [];
              if (!existing.includes(emoji)) {
                existing.push(emoji);
              }
              badgeMap.set(nftId, existing);
            }
          }
        }

        setNftBadges(badgeMap);
      } catch (err) {
        console.error('Failed to load combo badges:', err);
      }
    };

    loadBadges();
  }, []);

  // Load listings and rank data
  useEffect(() => {
    const loadData = async () => {
      // Try cached data first for instant display
      const cached = getCachedListings();
      if (cached && cached.length > 0) {
        setListings(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        // Load rank data if not provided (from static file - fast)
        if (!rankData) {
          const analysisRes = await fetch('/assets/BigPulp/all_nft_analysis.json');
          const analysisData = await analysisRes.json();
          const ranks: Record<string, number> = {};
          for (const [id, data] of Object.entries(analysisData)) {
            ranks[id] = (data as any).rank;
          }
          setInternalRankData(ranks);
        }

        // Fetch fresh listings (will use cache if available)
        const result = await fetchAllListings();
        setListings(result.listings);

        // Fetch XCH price for USD conversion
        const price = await getXchPrice();
        setXchPriceUsd(price);
      } catch (err) {
        console.error('Heatmap load error:', err);
        // Only show error if we have no data at all
        if (listings.length === 0) {
          setError('Failed to load market data');
        }
      }

      setLoading(false);
    };

    loadData();
  }, [rankData]);

  const ranks = rankData || internalRankData;

  // Calculate floor price
  const floorPrice = useMemo(() => {
    return calculateFloorPrice(listings);
  }, [listings]);

  // Determine which price buckets have listings (for dynamic columns)
  const activePriceBuckets = useMemo(() => {
    return PRICE_BUCKETS.filter(bucket => {
      return listings.some(listing => {
        const price = listing.priceXch;
        return price >= bucket.min && (bucket.max === Infinity ? true : price < bucket.max);
      });
    });
  }, [listings]);

  // Build heatmap grid with only active price columns
  const heatmapGrid = useMemo(() => {
    if (listings.length === 0) return [];

    const grid: HeatmapCell[][] = [];

    for (const rarityRange of RARITY_RANGES) {
      const row: HeatmapCell[] = [];

      for (const priceBucket of activePriceBuckets) {
        const cellListings = listings.filter(listing => {
          const rank = ranks[listing.nftId];
          if (!rank) return false;

          const percentile = (rank / 4200) * 100;
          const price = listing.priceXch;

          const inRarityRange = percentile >= rarityRange.min && percentile < rarityRange.max;
          const inPriceRange = price >= priceBucket.min &&
            (priceBucket.max === Infinity ? true : price < priceBucket.max);

          return inRarityRange && inPriceRange;
        });

        row.push({
          rarityRange: rarityRange.label,
          priceRange: priceBucket.label,
          rarityMin: rarityRange.min,
          rarityMax: rarityRange.max,
          priceMin: priceBucket.min,
          priceMax: priceBucket.max,
          listings: cellListings,
          count: cellListings.length
        });
      }

      grid.push(row);
    }

    return grid;
  }, [listings, ranks, activePriceBuckets]);

  // Apply mode filtering (using absolute XCH prices and floor reference)
  const filteredGrid = useMemo(() => {
    if (mode === 'all') return heatmapGrid;

    // Calculate thresholds based on floor price
    const cheapThreshold = floorPrice * 2;      // < 2x floor = cheap
    const expensiveThreshold = floorPrice * 5;  // > 5x floor = expensive
    const nearFloorMax = floorPrice * 1.5;      // < 1.5x floor = near floor
    const reasonableMin = floorPrice * 1.5;
    const reasonableMax = floorPrice * 3;
    const premiumThreshold = floorPrice * 3;    // > 3x floor = premium

    return heatmapGrid.map(row =>
      row.map(cell => {
        let highlight = false;

        switch (mode) {
          case 'sleepy':
            // Rare (top 30%) + cheap (< 2x floor)
            highlight = cell.rarityMax <= 30 && cell.priceMax <= cheapThreshold;
            break;
          case 'delusion':
            // Any rarity + expensive (> 5x floor)
            highlight = cell.priceMin >= expensiveThreshold;
            break;
          case 'floor':
            // Any rarity + near floor (< 1.5x)
            highlight = cell.priceMax <= nearFloorMax;
            break;
          case 'rare':
            // Rare (top 20%) + reasonable (1.5-3x floor)
            highlight = cell.rarityMax <= 20 && cell.priceMin >= reasonableMin && cell.priceMax <= reasonableMax;
            break;
          case 'whale':
            // Very rare (top 10%) + premium (> 3x floor)
            highlight = cell.rarityMax <= 10 && cell.priceMin >= premiumThreshold;
            break;
        }

        return { ...cell, highlight };
      })
    );
  }, [heatmapGrid, mode, floorPrice]);

  // Get max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...heatmapGrid.flatMap(row => row.map(cell => cell.count)), 1);
  }, [heatmapGrid]);

  // Get badges for NFTs in a cell
  const getCellBadges = (cellListings: NFTListing[]): string[] => {
    const badges: string[] = [];
    for (const listing of cellListings) {
      const nftId = parseInt(listing.nftId);
      const nftEmojis = nftBadges.get(nftId);
      if (nftEmojis) {
        badges.push(...nftEmojis);
      }
    }
    return badges;
  };

  // Price distribution for bar chart (aggregates all rarity levels, only active buckets)
  const priceDistribution = useMemo(() => {
    if (listings.length === 0) return [];

    return activePriceBuckets.map(priceBucket => {
      const matchingListings = listings.filter(listing => {
        const price = listing.priceXch;
        return price >= priceBucket.min &&
          (priceBucket.max === Infinity ? true : price < priceBucket.max);
      });

      return {
        label: priceBucket.label,
        count: matchingListings.length,
        listings: matchingListings
      };
    });
  }, [listings, activePriceBuckets]);

  // Max count for bar chart scaling
  const maxBarCount = useMemo(() => {
    return Math.max(...priceDistribution.map(d => d.count), 1);
  }, [priceDistribution]);

  // Amber color scheme for heatmap intensity
  // Uses logarithmic scaling for better differentiation with outliers
  const getCellColor = (count: number, highlight?: boolean) => {
    if (count === 0) return 'transparent';

    // Logarithmic scaling for better visual differentiation
    const logCount = Math.log(count + 1);
    const logMax = Math.log(maxCount + 1);
    const intensity = Math.min(logCount / logMax, 1);

    // Amber color scale: from subtle (low count) to vivid (high count)
    const alpha = 0.15 + intensity * 0.75; // Range: 0.15 to 0.90

    const color = highlight
      ? `rgba(255, 200, 50, ${Math.min(alpha + 0.1, 1)})`  // Bright gold for highlights
      : `rgba(255, 149, 0, ${alpha})`;                     // Standard amber

    // Debug log (remove after testing)
    if (count > 0) console.log(`[Heatmap] count=${count}, color=${color}`);

    return color;
  };

  // Preload images for all listings so they show instantly when clicking cells
  useEffect(() => {
    if (listings.length > 0) {
      // Use requestIdleCallback to preload images without blocking UI
      const preloadImages = () => {
        listings.forEach(listing => {
          const img = new Image();
          img.src = getNftImageUrl(listing.nftId);
        });
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preloadImages);
      } else {
        setTimeout(preloadImages, 100);
      }
    }
  }, [listings]);

  if (loading && listings.length === 0) {
    return (
      <div className="heatmap-loading">
        <LoadingSpinner />
        <p>Fetching live listings...</p>
        <p className="loading-hint">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="heatmap-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="market-heatmap">
      <div className="heatmap-card">
        {/* Stats Bar */}
        <div className="heatmap-stats">
          <div className="stat">
            <span className="stat-label">Listed</span>
            <span className="stat-value">{listings.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Floor</span>
            <span className="stat-value">{floorPrice.toFixed(2)} XCH</span>
          </div>
        </div>

        {/* View Type Toggle */}
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewType === 'heatmap' ? 'active' : ''}`}
            onClick={() => setViewType('heatmap')}
          >
            Heat Map
          </button>
          <button
            className={`view-toggle-btn ${viewType === 'distribution' ? 'active' : ''}`}
            onClick={() => setViewType('distribution')}
          >
            Price Distribution
          </button>
        </div>

        {/* Mode Selector - only show for heatmap */}
        {viewType === 'heatmap' && <div className="heatmap-modes">
          {HEATMAP_MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
          <div className="combo-btn-wrapper">
            <button
              className={`mode-btn badge-toggle ${showBadges ? 'active' : ''}`}
              onClick={() => setShowBadges(!showBadges)}
            >
              🏆 Combos
            </button>
            <div className="combo-legend">
              <div className="combo-legend-title">Combo Badges</div>
              <div className="combo-legend-list">
                {comboLegend.length > 0 ? (
                  comboLegend.map((item, idx) => (
                    <div key={idx} className="combo-legend-item">
                      <span className="combo-legend-emoji">{item.emoji}</span>
                      <span className="combo-legend-name">{item.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="combo-legend-item">
                    <span className="combo-legend-name">Loading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>}

        {/* Heatmap View */}
        {viewType === 'heatmap' && (
          <>
            <div className="heatmap-container">
              {/* Price headers - only show active (non-empty) columns */}
              <div className="heatmap-header">
                <div className="header-spacer" />
                {activePriceBuckets.map(bucket => (
                  <div key={bucket.label} className="header-cell">
                    {bucket.label}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {filteredGrid.map((row, rowIdx) => (
                <div key={rowIdx} className="heatmap-row">
                  <div className="row-label">
                    {RARITY_RANGES[rowIdx].label}
                  </div>
                  {row.map((cell, colIdx) => {
                    const cellBadges = showBadges ? getCellBadges(cell.listings) : [];
                    return (
                      <div
                        key={colIdx}
                        className={`heatmap-cell ${cell.count > 0 ? 'clickable' : ''} ${(cell as any).highlight ? 'highlighted' : ''} ${cellBadges.length > 0 ? 'has-badges' : ''}`}
                        style={{ backgroundColor: getCellColor(cell.count, (cell as any).highlight) }}
                        onClick={() => cell.count > 0 && setSelectedCell(cell)}
                      >
                        {cell.count > 0 && (
                          <>
                            {showBadges && cellBadges.length > 0 ? (
                              <span className="cell-badges">
                                {cellBadges.slice(0, 4).map((emoji, i) => (
                                  <span key={i} className="badge-emoji">{emoji}</span>
                                ))}
                                {cellBadges.length > 4 && <span className="badge-overflow">+{cellBadges.length - 4}</span>}
                              </span>
                            ) : (
                              <span>{cell.count}</span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Axis labels */}
              <div className="heatmap-axis-labels">
                <span className="axis-label-left">Rarity ↓</span>
                <span className="axis-label-right">Price (XCH) →</span>
              </div>
            </div>

            {/* Legend */}
            <div className="heatmap-legend">
              <span className="legend-label">Density:</span>
              <div className="legend-scale">
                <div className="legend-item low" />
                <div className="legend-item mid" />
                <div className="legend-item high" />
              </div>
              <span className="legend-labels">
                <span>Low</span>
                <span>High</span>
              </span>
            </div>
          </>
        )}

        {/* Price Distribution View (Bar Chart) */}
        {viewType === 'distribution' && (
          <div className="distribution-container">
            <div className="distribution-chart">
              {priceDistribution.map((bar, idx) => {
                const heightPercent = maxBarCount > 0 ? (bar.count / maxBarCount) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className={`distribution-bar-wrapper ${bar.count > 0 ? 'clickable' : ''}`}
                    onClick={() => bar.count > 0 && setSelectedBar({ priceRange: bar.label, listings: bar.listings })}
                  >
                    <div className="bar-count">{bar.count > 0 ? bar.count : ''}</div>
                    <div
                      className="distribution-bar"
                      style={{ height: `${Math.max(heightPercent, bar.count > 0 ? 5 : 0)}%` }}
                    />
                    <div className="bar-label">{bar.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="distribution-axis">
              <span>Floor</span>
              <span>→</span>
              <span>10x+ Floor</span>
            </div>
          </div>
        )}
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">
                {selectedCell?.count} NFT{selectedCell?.count !== 1 ? 's' : ''}
              </h2>
              <button className="btn btn-ghost" onClick={() => setSelectedCell(null)}>
                Close
              </button>
            </header>
            <div className="modal-body">
              <div className="cell-detail-header">
                <span>Rarity: {selectedCell?.rarityRange}</span>
                <span>Price: {selectedCell?.priceRange}</span>
              </div>
              <div className="nft-list">
                {selectedCell?.listings
                  .sort((a, b) => a.priceXch - b.priceXch)
                  .map(listing => (
                    <div
                      key={listing.nftId}
                      className="nft-item"
                      onClick={() => {
                        onNftClick?.(listing.nftId);
                        setSelectedCell(null);
                      }}
                    >
                      <div className="nft-thumbnail">
                        <img src={getNftImageUrl(listing.nftId)} alt={`Wojak #${listing.nftId}`} />
                      </div>
                      <div className="nft-info">
                        <h3>Wojak #{listing.nftId}</h3>
                        <p className="nft-rank">
                          Rank {ranks[listing.nftId] || '?'}
                          {nftBadges.get(parseInt(listing.nftId))?.length ? (
                            <span className="nft-badges"> {nftBadges.get(parseInt(listing.nftId))?.join('')}</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="price-label">
                        <span className="price-xch">{listing.priceXch.toFixed(2)} XCH</span>
                        <span className="price-usd">${(listing.priceXch * xchPriceUsd).toFixed(2)}</span>
                        <span className="price-multiple">
                          {(listing.priceXch / floorPrice).toFixed(1)}x floor
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bar Detail Modal (for Price Distribution) */}
      {selectedBar && (
        <div className="modal-overlay" onClick={() => setSelectedBar(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="modal-title">
                {selectedBar?.listings.length} NFT{selectedBar?.listings.length !== 1 ? 's' : ''} at {selectedBar?.priceRange}
              </h2>
              <button className="btn btn-ghost" onClick={() => setSelectedBar(null)}>
                Close
              </button>
            </header>
            <div className="modal-body">
              <div className="nft-list">
                {selectedBar?.listings
                  .sort((a, b) => a.priceXch - b.priceXch)
                  .map(listing => (
                    <div
                      key={listing.nftId}
                      className="nft-item"
                      onClick={() => {
                        onNftClick?.(listing.nftId);
                        setSelectedBar(null);
                      }}
                    >
                      <div className="nft-thumbnail">
                        <img src={getNftImageUrl(listing.nftId)} alt={`Wojak #${listing.nftId}`} />
                      </div>
                      <div className="nft-info">
                        <h3>Wojak #{listing.nftId}</h3>
                        <p className="nft-rank">
                          Rank {ranks[listing.nftId] || '?'}
                          {nftBadges.get(parseInt(listing.nftId))?.length ? (
                            <span className="nft-badges"> {nftBadges.get(parseInt(listing.nftId))?.join('')}</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="price-label">
                        <span className="price-xch">{listing.priceXch.toFixed(2)} XCH</span>
                        <span className="price-usd">${(listing.priceXch * xchPriceUsd).toFixed(2)}</span>
                        <span className="price-multiple">
                          {(listing.priceXch / floorPrice).toFixed(1)}x floor
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketHeatmap;
