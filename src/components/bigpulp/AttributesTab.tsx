/**
 * AttributesTab Component
 *
 * Mobile-first card-based attributes browser with search and filters.
 * Premium design with expandable cards showing sales data.
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react';
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

// Column definitions for the table header
const TABLE_COLUMNS: { field: AttributeSortField; label: string; color: string }[] = [
  { field: 'avgPrice', label: 'Avg', color: 'var(--color-brand-primary)' },
  { field: 'minPrice', label: 'Min', color: 'rgba(34,197,94,0.9)' },
  { field: 'maxPrice', label: 'Max', color: 'rgba(251,191,36,0.9)' },
  { field: 'totalSales', label: 'Sales', color: 'var(--color-text-secondary)' },
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

// Sort indicator arrow — always reserves space to prevent layout shift
function SortArrow({ field, sortState }: { field: AttributeSortField; sortState: AttributeSortState }) {
  const isActive = sortState.field === field;
  const Icon = isActive && sortState.direction === 'asc' ? ChevronUp : ChevronDown;
  return (
    <Icon
      size={12}
      className="inline ml-0.5"
      style={{ visibility: isActive ? 'visible' : 'hidden' }}
    />
  );
}

// Table header with sortable columns
function TableHeader({
  sortState,
  onSort,
}: {
  sortState: AttributeSortState;
  onSort: (field: AttributeSortField) => void;
}) {
  return (
    <div
      className="flex items-center px-3 py-2.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Category column header — fixed width, clickable to sort */}
      <button
        type="button"
        className="w-[88px] flex-shrink-0 pr-2 text-left text-[13px] font-semibold uppercase tracking-wider outline-none"
        style={{
          color: sortState.field === 'category' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        }}
        onClick={() => onSort('category')}
      >
        Type
        <SortArrow field="category" sortState={sortState} />
      </button>

      {/* Attribute name column */}
      <button
        type="button"
        className="flex-1 text-left text-[13px] font-semibold uppercase tracking-wider outline-none"
        style={{
          color: sortState.field === 'value' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        }}
        onClick={() => onSort('value')}
      >
        Attribute
        <SortArrow field="value" sortState={sortState} />
      </button>

      {/* Numeric columns — grouped right, compact */}
      <div className="flex items-center gap-0">
        {TABLE_COLUMNS.map((col) => (
          <button
            key={col.field}
            type="button"
            className="w-[72px] text-right text-[13px] font-semibold uppercase tracking-wider outline-none"
            style={{
              color: sortState.field === col.field ? col.color : 'var(--color-text-muted)',
            }}
            onClick={() => onSort(col.field)}
          >
            {col.label}
            <SortArrow field={col.field} sortState={sortState} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Single attribute row
function AttributeRow({
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
      className="rounded-lg overflow-hidden"
      style={{
        background: isExpanded
          ? `linear-gradient(135deg, ${categoryColor.cardBg} 0%, rgba(255,255,255,0.01) 100%)`
          : 'transparent',
        border: isExpanded
          ? `1px solid ${categoryColor.border}`
          : '1px solid rgba(255,255,255,0.04)',
      }}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      {/* Row — category | attribute name | 4 numbers, all one line */}
      <button
        type="button"
        className="w-full flex items-center px-3 py-3 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {/* Category badge — fixed width column with right margin */}
        <span
          className="w-[88px] flex-shrink-0 pr-2"
        >
          <span
            className="text-[11px] px-1.5 py-0.5 rounded font-medium inline-block"
            style={{
              background: categoryColor.bg,
              color: categoryColor.text,
              border: `1px solid ${categoryColor.border}`,
            }}
          >
            {attribute.category}
          </span>
        </span>

        {/* Attribute name — flex column */}
        <span
          className="flex-1 text-[15px] font-medium truncate min-w-0"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {attribute.value}
        </span>

        {/* Numeric values — right-aligned, matching header widths */}
        <div className="flex items-center gap-0 flex-shrink-0">
          <span
            className="w-[72px] text-right text-sm font-mono font-bold"
            style={{ color: hasSales ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
          >
            {hasSales ? attribute.avgPrice.toFixed(2) : '-'}
          </span>
          <span
            className="w-[72px] text-right text-sm font-mono"
            style={{ color: hasSales ? 'rgba(34,197,94,0.9)' : 'var(--color-text-muted)' }}
          >
            {hasSales ? attribute.minPrice.toFixed(2) : '-'}
          </span>
          <span
            className="w-[72px] text-right text-sm font-mono"
            style={{ color: hasSales ? 'rgba(251,191,36,0.9)' : 'var(--color-text-muted)' }}
          >
            {hasSales ? attribute.maxPrice.toFixed(2) : '-'}
          </span>
          <span
            className="w-[72px] text-right text-sm font-mono"
            style={{ color: hasSales ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}
          >
            {hasSales ? attribute.totalSales : '-'}
          </span>
        </div>
      </button>

      {/* Expanded detail (rarity + recent sales) */}
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
              <div className="flex items-center gap-2 mb-3">
                <Tag size={12} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {attribute.count} NFTs have this trait ({attribute.rarity.toFixed(1)}% rarity)
                  {hasSales && attribute.lastSaleDate && (
                    <> &middot; Last sale {formatRelativeTime(attribute.lastSaleDate)}</>
                  )}
                </span>
              </div>

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

// Loading skeleton
function RowSkeleton() {
  return (
    <div className="flex items-center px-3 py-3 animate-pulse">
      <div className="w-[88px] flex-shrink-0 pr-2">
        <div className="h-5 w-16 rounded" style={{ background: 'var(--color-border)' }} />
      </div>
      <div className="flex-1">
        <div className="h-5 w-24 rounded" style={{ background: 'var(--color-border)' }} />
      </div>
      <div className="flex items-center gap-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[72px] flex justify-end">
            <div className="h-5 w-12 rounded" style={{ background: 'var(--color-border)' }} />
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [sortState, setSortState] = useState<AttributeSortState>({
    field: 'avgPrice',
    direction: 'desc',
  });
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Compute attribute values for the selected category (for the attribute dropdown)
  const attributeValues = useMemo(() => {
    if (!selectedCategory) return [];
    const values = attributes
      .filter((a) => a.category === selectedCategory)
      .map((a) => a.value)
      .sort((a, b) => a.localeCompare(b));
    return [...new Set(values)];
  }, [attributes, selectedCategory]);

  // Filter and sort attributes
  const filteredAttributes = useMemo(() => {
    let result = [...attributes];

    // Filter by category
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Filter by specific attribute
    if (selectedAttribute) {
      result = result.filter((a) => a.value === selectedAttribute);
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
  }, [attributes, selectedCategory, selectedAttribute, sortState]);

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
      <div className="space-y-0 p-3">
        <div className="flex gap-2 mb-3">
          <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <RowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-3"
      variants={prefersReducedMotion ? undefined : tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Filter dropdowns */}
      <div className="flex items-center gap-2 mb-3">
        {/* Category dropdown */}
        <select
          value={selectedCategory || ''}
          onChange={(e) => {
            const val = e.target.value || null;
            setSelectedCategory(val);
            setSelectedAttribute(null);
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs appearance-none min-w-0"
          style={{
            background: selectedCategory
              ? getCategoryColor(selectedCategory).bg
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${selectedCategory
              ? getCategoryColor(selectedCategory).border
              : 'rgba(255,255,255,0.08)'}`,
            color: selectedCategory
              ? getCategoryColor(selectedCategory).text
              : 'var(--color-text-secondary)',
          }}
        >
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Attribute dropdown */}
        <select
          value={selectedAttribute || ''}
          onChange={(e) => setSelectedAttribute(e.target.value || null)}
          disabled={!selectedCategory}
          className="px-2.5 py-1.5 rounded-lg text-xs appearance-none min-w-0"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: !selectedCategory ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
            opacity: !selectedCategory ? 0.5 : 1,
          }}
        >
          <option value="">{selectedCategory ? 'All Attributes' : 'Select category first'}</option>
          {attributeValues.map((val) => (
            <option key={val} value={val}>{val}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Sortable column headers */}
        <TableHeader sortState={sortState} onSort={handleSortChange} />

        {/* Rows */}
        <div>
          {filteredAttributes.map((attr, index) => {
            const key = `${attr.category}-${attr.value}`;
            return (
              <AttributeRow
                key={key}
                attribute={attr}
                isExpanded={expandedCard === key}
                onToggle={() => handleCardToggle(key)}
                index={index}
              />
            );
          })}
        </div>
      </div>

      {filteredAttributes.length === 0 && (
        <div
          className="p-8 text-center rounded-xl mt-3"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted)',
          }}
        >
          No attributes found matching your filters
        </div>
      )}
    </motion.div>
  );
}

export default AttributesTab;
