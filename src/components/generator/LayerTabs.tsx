/**
 * Layer Tabs Component
 *
 * Horizontal tabs for switching between layers.
 */

import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import {
  Image,
  User,
  Shirt,
  Smile,
  Eye,
  Crown,
  Lock,
  Cigarette,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { LAYER_CONFIG, LAYER_ORDER } from '@/config/layers';
import type { UILayerName } from '@/lib/wojakRules';
import { layerTabVariants } from '@/config/generatorAnimations';

/** Shorter labels for mobile to prevent tab crowding */
const MOBILE_SHORT_LABELS: Partial<Record<string, string>> = {
  Background: 'BG',
  Clothes: 'Outfit',
  Extras: 'Extra',
};

// Icon mapping
const LAYER_ICONS: Record<string, LucideIcon> = {
  Image,
  User,
  Shirt,
  Smile,
  Eye,
  Crown,
  Cigarette,
  Sparkles,
};

import { isSelectionPathEmpty } from '@/types/generator';

interface LayerTabProps {
  layer: UILayerName;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string | null;
  hasSelection?: boolean;
  /** Short label for mobile viewports */
  mobileLabel?: string;
  onClick: () => void;
}

function LayerTab({
  layer,
  isActive,
  isBlocked,
  blockedReason,
  hasSelection: _hasSelection,
  mobileLabel,
  onClick,
}: LayerTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = LAYER_CONFIG[layer];
  const Icon = LAYER_ICONS[config.icon] || User;

  return (
    <motion.button
      type="button"
      className={`generator-layer-tab relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 lg:flex-none lg:px-3 lg:py-2 lg:gap-1 lg:min-w-[60px]${isActive ? ' generator-layer-tab--active' : ''}${isBlocked ? ' generator-layer-tab--blocked' : ''}`}
      variants={prefersReducedMotion ? undefined : layerTabVariants}
      whileHover={isBlocked ? undefined : 'hover'}
      whileTap={isBlocked ? undefined : 'tap'}
      onClick={onClick}
      disabled={isBlocked}
      aria-selected={isActive}
      aria-disabled={isBlocked}
      title={isBlocked ? (blockedReason || `${config.label} is blocked`) : config.description}
    >
      {/* Sliding pill indicator — animates between tabs via layoutId */}
      {isActive && !isBlocked && (
        <motion.div
          className="generator-layer-tab-pill absolute inset-0 rounded-lg"
          layoutId="activeTabPill"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative">
        <Icon strokeWidth={2} />
        {isBlocked && (
          <Lock
            size={8}
            className="absolute -top-1 -right-1 lg:w-2.5 lg:h-2.5 text-muted"
          />
        )}
      </div>
      {/* Short label on mobile, full label on desktop */}
      <span className="relative text-[10px] lg:text-xs font-medium lg:hidden">{mobileLabel || config.label}</span>
      <span className="relative text-xs font-medium hidden lg:block">{config.label}</span>
    </motion.button>
  );
}

interface LayerTabsProps {
  className?: string;
}

// Layers to hide from tabs (combined into other layers)
const HIDDEN_TABS: UILayerName[] = ['MouthItem', 'FacialHair'];

export function LayerTabs({ className = '' }: LayerTabsProps) {
  const {
    activeLayer,
    setActiveLayer,
    isLayerDisabled,
    getDisabledReason,
    selectedLayers,
  } = useGenerator();

  // Filter out hidden tabs
  const visibleLayers = LAYER_ORDER.filter((layer) => !HIDDEN_TABS.includes(layer));

  return (
    <LayoutGroup>
    <div
      className={`generator-layer-tab-bar flex justify-between px-1 lg:px-2 py-1.5 rounded-none lg:rounded-2xl overflow-x-auto w-full ${className}`}
      role="tablist"
      aria-label="Layer selection tabs"
    >
      {visibleLayers.map((layer) => {
        // Check if this tab (or any hidden sub-tab) has a selection
        const layerHasSelection = !isSelectionPathEmpty(selectedLayers[layer]);
        const mouthSubHasSelection = layer === 'MouthBase'
          ? (!isSelectionPathEmpty(selectedLayers['MouthItem']) || !isSelectionPathEmpty(selectedLayers['FacialHair']))
          : false;
        return (
          <LayerTab
            key={layer}
            layer={layer}
            isActive={activeLayer === layer || (layer === 'MouthBase' && (activeLayer === 'MouthItem' || activeLayer === 'FacialHair'))}
            isBlocked={isLayerDisabled(layer)}
            blockedReason={getDisabledReason(layer)}
            hasSelection={layerHasSelection || mouthSubHasSelection}
            mobileLabel={MOBILE_SHORT_LABELS[LAYER_CONFIG[layer].label]}
            onClick={() => setActiveLayer(layer)}
          />
        );
      })}
    </div>
    </LayoutGroup>
  );
}

export default LayerTabs;
