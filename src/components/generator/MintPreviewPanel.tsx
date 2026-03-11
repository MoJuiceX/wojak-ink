/**
 * Mint Preview Panel
 *
 * Compact NFT confirmation card:
 * - Preview image
 * - Headline: mint number + total price
 * - Unified details card: collapsible traits + price breakdown
 *
 * Displayed in the confirming step of MintFlowModal.
 */

import { useState, memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MetadataAttribute } from './MetadataPreview';
import type { TotalMintPrice } from '@/contexts/MintContext';

interface MintPreviewPanelProps {
  /** Object URL of the preview image */
  imageUrl?: string;
  /** Metadata attributes (7 Phase 1 traits) */
  attributes: MetadataAttribute[];
  /** Price breakdown */
  price: TotalMintPrice;
  /** Whether this is a free (credits) or paid mint */
  isFree: boolean;
  /** Credit cost (for free mints) */
  creditCost?: number;
  /** Current supply */
  totalMinted: number;
  /** Max supply */
  maxSupply: number;
}

export const MintPreviewPanel = memo(function MintPreviewPanel({
  imageUrl,
  attributes,
  price,
  isFree,
  creditCost,
  totalMinted,
  maxSupply: _maxSupply,
}: MintPreviewPanelProps) {
  const [traitsExpanded, setTraitsExpanded] = useState(false);

  const mintNumber = totalMinted + 1;

  return (
    <div className="mint-preview-panel flex flex-col gap-2 w-full">
      {/* Preview image — centered, 100px */}
      {imageUrl && (
        <div className="flex justify-center">
          <div
            className="mint-preview-image rounded-xl overflow-hidden"
            style={{
              width: 140,
              height: 140,
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              boxShadow: '0 0 24px rgba(255, 107, 0, 0.08), 0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img
              src={imageUrl}
              alt="Wojak preview"
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}

      {/* Headline: mint number + total price on one line */}
      <div className="text-center">
        <p className="text-sm font-medium">
          <span className="text-secondary">Wojak #{mintNumber}</span>
          <span className="text-muted mx-1.5">·</span>
          <span className="text-accent font-semibold">
            {isFree
              ? `${creditCost} credits`
              : `${price.totalXch.toFixed(3)} XCH`}
          </span>
        </p>
      </div>

      {/* Unified details card: traits (collapsible) + price breakdown */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        {/* Traits — collapsible */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-secondary"
          onClick={() => setTraitsExpanded(!traitsExpanded)}
          aria-expanded={traitsExpanded}
          aria-controls="mint-preview-trait-list"
        >
          <span>Traits ({attributes.length})</span>
          {traitsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {traitsExpanded && (
          <div id="mint-preview-trait-list" className="px-3 pb-2 flex flex-col gap-1">
            {attributes.map((attr) => (
              <div key={attr.trait_type} className="flex justify-between text-xs">
                <span className="text-muted">{attr.trait_type}</span>
                <span className="text-primary font-medium">{attr.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divider between traits and price */}
        <div className="mx-3" style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* Price breakdown — compact rows */}
        <div className="px-3 py-2 flex flex-col gap-1">
          {isFree ? (
            <div className="flex justify-between text-xs">
              <span className="text-muted">Credit cost</span>
              <span className="text-accent font-semibold">{creditCost} credits</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Base price</span>
                <span className="text-secondary">{price.basePrice.toFixed(3)} XCH</span>
              </div>
              {price.surchargeXch > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Surcharge ({price.surchargeTraitName})</span>
                  <span className="text-secondary">+{price.surchargeXch.toFixed(3)} XCH</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted">Royalty (10%)</span>
                <span className="text-secondary">+{(price.totalXch * 0.1).toFixed(3)} XCH</span>
              </div>
              <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="text-muted font-medium">Total</span>
                <span className="text-accent font-semibold">{(price.totalXch * 1.1).toFixed(3)} XCH</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
