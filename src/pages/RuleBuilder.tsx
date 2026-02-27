/**
 * Rule Builder — Dev tool for visually creating layer rendering rules.
 *
 * Select any combination of traits, reorder them in the layer stack,
 * and configure how each layer renders relative to the one above it.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type UILayerName } from '@/lib/layerRegistry';
import { buildRenderLayers } from '@/services/canvasRendererLayerBuilder';
import { renderToCanvas } from '@/services/canvasRenderer';
import { getUnifiedTraits, type UnifiedTrait } from '@/services/generatorService';
import { G2_DEFAULT_COLORS } from '@/config/g2DefaultColors';
import type { SelectedLayers } from '@/lib/wojakRules';
import type { G2Selections } from '@/types/generator';
import type { RenderLayer, LayerRenderOverride } from '@/services/canvasRendererTypes';

// ─── Types ───────────────────────────────────────────────────

type RenderMode = 'normal' | 'under' | 'split' | 'crop';

interface SplitConfig {
  x: { enabled: boolean; clip: number; side: 'left' | 'right' };
  y: { enabled: boolean; clip: number; side: 'top' | 'bottom' };
}

interface LayerStackItem {
  id: string; // unique id for React key
  layerName: UILayerName;
  traitId: string;
  traitName: string;
  path: string;
  trait: UnifiedTrait | null;
  renderMode: RenderMode;
  splitConfig: SplitConfig;
}

interface ExportedRule {
  id: string;
  description: string;
  timestamp: string;
  layers: {
    layerName: string;
    traitId: string;
    traitName: string;
    path: string;
    renderMode: RenderMode;
    splitConfig?: {
      x?: { clip: number; side: string };
      y?: { clip: number; side: string };
    };
  }[];
}

// ─── Constants ───────────────────────────────────────────────

const CANVAS_SIZE = 500;

const DEFAULT_SPLIT: SplitConfig = {
  x: { enabled: true, clip: 0.35, side: 'left' },
  y: { enabled: false, clip: 0.35, side: 'top' },
};

const SLIDER_STEPS = 1000;

// Layer types to show in the selector (exclude Background for now)
const SELECTABLE_LAYERS: UILayerName[] = [
  'Base',
  'Clothes',
  'FacialHair',
  'MouthBase',
  'MouthItem',
  'Mask',
  'Eyes',
  'Head',
];

// Layer colors for visual distinction
const LAYER_COLORS: Record<string, string> = {
  Base: '#f59e0b',
  Clothes: '#8b5cf6',
  FacialHair: '#a78bfa',
  MouthBase: '#ec4899',
  MouthItem: '#f472b6',
  Mask: '#ef4444',
  Eyes: '#00d4ff',
  Head: '#22c55e',
};

// ─── Hooks ───────────────────────────────────────────────────

function useAllTraitsLoader() {
  const [traitsByLayer, setTraitsByLayer] = useState<Record<UILayerName, UnifiedTrait[]>>({} as Record<UILayerName, UnifiedTrait[]>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(
          SELECTABLE_LAYERS.map(async (layer) => {
            const traits = await getUnifiedTraits(layer);
            return { layer, traits };
          })
        );
        if (!cancelled) {
          const byLayer: Record<UILayerName, UnifiedTrait[]> = {} as Record<UILayerName, UnifiedTrait[]>;
          for (const { layer, traits } of results) {
            byLayer[layer] = traits;
          }
          setTraitsByLayer(byLayer);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { traitsByLayer, loading };
}

// ─── Components ──────────────────────────────────────────────

function LayerSelector({
  layerName,
  traits,
  onSelect,
  color,
}: {
  layerName: UILayerName;
  traits: UnifiedTrait[];
  onSelect: (trait: UnifiedTrait, path: string) => void;
  color: string;
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (id === '') return;
    const trait = traits.find((t) => t.id === id);
    if (trait) {
      const path = trait.g1Path || `/g2/${trait.category}/${trait.name}`;
      onSelect(trait, path);
      // Reset dropdown after selection
      setTimeout(() => setSelectedId(''), 100);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color }}>
        {layerName}
      </label>
      <select
        className="input text-sm py-1.5"
        value={selectedId}
        onChange={handleChange}
      >
        <option value="">+ Add {layerName.toLowerCase()}...</option>
        {traits.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.source === 'g2' ? '[G2]' : t.source === 'both' ? '[G1+G2]' : '[G1]'}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Layer stack item with move/delete buttons and render config */
function StackItem({
  item,
  index,
  total,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateRenderMode,
  onUpdateSplitConfig,
}: {
  item: LayerStackItem;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdateRenderMode: (mode: RenderMode) => void;
  onUpdateSplitConfig: (config: SplitConfig) => void;
}) {
  const color = LAYER_COLORS[item.layerName] || '#888';
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: isSelected ? `2px solid ${color}` : '2px solid var(--color-border)',
        background: isSelected ? 'var(--color-surface)' : 'transparent',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={onSelect}
        style={{ background: isSelected ? `${color}22` : 'transparent' }}
      >
        {/* Layer indicator */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{item.traitName}</div>
          <div className="text-xs text-muted truncate">{item.layerName}</div>
        </div>

        {/* Move buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={!canMoveUp}
            title="Move up (render later)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={!canMoveDown}
            title="Move down (render earlier)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Remove button */}
        <button
          type="button"
          className="p-1 rounded hover:bg-red-500/20 text-red-400"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded config when selected */}
      {isSelected && (
        <div className="px-3 py-3 border-t border-white/10">
          {index > 0 ? (
            <>
              <div className="text-xs text-muted mb-2">
                Render relative to layer above:
              </div>

              {/* Render mode buttons */}
              <div className="grid grid-cols-2 gap-1 mb-3">
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'normal' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'normal' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('normal')}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'under' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'under' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('under')}
                >
                  Under
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'split' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'split' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('split')}
                >
                  Split
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'crop' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'crop' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('crop')}
                >
                  Crop
                </button>
              </div>

              {/* Split/Crop config */}
              {(item.renderMode === 'split' || item.renderMode === 'crop') && (
                <SplitConfigPanel
                  config={item.splitConfig}
                  onChange={onUpdateSplitConfig}
                  color={color}
                />
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-muted mb-2">
                Top layer — can only crop (move layers above to configure under/split)
              </div>
              <div className="flex gap-1 mb-3">
                <button
                  type="button"
                  className="flex-1 text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'normal' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'normal' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('normal')}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className="flex-1 text-xs py-1.5 px-2 rounded"
                  style={{
                    background: item.renderMode === 'crop' ? color : 'var(--color-surface)',
                    color: item.renderMode === 'crop' ? '#000' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => onUpdateRenderMode('crop')}
                >
                  Crop
                </button>
              </div>
              {item.renderMode === 'crop' && (
                <SplitConfigPanel
                  config={item.splitConfig}
                  onChange={onUpdateSplitConfig}
                  color={color}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SplitConfigPanel({
  config,
  onChange,
  color,
}: {
  config: SplitConfig;
  onChange: (config: SplitConfig) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* X axis */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.x.enabled}
            onChange={(e) => onChange({ ...config, x: { ...config.x, enabled: e.target.checked } })}
          />
          <span className="text-xs font-medium">X axis</span>
          <span className="text-xs text-muted">({(config.x.clip * 100).toFixed(1)}%)</span>
        </div>
        {config.x.enabled && (
          <div className="flex flex-col gap-1 pl-5">
            <input
              type="range"
              min="0"
              max={SLIDER_STEPS}
              value={config.x.clip * SLIDER_STEPS}
              onChange={(e) => onChange({
                ...config,
                x: { ...config.x, clip: Number(e.target.value) / SLIDER_STEPS }
              })}
              style={{ accentColor: color }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 text-xs py-1 rounded"
                style={{
                  background: config.x.side === 'left' ? color : 'var(--color-bg)',
                  color: config.x.side === 'left' ? '#000' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={() => onChange({ ...config, x: { ...config.x, side: 'left' } })}
              >
                Left under
              </button>
              <button
                type="button"
                className="flex-1 text-xs py-1 rounded"
                style={{
                  background: config.x.side === 'right' ? color : 'var(--color-bg)',
                  color: config.x.side === 'right' ? '#000' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={() => onChange({ ...config, x: { ...config.x, side: 'right' } })}
              >
                Right under
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Y axis */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.y.enabled}
            onChange={(e) => onChange({ ...config, y: { ...config.y, enabled: e.target.checked } })}
          />
          <span className="text-xs font-medium">Y axis</span>
          <span className="text-xs text-muted">({(config.y.clip * 100).toFixed(1)}%)</span>
        </div>
        {config.y.enabled && (
          <div className="flex flex-col gap-1 pl-5">
            <input
              type="range"
              min="0"
              max={SLIDER_STEPS}
              value={config.y.clip * SLIDER_STEPS}
              onChange={(e) => onChange({
                ...config,
                y: { ...config.y, clip: Number(e.target.value) / SLIDER_STEPS }
              })}
              style={{ accentColor: color }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 text-xs py-1 rounded"
                style={{
                  background: config.y.side === 'top' ? color : 'var(--color-bg)',
                  color: config.y.side === 'top' ? '#000' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={() => onChange({ ...config, y: { ...config.y, side: 'top' } })}
              >
                Top under
              </button>
              <button
                type="button"
                className="flex-1 text-xs py-1 rounded"
                style={{
                  background: config.y.side === 'bottom' ? color : 'var(--color-bg)',
                  color: config.y.side === 'bottom' ? '#000' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
                onClick={() => onChange({ ...config, y: { ...config.y, side: 'bottom' } })}
              >
                Bottom under
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Draggable clip line overlay on the canvas */
function DragLine({
  canvasSize,
  axis,
  percent,
  onChange,
  color,
  label,
}: {
  canvasSize: number;
  axis: 'x' | 'y';
  percent: number;
  onChange: (p: number) => void;
  color: string;
  label: string;
}) {
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const p = axis === 'x'
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, Math.round(p * SLIDER_STEPS) / SLIDER_STEPS)));
    },
    [axis, onChange]
  );

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  const pos = percent * canvasSize;
  const isX = axis === 'x';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        style={{
          position: 'absolute',
          ...(isX
            ? { left: `${pos}px`, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', transform: 'translateX(-2px)' }
            : { top: `${pos}px`, left: 0, right: 0, height: '4px', cursor: 'row-resize', transform: 'translateY(-2px)' }),
          background: color,
          pointerEvents: 'auto',
          zIndex: 50,
          boxShadow: '0 0 8px rgba(0,0,0,0.5)',
        }}
        onPointerDown={handlePointerDown}
      />
      <div
        className="absolute text-xs font-bold px-2 py-1 rounded"
        style={{
          ...(isX
            ? { left: `${pos + 8}px`, top: '8px' }
            : { left: '8px', top: `${pos + 8}px` }),
          background: color,
          color: '#000',
          pointerEvents: 'none',
          zIndex: 51,
          whiteSpace: 'nowrap',
        }}
      >
        {label}: {(percent * 100).toFixed(1)}%
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function RuleBuilder() {
  const { traitsByLayer, loading } = useAllTraitsLoader();

  // Layer stack (ordered from top to bottom in render order)
  // Index 0 = renders on top, higher index = renders below
  const [layerStack, setLayerStack] = useState<LayerStackItem[]>([]);

  // Selected layer in stack for configuration
  const [selectedStackIndex, setSelectedStackIndex] = useState<number | null>(null);

  // G2 selections for rendering
  const [g2Selections, setG2Selections] = useState<G2Selections>({});

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [computedLayers, setComputedLayers] = useState<RenderLayer[]>([]);

  // Export state
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate description based on layer configuration
  const autoDescription = useMemo(() => {
    if (layerStack.length === 0) return '';

    // Get all "normal" layers as context triggers
    const contextLayers = layerStack.filter(l => l.renderMode === 'normal');
    const contextNames = contextLayers.map(l => l.traitName);

    const parts: string[] = [];

    for (let i = 0; i < layerStack.length; i++) {
      const item = layerStack[i];
      const aboveItem = i > 0 ? layerStack[i - 1] : null;

      if (item.renderMode === 'normal') continue;

      const coords: string[] = [];
      if (item.splitConfig.x.enabled) {
        coords.push(`X=${(item.splitConfig.x.clip * 100).toFixed(1)}% ${item.splitConfig.x.side}`);
      }
      if (item.splitConfig.y.enabled) {
        coords.push(`Y=${(item.splitConfig.y.clip * 100).toFixed(1)}% ${item.splitConfig.y.side}`);
      }
      const coordStr = coords.length > 0 ? ` at ${coords.join(', ')}` : '';

      if (item.renderMode === 'under' && aboveItem) {
        parts.push(`${item.traitName} under ${aboveItem.traitName}`);
      } else if (item.renderMode === 'split' && aboveItem) {
        parts.push(`${item.traitName} split under ${aboveItem.traitName}${coordStr}`);
      } else if (item.renderMode === 'crop') {
        // Include context: which other layers trigger this crop
        if (contextNames.length > 0) {
          parts.push(`${item.traitName} cropped${coordStr} when ${contextNames.join(' + ')} selected`);
        } else {
          parts.push(`${item.traitName} cropped${coordStr}`);
        }
      }
    }

    if (parts.length === 0) {
      return layerStack.map(l => l.traitName).join(' + ');
    }

    return parts.join('; ');
  }, [layerStack]);

  // Add a layer to the stack
  const handleAddLayer = useCallback((layerName: UILayerName, trait: UnifiedTrait, path: string) => {
    const newItem: LayerStackItem = {
      id: `${layerName}-${trait.id}-${Date.now()}`,
      layerName,
      traitId: trait.id,
      traitName: trait.name,
      path,
      trait,
      renderMode: 'normal',
      splitConfig: { ...DEFAULT_SPLIT },
    };

    setLayerStack((prev) => [...prev, newItem]);

    // Update G2 selections if needed
    if (trait.source !== 'g1') {
      setG2Selections((prev) => {
        const next = { ...prev };
        const g2Category = trait.id.split('_')[0] || layerName;
        const defaultColors: Record<string, string> = { ...(G2_DEFAULT_COLORS[trait.id] || {}) };
        if (Object.keys(defaultColors).length === 0 && trait.defaultColor) {
          defaultColors['fill'] = trait.defaultColor;
        }
        next[layerName] = { traitId: trait.id, g2Category, colors: defaultColors, options: {} };
        return next;
      });
    }

    setExportJson(null);
  }, []);

  // Remove a layer from the stack
  const handleRemoveLayer = useCallback((index: number) => {
    setLayerStack((prev) => {
      const item = prev[index];
      const next = prev.filter((_, i) => i !== index);

      // Clean up G2 selections if no more layers of this type
      if (!next.some((l) => l.layerName === item.layerName)) {
        setG2Selections((g2) => {
          const updated = { ...g2 };
          delete updated[item.layerName];
          return updated;
        });
      }

      return next;
    });

    if (selectedStackIndex === index) {
      setSelectedStackIndex(null);
    } else if (selectedStackIndex !== null && selectedStackIndex > index) {
      setSelectedStackIndex(selectedStackIndex - 1);
    }

    setExportJson(null);
  }, [selectedStackIndex]);

  // Move a layer up in the stack (will render later/on top)
  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setLayerStack((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    if (selectedStackIndex === index) {
      setSelectedStackIndex(index - 1);
    } else if (selectedStackIndex === index - 1) {
      setSelectedStackIndex(index);
    }
    setExportJson(null);
  }, [selectedStackIndex]);

  // Move a layer down in the stack (will render earlier/below)
  const handleMoveDown = useCallback((index: number) => {
    setLayerStack((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    if (selectedStackIndex === index) {
      setSelectedStackIndex(index + 1);
    } else if (selectedStackIndex === index + 1) {
      setSelectedStackIndex(index);
    }
    setExportJson(null);
  }, [selectedStackIndex]);

  // Update render mode for a layer
  const handleUpdateRenderMode = useCallback((index: number, mode: RenderMode) => {
    setLayerStack((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], renderMode: mode };
      return next;
    });
    setExportJson(null);
  }, []);

  // Update split config for a layer
  const handleUpdateSplitConfig = useCallback((index: number, config: SplitConfig) => {
    setLayerStack((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], splitConfig: config };
      return next;
    });
    setExportJson(null);
  }, []);

  // Get the selected layer's split config for drag lines
  const selectedItem = selectedStackIndex !== null ? layerStack[selectedStackIndex] : null;
  const showDragLines = (selectedItem?.renderMode === 'split' || selectedItem?.renderMode === 'crop') && selectedStackIndex !== null;

  // Render preview
  useEffect(() => {
    if (layerStack.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clearing state when stack empties is intentional
      setPreviewUrl(null);
      setComputedLayers([]);
      return;
    }

    let cancelled = false;

    // Build selections from stack
    const sel: SelectedLayers = {
      Base: '/assets/wojak-layers/BASE/Wojak-skin-full.png',
    };
    for (const item of layerStack) {
      sel[item.layerName] = item.path;
    }

    // Build base layers (used internally by buildRenderLayers for override merging)
    buildRenderLayers(sel);

    // Build clip overrides based on render modes AND stack order
    // Stack order determines z-index: index 0 = highest z-index (renders on top)
    const clipOverrides: Record<string, LayerRenderOverride> = {};

    // Assign z-index based on stack position (top of stack = highest z-index)
    // Base z-index starts at 100, each layer below gets lower z-index
    for (let i = 0; i < layerStack.length; i++) {
      const item = layerStack[i];
      const stackZIndex = 100 - i; // Top of stack = 100, next = 99, etc.

      // Start with stack-based z-index
      const override: LayerRenderOverride = { zIndex: stackZIndex };

      if (i > 0) {
        const aboveZ = 100 - (i - 1);

        if (item.renderMode === 'under') {
          // Render this layer under the one above it
          override.zIndex = aboveZ - 0.5;
        } else if (item.renderMode === 'split') {
          // Split: part under, part on top
          const underConfig: NonNullable<LayerRenderOverride['underSuit']> = {};
          if (item.splitConfig.x.enabled) {
            underConfig.x = { clip: item.splitConfig.x.clip, side: item.splitConfig.x.side };
          }
          if (item.splitConfig.y.enabled) {
            underConfig.y = { clip: item.splitConfig.y.clip, side: item.splitConfig.y.side };
          }
          if (underConfig.x || underConfig.y) {
            override.underSuit = underConfig;
          }
        } else if (item.renderMode === 'crop') {
          // Crop: just clip the layer at the specified position, keep stack z-index
          const cropConfig: NonNullable<LayerRenderOverride['crop']> = {};
          if (item.splitConfig.x.enabled) {
            cropConfig.x = { clip: item.splitConfig.x.clip, side: item.splitConfig.x.side };
          }
          if (item.splitConfig.y.enabled) {
            cropConfig.y = { clip: item.splitConfig.y.clip, side: item.splitConfig.y.side };
          }
          if (cropConfig.x || cropConfig.y) {
            override.crop = cropConfig;
          }
        }
      } else if (item.renderMode === 'crop') {
        // Top item can also be cropped
        const cropConfig: NonNullable<LayerRenderOverride['crop']> = {};
        if (item.splitConfig.x.enabled) {
          cropConfig.x = { clip: item.splitConfig.x.clip, side: item.splitConfig.x.side };
        }
        if (item.splitConfig.y.enabled) {
          cropConfig.y = { clip: item.splitConfig.y.clip, side: item.splitConfig.y.side };
        }
        if (cropConfig.x || cropConfig.y) {
          override.crop = cropConfig;
        }
      }

      clipOverrides[item.layerName] = override;
    }

    // Update computed layers display with stack-based z-index
    const stackLayers = layerStack.map((item, i) => ({
      layerName: item.layerName,
      path: item.path,
      zIndex: clipOverrides[item.layerName]?.zIndex ?? (100 - i),
    }));
    // Add base layer
    stackLayers.push({ layerName: 'Base', path: sel.Base!, zIndex: 1 });
    // Sort by z-index for display
    stackLayers.sort((a, b) => a.zIndex - b.zIndex);
    setComputedLayers(stackLayers as RenderLayer[]);

    renderToCanvas(sel, {
      size: CANVAS_SIZE,
      includeBackground: true,
      g2Selections: Object.keys(g2Selections).length > 0 ? g2Selections : undefined,
      layerClipOverrides: Object.keys(clipOverrides).length > 0 ? clipOverrides : undefined,
    })
      .then((result) => { if (!cancelled) setPreviewUrl(result.dataUrl); })
      .catch(() => { if (!cancelled) setPreviewUrl(null); });

    return () => { cancelled = true; };
  }, [layerStack, g2Selections]);

  // Export handler
  const handleExport = useCallback(() => {
    const rule: ExportedRule = {
      id: `rule-${Date.now()}`,
      description: autoDescription || 'No layers configured',
      timestamp: new Date().toISOString(),
      layers: layerStack.map((item) => {
        const layer: ExportedRule['layers'][0] = {
          layerName: item.layerName,
          traitId: item.traitId,
          traitName: item.traitName,
          path: item.path,
          renderMode: item.renderMode,
        };
        if (item.renderMode === 'split') {
          layer.splitConfig = {};
          if (item.splitConfig.x.enabled) {
            layer.splitConfig.x = { clip: item.splitConfig.x.clip, side: item.splitConfig.x.side };
          }
          if (item.splitConfig.y.enabled) {
            layer.splitConfig.y = { clip: item.splitConfig.y.clip, side: item.splitConfig.y.side };
          }
        }
        return layer;
      }),
    };

    const json = JSON.stringify(rule, null, 2);
    setExportJson(json);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [layerStack, autoDescription]);

  const handleClear = useCallback(() => {
    setLayerStack([]);
    setSelectedStackIndex(null);
    setG2Selections({});
    setPreviewUrl(null);
    setComputedLayers([]);
    setExportJson(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p>Loading traits...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Layer Rule Builder</h1>
          <p className="text-sm text-secondary mt-1">
            Add layers, reorder them, and configure how each renders relative to the one above
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            Clear All
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={layerStack.length === 0}
          >
            {copied ? 'Copied!' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* Auto-generated Description */}
      <div
        className="input"
        style={{
          background: 'var(--color-surface)',
          color: autoDescription ? 'var(--color-text)' : 'var(--color-text-muted)',
          cursor: 'default',
        }}
      >
        {autoDescription || 'Add layers and configure render modes to generate description'}
      </div>

      {/* Main layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '280px 1fr 320px' }}>
        {/* LEFT: Layer selectors */}
        <div className="flex flex-col gap-3">
          <div className="card-static p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-secondary">Add Layers</h2>
            {SELECTABLE_LAYERS.map((layerName) => (
              <LayerSelector
                key={layerName}
                layerName={layerName}
                traits={traitsByLayer[layerName] || []}
                onSelect={(trait, path) => handleAddLayer(layerName, trait, path)}
                color={LAYER_COLORS[layerName] || '#888'}
              />
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="flex flex-col gap-4 items-center">
          <div
            className="relative"
            style={{
              width: `${CANVAS_SIZE}px`,
              height: `${CANVAS_SIZE}px`,
              background: '#1a1a2e',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ display: 'block' }} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                Add layers to preview
              </div>
            )}

            {/* Drag lines for split mode */}
            {showDragLines && selectedItem && (
              <>
                {selectedItem.splitConfig.x.enabled && (
                  <DragLine
                    canvasSize={CANVAS_SIZE}
                    axis="x"
                    percent={selectedItem.splitConfig.x.clip}
                    onChange={(p) => handleUpdateSplitConfig(selectedStackIndex!, {
                      ...selectedItem.splitConfig,
                      x: { ...selectedItem.splitConfig.x, clip: p },
                    })}
                    color={LAYER_COLORS[selectedItem.layerName] || '#00d4ff'}
                    label={`X (${selectedItem.splitConfig.x.side})`}
                  />
                )}
                {selectedItem.splitConfig.y.enabled && (
                  <DragLine
                    canvasSize={CANVAS_SIZE}
                    axis="y"
                    percent={selectedItem.splitConfig.y.clip}
                    onChange={(p) => handleUpdateSplitConfig(selectedStackIndex!, {
                      ...selectedItem.splitConfig,
                      y: { ...selectedItem.splitConfig.y, clip: p },
                    })}
                    color="#f59e0b"
                    label={`Y (${selectedItem.splitConfig.y.side})`}
                  />
                )}
              </>
            )}
          </div>

          {/* Computed layers debug */}
          {computedLayers.length > 0 && (
            <div
              className="w-full p-3 rounded-lg text-xs font-mono text-muted"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                maxHeight: '150px',
                overflow: 'auto',
              }}
            >
              <p className="font-semibold mb-2">Computed layers (z-index order):</p>
              {computedLayers.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span style={{ minWidth: '32px' }}>z:{l.zIndex}</span>
                  <span>{l.layerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Layer stack */}
        <div className="flex flex-col gap-3">
          <div className="card-static p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-secondary">Layer Stack</h2>
              <span className="text-xs text-muted">Top renders last</span>
            </div>

            {layerStack.length === 0 ? (
              <div className="text-sm text-muted py-4 text-center">
                Add layers from the left panel
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {layerStack.map((item, index) => (
                  <StackItem
                    key={item.id}
                    item={item}
                    index={index}
                    total={layerStack.length}
                    isSelected={selectedStackIndex === index}
                    onSelect={() => setSelectedStackIndex(selectedStackIndex === index ? null : index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onRemove={() => handleRemoveLayer(index)}
                    onUpdateRenderMode={(mode) => handleUpdateRenderMode(index, mode)}
                    onUpdateSplitConfig={(config) => handleUpdateSplitConfig(index, config)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card-static p-3 text-xs">
            <p className="font-semibold mb-2">Render Modes:</p>
            <p className="text-muted"><strong>Normal:</strong> Stack order (top = on top)</p>
            <p className="text-muted"><strong>Under:</strong> Render below layer above</p>
            <p className="text-muted"><strong>Split:</strong> Part under, part on top</p>
            <p className="text-muted"><strong>Crop:</strong> Cut off at X/Y position</p>
          </div>
        </div>
      </div>

      {/* Export output */}
      {exportJson && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Exported JSON</h2>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={() => {
                navigator.clipboard.writeText(exportJson);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre
            className="p-4 rounded-lg text-xs overflow-auto"
            style={{
              background: '#0d0d15',
              border: '1px solid var(--color-border)',
              maxHeight: '250px',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {exportJson}
          </pre>
        </div>
      )}
    </div>
  );
}
