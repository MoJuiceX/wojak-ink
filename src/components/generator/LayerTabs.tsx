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
  Scan,
  type LucideIcon,
} from 'lucide-react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { LAYER_CONFIG, LAYER_ORDER } from '@/config/layers';
import type { UILayerName } from '@/lib/wojakRules';
import { isSelectionPathEmpty } from '@/types/generator';
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
  Mask: Scan,
};

interface LayerTabProps {
  layer: UILayerName;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string | null;
  hasSelection: boolean;
  onClick: () => void;
}

function LayerTab({
  layer,
  isActive,
  isBlocked,
  blockedReason,
  hasSelection,
  onClick,
}: LayerTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = LAYER_CONFIG[layer];
  const Icon = LAYER_ICONS[config.icon] || User;

  return (
    <motion.button
      className="generator-layer-tab relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 sm:flex-none sm:px-3 sm:py-2 sm:gap-1 sm:min-w-[60px]"
      style={{
        background: 'transparent',
        color: isActive
          ? 'white'
          : isBlocked
            ? 'var(--color-text-muted)'
            : 'var(--color-text-secondary)',
        opacity: isBlocked ? 0.5 : 1,
        filter: isBlocked ? 'grayscale(1)' : 'none',
        transition: 'all 0.3s ease',
      }}
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
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        {isBlocked && (
          <Lock
            size={8}
            className="absolute -top-1 -right-1 sm:w-2.5 sm:h-2.5"
            style={{ color: 'var(--color-text-muted)' }}
          />
        )}
      </div>
      <span className="text-[10px] sm:text-xs font-medium">{config.label}</span>

      {/* Selection indicator dot with glow */}
      {hasSelection && !isBlocked && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{
            background: isActive ? 'white' : '#F97316',
            boxShadow: isActive ? 'none' : '0 0 8px #F97316',
          }}
        />
      )}

      {/* Required indicator */}
      {config.required && !hasSelection && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ background: 'var(--color-error)' }}
          title="Required"
        />
      )}
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
    selectedLayers,
    isLayerDisabled,
    getDisabledReason,
  } = useGenerator();

  const hasLayerSelection = (layer: UILayerName): boolean => {
    const path = selectedLayers[layer];
    return !isSelectionPathEmpty(path);
  };

  // For MouthBase tab, also check if MouthItem or FacialHair has selection (since they're combined)
  const hasSelectionIncludingCombined = (layer: UILayerName): boolean => {
    if (layer === 'MouthBase') {
      return hasLayerSelection('MouthBase') || hasLayerSelection('MouthItem') || hasLayerSelection('FacialHair');
    }
    return hasLayerSelection(layer);
  };

  // Filter out hidden tabs
  const visibleLayers = LAYER_ORDER.filter((layer) => !HIDDEN_TABS.includes(layer));

  return (
    <div
      className={`flex justify-between p-2 rounded-2xl overflow-x-auto w-full ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
      }}
      role="tablist"
      aria-label="Layer selection tabs"
    >
      {visibleLayers.map((layer) => (
        <LayerTab
          key={layer}
          layer={layer}
          isActive={activeLayer === layer || (layer === 'MouthBase' && (activeLayer === 'MouthItem' || activeLayer === 'FacialHair'))}
          isBlocked={isLayerDisabled(layer)}
          blockedReason={getDisabledReason(layer)}
          hasSelection={hasSelectionIncludingCombined(layer)}
          onClick={() => setActiveLayer(layer)}
        />
      ))}
    </div>
  );
}

export default LayerTabs;
