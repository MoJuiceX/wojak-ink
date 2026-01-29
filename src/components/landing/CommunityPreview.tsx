/**
 * Community/Treasury Preview
 *
 * Shows real-time collection stats using the same service as BigPulp
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchCollectionStats } from '@/services/tradeValuesService';

// Fallback values if API completely fails
const FALLBACK_STATS = {
  tradeCount: 753,
  marketCap: 20369,
  volume: 527,
  floorPrice: 4.85,
  xchPrice: 0,
};

interface DisplayStats {
  tradeCount: number;
  marketCap: number;
  volume: number;
  floorPrice: number;
  xchPrice: number;
  isLoading: boolean;
}

export const CommunityPreview: React.FC = () => {
  const [stats, setStats] = useState<DisplayStats>({
    ...FALLBACK_STATS,
    isLoading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Use the same service as BigPulp
        const data = await fetchCollectionStats();

        // Try to fetch XCH price
        let xchPrice = 0;
        try {
          const isDev = import.meta.env.DEV;
          const priceUrl = isDev
            ? '/coingecko-api/api/v3/simple/price?ids=chia&vs_currencies=usd'
            : '/api/coingecko/api/v3/simple/price?ids=chia&vs_currencies=usd';
          const priceRes = await fetch(priceUrl);
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            xchPrice = priceData?.chia?.usd || 0;
          }
        } catch {
          // Ignore price fetch errors
        }

        setStats({
          tradeCount: data.trade_count || FALLBACK_STATS.tradeCount,
          marketCap: data.market_cap_xch || FALLBACK_STATS.marketCap,
          volume: data.volume_xch || FALLBACK_STATS.volume,
          floorPrice: data.floor_xch || FALLBACK_STATS.floorPrice,
          xchPrice,
          isLoading: false,
        });
      } catch {
        // Use fallback values
        setStats({
          ...FALLBACK_STATS,
          isLoading: false,
        });
      }
    };

    loadStats();

    // Refresh every 2 minutes
    const interval = setInterval(loadStats, 120000);
    return () => clearInterval(interval);
  }, []);

  const formatXCH = (num: number) => {
    // Round to whole numbers only
    const rounded = Math.round(num);
    return rounded.toLocaleString();
  };

  const formatUSD = (xch: number, xchPrice: number) => {
    const usd = xch * xchPrice;
    if (usd >= 1000000) {
      return '$' + (usd / 1000000).toFixed(1) + 'M';
    }
    if (usd >= 1000) {
      return '$' + Math.round(usd / 1000) + 'K';
    }
    return '$' + Math.round(usd);
  };

  return (
    <div className="community-preview">
      <div className="community-stats-row">
        {/* Total Trades */}
        <motion.div
          className="treasury-stat"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
        >
          <span className="treasury-stat-value">
            {stats.isLoading ? '...' : stats.tradeCount.toLocaleString()}
          </span>
          <span className="treasury-stat-label">Total Trades</span>
        </motion.div>

        {/* Market Cap */}
        <motion.div
          className="treasury-stat featured"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <span className="treasury-stat-value">
            {stats.isLoading ? '...' : formatXCH(stats.marketCap)} XCH
          </span>
          {stats.xchPrice > 0 && !stats.isLoading && (
            <span className="treasury-stat-usd">{formatUSD(stats.marketCap, stats.xchPrice)}</span>
          )}
          <span className="treasury-stat-label">Market Cap</span>
        </motion.div>

        {/* Volume */}
        <motion.div
          className="treasury-stat"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <span className="treasury-stat-value">
            {stats.isLoading ? '...' : formatXCH(stats.volume)} XCH
          </span>
          {stats.xchPrice > 0 && !stats.isLoading && (
            <span className="treasury-stat-usd">{formatUSD(stats.volume, stats.xchPrice)}</span>
          )}
          <span className="treasury-stat-label">Total Volume</span>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityPreview;
