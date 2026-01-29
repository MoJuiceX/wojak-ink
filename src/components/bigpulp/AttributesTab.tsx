/**
 * AttributesTab Component
 *
 * Mobile-first card-based attributes browser with search and filters.
 * Premium design with expandable cards showing sales data.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, ChevronDown, TrendingUp, Clock, Tag } from 'lucide-react';
import type {
  AttributeStats,
  AttributeSortField,
  AttributeSortState,
} from '@/types/bigpulp';
import { tabContentVariants } from '@/config/bigpulpAnimations';

interface AttributesTabProps {
  attributes: AttributeStats[];
  categories?: string[];
  onAttributeClick?: (attribute: AttributeStats) => void;
  isLoading?: boolean;
}

// Sort options for mobile
const SORT_OPTIONS: { field: AttributeSortField; label: string }[] = [
  { field: 'avgPrice', label: 'Avg Price' },
  { field: 'totalSales', label: 'Most Sales' },
  { field: 'lastSaleDate', label: 'Recent' },
  { field: 'value', label: 'A-Z' },
];

// Category color mapping for visual identification
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; cardBg: string }> = {
  'Background': {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: 'rgb(96, 165, 250)',
    cardBg: 'rgba(59, 130, 246, 0.04)',
  },
  'Head': {
    bg: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.3)',
    text: 'rgb(192, 132, 252)',
    cardBg: 'rgba(168, 85, 247, 0.04)',
  },
  'Clothes': {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: 'rgb(74, 222, 128)',
    cardBg: 'rgba(34, 197, 94, 0.04)',
  },
  'Face Wear': {
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.3)',
    text: 'rgb(251, 191, 36)',
    cardBg: 'rgba(251, 191, 36, 0.04)',
  },
  'Mouth': {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: 'rgb(248, 113, 113)',
    cardBg: 'rgba(239, 68, 68, 0.04)',
  },
  'Base': {
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.3)',
    text: 'rgb(244, 114, 182)',
    cardBg: 'rgba(236, 72, 153, 0.04)',
  },
  'Eyes': {
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.3)',
    text: 'rgb(34, 211, 238)',
    cardBg: 'rgba(6, 182, 212, 0.04)',
  },
};

// Default color for unknown categories
const DEFAULT_CATEGORY_COLOR = {
  bg: 'rgba(251, 146, 60, 0.15)',
  border: 'rgba(251, 146, 60, 0.3)',
  text: 'var(--color-brand-primary)',
  cardBg: 'rgba(251, 146, 60, 0.04)',
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// XCH to USD conversion rate
const XCH_USD_RATE = 5.25;

// Format relative time for last sale
function formatRelativeTime(date: Date | undefined): string {
  if (!date) return '-';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years}y ago`;
}

// Premium Attribute Card for mobile
function AttributeCard({
  attribute,
  isExpanded,
  onToggle,
  index,
}: {
  attribute: AttributeStats;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const hasSales = attribute.totalSales > 0;
  const categoryColor = getCategoryColor(attribute.category);

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{
        background: isExpanded 
          ? `linear-gradient(135deg, ${categoryColor.cardBg} 0%, rgba(255,255,255,0.01) 100%)`
          : `linear-gradient(135deg, ${categoryColor.cardBg} 0%, rgba(255,255,255,0.02) 100%)`,
        border: isExpanded 
          ? `1px solid ${categoryColor.border}` 
          : `1px solid rgba(255,255,255,0.08)`,
        boxShadow: isExpanded 
          ? `0 4px 20px ${categoryColor.bg}` 
          : '0 2px 8px rgba(0,0,0,0.2)',
      }}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Card Header - Always visible */}
      <button
        type="button"
        className="w-full p-3 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {/* Top row: Category badge + Attribute name + Expand icon */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{
                background: categoryColor.bg,
                color: categoryColor.text,
                border: `1px solid ${categoryColor.border}`,
              }}
            >
              {attribute.category}
            </span>
            <span
              className="font-semibold text-sm truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {attribute.value}
            </span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
          </motion.div>
        </div>

        {/* Stats row - compact grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Avg Price */}
          <div className="text-center">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Avg</p>
            <p
              className="text-sm font-bold font-mono"
              style={{ color: hasSales ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
            >
              {hasSales ? attribute.avgPrice.toFixed(2) : '-'}
            </p>
            {hasSales && (
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                ${(attribute.avgPrice * XCH_USD_RATE).toFixed(0)}
              </p>
            )}
          </div>

          {/* Min */}
          <div className="text-center">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Min</p>
            <p
              className="text-sm font-semibold font-mono"
              style={{ color: hasSales ? 'rgba(34,197,94,0.9)' : 'var(--color-text-muted)' }}
            >
              {hasSales ? attribute.minPrice.toFixed(2) : '-'}
            </p>
          </div>

          {/* Max */}
          <div className="text-center">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Max</p>
            <p
              className="text-sm font-semibold font-mono"
              style={{ color: hasSales ? 'rgba(251,191,36,0.9)' : 'var(--color-text-muted)' }}
            >
              {hasSales ? attribute.maxPrice.toFixed(2) : '-'}
            </p>
          </div>

          {/* Sales/Time */}
          <div className="text-center">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Sales</p>
            <p
              className="text-sm font-semibold"
              style={{ color: hasSales ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
            >
              {hasSales ? attribute.totalSales : '-'}
            </p>
            {hasSales && attribute.lastSaleDate && (
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                {formatRelativeTime(attribute.lastSaleDate)}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-3 pb-3 pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Rarity info */}
              <div className="flex items-center gap-2 mb-3">
                <Tag size={12} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {attribute.count} NFTs have this trait ({attribute.rarity.toFixed(1)}% rarity)
                </span>
              </div>

              {/* Recent sales thumbnails */}
              {attribute.recentSales && attribute.recentSales.length > 0 ? (
                <div>
                  <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={10} /> Recent Sales
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {attribute.recentSales.slice(0, 6).map((sale, idx) => (
                      <div
                        key={`${sale.nftId}-${idx}`}
                        className="flex-shrink-0 w-16 rounded-lg overflow-hidden"
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <img
                          src={sale.nftImage}
                          alt={`#${sale.nftId}`}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                        <div className="p-1 text-center">
                          <p className="text-[10px] font-mono" style={{ color: 'var(--color-brand-primary)' }}>
                            {sale.price.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
                  No sales recorded
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Loading skeleton for cards
function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-3 animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-16 rounded" style={{ background: 'var(--color-border)' }} />
        <div className="h-4 w-24 rounded" style={{ background: 'var(--color-border)' }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="h-3 w-8 rounded mx-auto mb-1" style={{ background: 'var(--color-border)' }} />
            <div className="h-5 w-10 rounded mx-auto" style={{ background: 'var(--color-border)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttributesTab({
  attributes,
  isLoading = false,
}: AttributesTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortState, setSortState] = useState<AttributeSortState>({
    field: 'avgPrice',
    direction: 'desc',
  });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Note: uniqueCategories removed - using CATEGORY_COLORS for legend instead

  // Filter and sort attributes
  const filteredAttributes = useMemo(() => {
    let result = [...attributes];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.value.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortState.field) {
        case 'value':
          comparison = a.value.localeCompare(b.value);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'rarity':
          comparison = a.rarity - b.rarity;
          break;
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'totalSales':
          comparison = a.totalSales - b.totalSales;
          break;
        case 'avgPrice':
          comparison = a.avgPrice - b.avgPrice;
          break;
        case 'minPrice':
          comparison = a.minPrice - b.minPrice;
          break;
        case 'maxPrice':
          comparison = a.maxPrice - b.maxPrice;
          break;
        case 'lastSaleDate': {
          const aTime = a.lastSaleDate?.getTime() || 0;
          const bTime = b.lastSaleDate?.getTime() || 0;
          comparison = aTime - bTime;
          break;
        }
        default:
          comparison = 0;
      }
      return sortState.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [attributes, searchQuery, selectedCategory, sortState]);

  const handleSortChange = useCallback((field: AttributeSortField) => {
    setSortState((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleCardToggle = useCallback((key: string) => {
    setExpandedCard((prev) => (prev === key ? null : key));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 p-3">
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="w-24 h-10 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-3 p-3"
      variants={prefersReducedMotion ? undefined : tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Category Legend - scrollable chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {Object.entries(CATEGORY_COLORS).map(([category, colors]) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
            className="flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: selectedCategory === category ? colors.bg : 'transparent',
              border: `1px solid ${selectedCategory === category ? colors.border : 'rgba(255,255,255,0.08)'}`,
              color: selectedCategory === category ? colors.text : 'var(--color-text-muted)',
              boxShadow: selectedCategory === category ? `0 2px 8px ${colors.bg}` : 'none',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ background: colors.text }}
            />
            {category}
          </button>
        ))}
      </div>

      {/* Search bar - full width, premium styled */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          placeholder="Search attributes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        />
      </div>

      {/* Sort dropdown + active filter indicator */}
      <div className="flex items-center gap-2">
        {/* Active filter indicator */}
        {selectedCategory && (
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
            style={{
              background: getCategoryColor(selectedCategory).bg,
              border: `1px solid ${getCategoryColor(selectedCategory).border}`,
              color: getCategoryColor(selectedCategory).text,
            }}
          >
            <span>{selectedCategory}</span>
            <span className="ml-1">×</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortState.field}
            onChange={(e) => handleSortChange(e.target.value as AttributeSortField)}
            className="px-3 py-1.5 rounded-lg text-xs appearance-none pr-7"
            style={{
              background: 'rgba(251,146,60,0.1)',
              border: '1px solid rgba(251,146,60,0.2)',
              color: 'var(--color-brand-primary)',
            }}
          >
            {SORT_OPTIONS.map(({ field, label }) => (
              <option key={field} value={field}>{label}</option>
            ))}
          </select>
          <TrendingUp 
            size={10} 
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-brand-primary)' }}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
        {filteredAttributes.length} attributes found
      </p>

      {/* Card list */}
      <div className="space-y-2">
        {filteredAttributes.map((attr, index) => {
          const key = `${attr.category}-${attr.value}`;
          return (
            <AttributeCard
              key={key}
              attribute={attr}
              isExpanded={expandedCard === key}
              onToggle={() => handleCardToggle(key)}
              index={index}
            />
          );
        })}
      </div>

      {filteredAttributes.length === 0 && (
        <div
          className="p-8 text-center rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted)',
          }}
        >
          No attributes found matching your search
        </div>
      )}
    </motion.div>
  );
}

export default AttributesTab;
