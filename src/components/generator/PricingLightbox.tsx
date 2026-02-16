/**
 * Pricing Lightbox
 *
 * Shows trait pricing for all categories — usage counts, surcharges,
 * and premium indicators. Opened from the ActionBar overflow menu.
 *
 * Data comes from /api/mint/pricing (same endpoint MintContext uses).
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Lightbox } from '@/components/ui/Lightbox';

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
const CATEGORY_ORDER = ['Head', 'Clothes', 'Face Wear'];

export function PricingLightbox({ isOpen, onClose }: PricingLightboxProps) {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch('/api/mint/pricing')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load pricing');
        return res.json();
      })
      .then((d) => setData(d as PricingData))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Group traits by category
  const grouped: Record<string, { name: string; pricing: TraitPricing }[]> = {};
  if (data?.traits) {
    for (const [key, pricing] of Object.entries(data.traits)) {
      const sep = key.indexOf('_');
      if (sep < 0) continue;
      const category = key.slice(0, sep);
      const name = key.slice(sep + 1);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ name, pricing });
    }
    // Sort each category by surcharge descending, then by name
    for (const items of Object.values(grouped)) {
      items.sort((a, b) => b.pricing.surchargeXch - a.pricing.surchargeXch || a.name.localeCompare(b.name));
    }
  }

  // Order categories: surcharge categories first, then the rest
  const sortedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
  ];

  return (
    <Lightbox isOpen={isOpen} onClose={onClose} size="gallery">
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Trait Prices</h2>
            <p className="text-xs text-muted mt-0.5">
              Base price: {BASE_PRICE} XCH. Popular traits add a surcharge.
            </p>
          </div>
          {data?.supply && (
            <span className="text-xs tabular-nums text-muted">
              {data.supply.minted}/{data.supply.total} minted
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 flex-1">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        )}

        {error && (
          <p className="text-center text-secondary py-8">{error}</p>
        )}

        {!loading && !error && data && (
          <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4">
            {sortedCategories.map((category) => {
              const items = grouped[category];
              if (!items || items.length === 0) return null;
              const isSurchargeCategory = CATEGORY_ORDER.includes(category);

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-cyan)' }}>
                      {category}
                    </span>
                    {!isSurchargeCategory && (
                      <span className="text-[10px] text-muted">no surcharge</span>
                    )}
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[var(--color-border)]" style={{ background: 'var(--color-surface)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <th className="text-left py-2 px-3 text-muted font-medium">Trait</th>
                          <th className="text-right py-2 px-3 text-muted font-medium">Minted</th>
                          {isSurchargeCategory && (
                            <>
                              <th className="text-right py-2 px-3 text-muted font-medium">Surcharge</th>
                              <th className="text-right py-2 px-3 text-muted font-medium">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(({ name, pricing }) => {
                          const hasSurcharge = isSurchargeCategory && pricing.surchargeXch > 0;
                          const isTop3 = isSurchargeCategory && (data?.top3?.[category] || []).includes(name);
                          return (
                            <tr key={name} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                              <td className="py-2 px-3">
                                <span style={{ color: 'var(--color-text)' }}>{name}</span>
                                {isTop3 && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--color-primary)' }}>
                                    Top 3
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-secondary">
                                {pricing.usageCount}
                              </td>
                              {isSurchargeCategory && (
                                <>
                                  <td className="py-2 px-3 text-right tabular-nums" style={{ color: hasSurcharge ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                    {hasSurcharge ? `+${pricing.surchargeXch.toFixed(2)}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right tabular-nums font-semibold" style={{ color: hasSurcharge ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                                    {(BASE_PRICE + pricing.surchargeXch).toFixed(2)} XCH
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <p className="text-muted text-xs px-1 pb-2">
              Surcharges apply to Head, Clothes, and Face Wear. Only the highest surcharge among your selected traits is charged. Top 3 traits in each category cannot be used with free mint credits. Prices decrease over time as demand fades.
            </p>
          </div>
        )}
      </div>
    </Lightbox>
  );
}

export default PricingLightbox;
