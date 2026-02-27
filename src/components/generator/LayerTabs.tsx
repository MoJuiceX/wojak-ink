/**
 * Layer Tabs Component
 *
 * Horizontal tabs for switching between layers.
 */

import { motion, useReducedMotion } from 'framer-motion';
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
  onClick: () => void;
}

function LayerTab({
  layer,
  isActive,
  isBlocked,
  blockedReason,
  hasSelection: _hasSelection,
  onClick,
}: LayerTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = LAYER_CONFIG[layer];
  const Icon = LAYER_ICONS[config.icon] || User;

  return (
    <motion.button
      className={`generator-layer-tab relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 sm:flex-none sm:px-3 sm:py-2 sm:gap-1 sm:min-w-[60px]${isActive ? ' generator-layer-tab--active' : ''}${isBlocked ? ' generator-layer-tab--blocked' : ''}`}
      variants={prefersReducedMotion ? undefined : layerTabVariants}
      whileHover={isBlocked ? undefined : 'hover'}
      whileTap={isBlocked ? undefined : 'tap'}
      onClick={onClick}
      disabled={isBlocked}
      aria-selected={isActive}
      aria-disabled={isBlocked}
      title={isBlocked ? (blockedReason || `${config.label} is blocked`) : config.description}
    >
      <div className="relative">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
        {isBlocked && (
          <Lock
            size={8}
            className="absolute -top-1 -right-1 sm:w-2.5 sm:h-2.5 text-muted"
          />
        )}
        {isActive && !isBlocked && (
          <div
            className="generator-layer-tab__active-dot absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full layer-tab-active-dot"
          />
        )}
      </div>
      <span className="text-[10px] sm:text-xs font-medium">{config.label}</span>
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
    <div
      className={`generator-layer-tab-bar flex justify-between p-2 rounded-2xl overflow-x-auto w-full ${className}`}
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
            onClick={() => setActiveLayer(layer)}
          />
        );
      })}
    </div>
  );
}

export default LayerTabs;
