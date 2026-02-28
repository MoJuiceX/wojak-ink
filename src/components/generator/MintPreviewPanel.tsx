/**
 * Mint Preview Panel
 *
 * Shows a complete NFT preview before minting:
 * - Full-resolution preview image
 * - Trait list (from metadata attributes)
 * - Price breakdown (base + surcharge)
 * - Supply context
 * - "What happens next" explainer
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
  maxSupply,
}: MintPreviewPanelProps) {
  const [traitsExpanded, setTraitsExpanded] = useState(false);

  const mintNumber = totalMinted + 1;

  return (
    <div className="mint-preview-panel flex flex-col gap-3 w-full">
      {/* Preview image (compact on mobile, centered) */}
      {imageUrl && (
        <div className="flex justify-center">
          <div
            className="mint-preview-image rounded-xl overflow-hidden"
            style={{
              width: 120,
              height: 120,
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
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

      {/* Supply context */}
      <div className="text-center">
        <p className="text-xs text-muted">
          Wojak #{mintNumber} of {maxSupply}
        </p>
      </div>

      {/* Trait list (collapsible on mobile) */}
      <div className="mint-preview-traits rounded-lg overflow-hidden" style={{ background: 'var(--color-surface)' }}>
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
      </div>

      {/* Price breakdown */}
      <div className="mint-preview-price rounded-lg px-3 py-2" style={{ background: 'var(--color-surface)' }}>
        {isFree ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Credit cost</span>
              <span className="text-accent font-semibold">{creditCost} credits</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
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
            <div className="flex justify-between text-xs pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span className="text-secondary font-medium">Total</span>
              <span className="text-accent font-semibold">{price.totalXch.toFixed(3)} XCH</span>
            </div>
          </div>
        )}
      </div>

      {/* What happens next */}
      <p className="text-[10px] text-muted text-center leading-relaxed">
        Your Wojak will appear on MintGarden within ~5 minutes.
        {!isFree && ' Network fee is minimal (<0.001 XCH).'}
      </p>
    </div>
  );
});
