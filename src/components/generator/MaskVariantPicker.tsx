/**
 * MaskVariantPicker — category-based mask variant selector
 *
 * Shows collapsible categories (Tanginium, Medieval Bepe, Skull) with
 * thumbnail grids for picking full-face mask variants.
 */

import { useState } from 'react';
import {
  MASK_CATEGORIES,
  getMaskPath,
  getSelectedCategory,
  type MaskCategory,
  type MaskVariant,
} from './maskData';

export interface MaskVariantPickerProps {
  selectedPath: string | undefined;
  onSelect: (path: string) => void;
}

export function MaskVariantPicker({ selectedPath, onSelect }: MaskVariantPickerProps) {
  const selectedCategory = getSelectedCategory(selectedPath);
  const [expandedCategory, setExpandedCategory] = useState<MaskCategory | null>(selectedCategory);

  const handleCategoryClick = (category: MaskCategory) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const handleVariantSelect = (variant: MaskVariant) => {
    onSelect(getMaskPath(variant));
  };

  return (
    <div className="flex-shrink-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-muted">Mask style</div>
      <div className="flex flex-col gap-2">
        {(Object.entries(MASK_CATEGORIES) as [MaskCategory, typeof MASK_CATEGORIES[MaskCategory]][]).map(([key, category]) => {
          const isExpanded = expandedCategory === key;
          const isSelected = selectedCategory === key;
          const previewVariant = isSelected
            ? category.variants.find((v) => selectedPath?.includes(v.file.replace('.png', ''))) ?? category.variants[0]
            : category.variants[0];

          return (
            <div key={key}>
              {/* Category header */}
              <button
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors"
                style={{
                  background: isExpanded ? 'var(--color-white-8)' : 'var(--color-white-5)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                }}
                onClick={() => handleCategoryClick(key)}
              >
                <img
                  src={getMaskPath(previewVariant)}
                  alt={category.label}
                  className="w-10 h-10 rounded-lg object-contain"
                  style={{ background: 'var(--color-surface)' }}
                  crossOrigin="anonymous"
                  loading="lazy"
                />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{category.label}</div>
                  <div className="text-xs text-muted">{category.variants.length} styles</div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted transition-transform"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded variants grid */}
              {isExpanded && (
                <div className="grid grid-cols-3 gap-2 mt-2 p-2 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
                  {category.variants.map((variant) => {
                    const path = getMaskPath(variant);
                    const isVariantSelected = selectedPath === path;
                    return (
                      <button
                        key={variant.file}
                        type="button"
                        className="aspect-square relative rounded-lg overflow-hidden"
                        style={{
                          background: 'var(--color-surface)',
                          border: isVariantSelected
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                        }}
                        onClick={() => handleVariantSelect(variant)}
                        title={variant.label}
                      >
                        <img
                          src={path}
                          alt={variant.label}
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                          loading="lazy"
                        />
                        {isVariantSelected && (
                          <div
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-primary)' }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
