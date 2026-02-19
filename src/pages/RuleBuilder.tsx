/**
 * Rule Builder — Dev tool for visually creating layer rendering rules.
 *
 * Each layer card has independent toggles: Crop / Under suit / Hidden.
 * Crop and under-suit each have independent X and Y axes with separate sliders.
 * Layers can be reordered with up/down arrows to adjust z-index.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RENDER_ORDER, UI_ORDER, LAYER_META, type UILayerName } from '@/lib/layerRegistry';
import { buildRenderLayers } from '@/services/canvasRendererLayerBuilder';
import { renderToCanvas } from '@/services/canvasRenderer';
import { getUnifiedTraits, type UnifiedTrait } from '@/services/generatorService';
import { G2_DEFAULT_COLORS } from '@/config/g2DefaultColors';
import { LAYER_Z_INDEX } from '@/services/canvasRendererConstants';
import type { SelectedLayers } from '@/lib/wojakRules';
import type { G2Selections } from '@/types/generator';
import type { RenderLayer, LayerRenderOverride } from '@/services/canvasRendererTypes';

// ─── Types ───────────────────────────────────────────────────

interface XClip {
  enabled: boolean;
  clip: number;
  side: 'left' | 'right';
}

interface YClip {
  enabled: boolean;
  clip: number;
  side: 'top' | 'bottom';
}

interface CropRule {
  enabled: boolean;
  x: XClip;
  y: YClip;
}

interface UnderSuitRule {
  enabled: boolean;
  x: XClip;
  y: YClip;
}

interface LayerRule {
  crop: CropRule;
  under: UnderSuitRule;
  hidden: boolean;
  note: string;
}

interface ExportedRule {
  id: string;
  description: string;
  timestamp: string;
  conditions: Record<string, { traitId: string; traitName: string; path: string }>;
  layerRules: Record<string, {
    crop?: { x?: { clip: number; side: string }; y?: { clip: number; side: string } };
    underSuit?: { x?: { clip: number; side: string }; y?: { clip: number; side: string } };
    hidden?: boolean;
    zIndex?: number;
    note?: string;
  }>;
  computedLayers: { layerName: string; zIndex: number; clip?: string }[];
}

// ─── Constants ───────────────────────────────────────────────

const CANVAS_SIZE = 500;
const LAYER_COLORS: Record<string, string> = {
  Mask: '#ff6b00',
  Eyes: '#00d4ff',
  Head: '#22c55e',
  MouthBase: '#f59e0b',
  MouthItem: '#ec4899',
  FacialHair: '#a855f7',
  Clothes: '#3b82f6',
  Base: '#6b7280',
  Background: '#374151',
};

const DEFAULT_X: XClip = { enabled: true, clip: 0.35, side: 'left' };
const DEFAULT_Y: YClip = { enabled: false, clip: 0.5, side: 'top' };
const DEFAULT_CROP: CropRule = { enabled: false, x: { ...DEFAULT_X }, y: { ...DEFAULT_Y } };
const DEFAULT_UNDER: UnderSuitRule = { enabled: false, x: { ...DEFAULT_X }, y: { ...DEFAULT_Y } };
const DEFAULT_RULE: LayerRule = { crop: { ...DEFAULT_CROP, x: { ...DEFAULT_X }, y: { ...DEFAULT_Y } }, under: { ...DEFAULT_UNDER, x: { ...DEFAULT_X }, y: { ...DEFAULT_Y } }, hidden: false, note: '' };

const SKIP_IN_EDITOR = new Set(['Base', 'Background']);

// Slider step: 0.1% for fine-grained control
const SLIDER_STEPS = 1000;

// ─── Hooks ───────────────────────────────────────────────────

function useTraitLoader() {
  const [traitsByLayer, setTraitsByLayer] = useState<Record<string, UnifiedTrait[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result: Record<string, UnifiedTrait[]> = {};
      for (const layer of UI_ORDER) {
        try {
          result[layer] = await getUnifiedTraits(layer);
        } catch {
          result[layer] = [];
        }
      }
      if (!cancelled) {
        setTraitsByLayer(result);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { traitsByLayer, loading };
}

// ─── Components ──────────────────────────────────────────────

function LayerDropdown({
  layer,
  traits,
  selectedTraitId,
  onSelect,
}: {
  layer: UILayerName;
  traits: UnifiedTrait[];
  selectedTraitId: string;
  onSelect: (traitId: string, path: string, trait: UnifiedTrait | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-secondary">
        {LAYER_META[layer].label}
      </label>
      <select
        className="input text-sm"
        value={selectedTraitId}
        onChange={(e) => {
          const id = e.target.value;
          if (id === '') { onSelect('', '', null); return; }
          const trait = traits.find((t) => t.id === id);
          if (trait) {
            const path = trait.g1Path || `/g2/${trait.category ?? layer}/${trait.name}`;
            onSelect(trait.id, path, trait);
          }
        }}
      >
        <option value="">None</option>
        {traits.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.source === 'g2' ? '[G2]' : t.source === 'both' ? '[G1+G2]' : '[G1]'}
          </option>
        ))}
      </select>
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
  dashed,
}: {
  canvasSize: number;
  axis: 'x' | 'y';
  percent: number;
  onChange: (p: number) => void;
  color: string;
  label: string;
  dashed?: boolean;
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
            ? { left: `${pos}px`, top: 0, bottom: 0, width: '3px', cursor: 'col-resize', transform: 'translateX(-1px)' }
            : { top: `${pos}px`, left: 0, right: 0, height: '3px', cursor: 'row-resize', transform: 'translateY(-1px)' }),
          background: dashed ? 'transparent' : color,
          borderLeft: dashed && isX ? `3px dashed ${color}` : undefined,
          borderTop: dashed && !isX ? `3px dashed ${color}` : undefined,
          pointerEvents: 'auto',
          zIndex: 50,
        }}
        onPointerDown={handlePointerDown}
      />
      <div
        className="absolute text-xs font-bold px-1.5 py-0.5 rounded"
        style={{
          ...(isX
            ? { left: `${pos + 6}px`, top: '4px' }
            : { left: '4px', top: `${pos + 6}px` }),
          background: color,
          color: '#000',
          pointerEvents: 'none',
          zIndex: 51,
          whiteSpace: 'nowrap',
          fontSize: '11px',
          ...(dashed ? { border: '1px dashed #000' } : {}),
        }}
      >
        {label} {isX ? 'X' : 'Y'}: {(percent * 100).toFixed(1)}%
      </div>
    </div>
  );
}

/** Controls for a single rule (crop or underSuit) with independent X and Y axis toggles */
function ClipControls({
  label,
  subRule,
  onChange,
  color,
  actionWord,
}: {
  label: string;
  subRule: CropRule | UnderSuitRule;
  onChange: (r: CropRule | UnderSuitRule) => void;
  color: string;
  actionWord: string;
}) {
  return (
    <div className="flex flex-col gap-2 pl-3" style={{ borderLeft: `2px solid ${color}33` }}>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>

      {/* X axis section */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-md self-start text-secondary"
          style={{
            background: subRule.x.enabled ? 'var(--color-border)' : 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
          onClick={() => onChange({ ...subRule, x: { ...subRule.x, enabled: !subRule.x.enabled } })}
        >
          {subRule.x.enabled ? '✓' : '○'} Vertical (left / right)
        </button>
        {subRule.x.enabled && (
          <div className="flex flex-col gap-1 pl-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted" style={{ minWidth: '38px' }}>
                {(subRule.x.clip * 100).toFixed(1)}%
              </span>
              <input
                type="range" min="0" max={SLIDER_STEPS}
                value={subRule.x.clip * SLIDER_STEPS}
                onChange={(e) => onChange({ ...subRule, x: { ...subRule.x, clip: Number(e.target.value) / SLIDER_STEPS } })}
                className="flex-1" style={{ accentColor: color }}
              />
            </div>
            <div className="flex gap-1">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  className="text-xs px-2 py-1 rounded-md"
                  style={{
                    background: subRule.x.side === side ? color : 'transparent',
                    color: subRule.x.side === side ? '#000' : 'var(--color-text-secondary)',
                    border: `1px solid ${subRule.x.side === side ? color : 'var(--color-border)'}`,
                    fontWeight: subRule.x.side === side ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => onChange({ ...subRule, x: { ...subRule.x, side } })}
                >
                  {side === 'left' ? 'Left' : 'Right'} {actionWord}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Y axis section */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-md self-start text-secondary"
          style={{
            background: subRule.y.enabled ? 'var(--color-border)' : 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
          onClick={() => onChange({ ...subRule, y: { ...subRule.y, enabled: !subRule.y.enabled } })}
        >
          {subRule.y.enabled ? '✓' : '○'} Horizontal (top / bottom)
        </button>
        {subRule.y.enabled && (
          <div className="flex flex-col gap-1 pl-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted" style={{ minWidth: '38px' }}>
                {(subRule.y.clip * 100).toFixed(1)}%
              </span>
              <input
                type="range" min="0" max={SLIDER_STEPS}
                value={subRule.y.clip * SLIDER_STEPS}
                onChange={(e) => onChange({ ...subRule, y: { ...subRule.y, clip: Number(e.target.value) / SLIDER_STEPS } })}
                className="flex-1" style={{ accentColor: color }}
              />
            </div>
            <div className="flex gap-1">
              {(['top', 'bottom'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  className="text-xs px-2 py-1 rounded-md"
                  style={{
                    background: subRule.y.side === side ? color : 'transparent',
                    color: subRule.y.side === side ? '#000' : 'var(--color-text-secondary)',
                    border: `1px solid ${subRule.y.side === side ? color : 'var(--color-border)'}`,
                    fontWeight: subRule.y.side === side ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => onChange({ ...subRule, y: { ...subRule.y, side } })}
                >
                  {side === 'top' ? 'Top' : 'Bottom'} {actionWord}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Layer rule card with independent toggles and z-index reordering arrows */
function LayerCard({
  layerName,
  rule,
  onChange,
  color,
  opacity,
  onOpacityChange,
  effectiveZ,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  layerName: string;
  rule: LayerRule;
  onChange: (r: LayerRule) => void;
  color: string;
  opacity: number;
  onOpacityChange: (v: number) => void;
  effectiveZ: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const hasActiveRule = rule.crop.enabled || rule.under.enabled || rule.hidden;

  return (
    <div
      className="p-3 rounded-lg flex flex-col gap-2"
      style={{
        background: 'var(--color-surface)',
        border: hasActiveRule ? `2px solid ${color}` : '1px solid var(--color-border)',
      }}
    >
      {/* Layer name + color dot + z-index arrows */}
      <div className="flex items-center gap-2">
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span className="text-sm font-semibold flex-1">
          {layerName}
        </span>
        <span className="text-xs font-mono text-muted">
          z:{effectiveZ}
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: canMoveUp ? 'var(--color-border)' : 'transparent',
              color: canMoveUp ? 'var(--color-text)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              cursor: canMoveUp ? 'pointer' : 'default',
              opacity: canMoveUp ? 1 : 0.3,
              lineHeight: 1,
            }}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move layer up (render on top)"
          >
            ▲
          </button>
          <button
            type="button"
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: canMoveDown ? 'var(--color-border)' : 'transparent',
              color: canMoveDown ? 'var(--color-text)' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              cursor: canMoveDown ? 'pointer' : 'default',
              opacity: canMoveDown ? 1 : 0.3,
              lineHeight: 1,
            }}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move layer down (render behind)"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Opacity slider (visual only) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted" style={{ minWidth: '52px' }}>
          Opacity {(opacity * 100).toFixed(0)}%
        </span>
        <input
          type="range" min="0" max="100"
          value={opacity * 100}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          className="flex-1" style={{ accentColor: 'var(--color-text-muted)' }}
        />
      </div>

      {/* Toggle buttons — independent, not mutually exclusive */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-md"
          style={{
            background: rule.crop.enabled ? color : 'var(--color-bg)',
            color: rule.crop.enabled ? '#000' : 'var(--color-text-secondary)',
            border: `1px solid ${rule.crop.enabled ? color : 'var(--color-border)'}`,
            fontWeight: rule.crop.enabled ? 600 : 400,
            cursor: 'pointer',
          }}
          onClick={() => onChange({ ...rule, crop: { ...rule.crop, enabled: !rule.crop.enabled } })}
        >
          Crop
        </button>

        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-md"
          style={{
            background: rule.under.enabled ? color : 'var(--color-bg)',
            color: rule.under.enabled ? '#000' : 'var(--color-text-secondary)',
            border: `1px solid ${rule.under.enabled ? color : 'var(--color-border)'}`,
            fontWeight: rule.under.enabled ? 600 : 400,
            cursor: 'pointer',
            borderStyle: rule.under.enabled ? 'solid' : 'dashed',
          }}
          onClick={() => onChange({ ...rule, under: { ...rule.under, enabled: !rule.under.enabled } })}
        >
          Under suit
        </button>

        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-md"
          style={{
            background: rule.hidden ? '#ef4444' : 'var(--color-bg)',
            color: rule.hidden ? '#fff' : 'var(--color-text-secondary)',
            border: `1px solid ${rule.hidden ? '#ef4444' : 'var(--color-border)'}`,
            fontWeight: rule.hidden ? 600 : 400,
            cursor: 'pointer',
          }}
          onClick={() => onChange({ ...rule, hidden: !rule.hidden })}
        >
          Hidden
        </button>
      </div>

      {rule.crop.enabled && !rule.hidden && (
        <ClipControls
          label="Crop line"
          subRule={rule.crop}
          onChange={(r) => onChange({ ...rule, crop: r as CropRule })}
          color={color}
          actionWord="cropped"
        />
      )}

      {rule.under.enabled && !rule.hidden && (
        <ClipControls
          label="Under suit line"
          subRule={rule.under}
          onChange={(r) => onChange({ ...rule, under: r as UnderSuitRule })}
          color={color + 'aa'}
          actionWord="under suit"
        />
      )}

      {rule.hidden && (
        <p className="text-xs text-muted">
          Entire layer is completely hidden (not rendered).
        </p>
      )}

      {hasActiveRule && (
        <input
          type="text"
          className="input text-xs"
          placeholder="Add a note..."
          value={rule.note}
          onChange={(e) => onChange({ ...rule, note: e.target.value })}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function RuleBuilder() {
  const { traitsByLayer, loading } = useTraitLoader();

  const [selectedTraitIds, setSelectedTraitIds] = useState<Record<string, string>>({});
  const [selectedPaths, setSelectedPaths] = useState<Record<string, string>>({});
  const [g2Selections, setG2Selections] = useState<G2Selections>({});
  const [rules, setRules] = useState<Record<string, LayerRule>>({});
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({});
  const [zOverrides, setZOverrides] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [computedLayers, setComputedLayers] = useState<RenderLayer[]>([]);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [ruleDescription, setRuleDescription] = useState('');
  const [copied, setCopied] = useState(false);

  // Layers that have a selection and can be configured
  const editableLayers = useMemo(() => {
    return RENDER_ORDER.filter(
      (l) => selectedPaths[l] && selectedPaths[l] !== '' && !SKIP_IN_EDITOR.has(l)
    );
  }, [selectedPaths]);

  // Effective z-index for a layer (override or default)
  const getEffectiveZ = useCallback((layer: string): number => {
    return zOverrides[layer] ?? LAYER_Z_INDEX[layer] ?? 0;
  }, [zOverrides]);

  // Layers sorted by effective z-index descending (topmost first in the card list)
  const sortedEditableLayers = useMemo(() => {
    return [...editableLayers].sort((a, b) => getEffectiveZ(b) - getEffectiveZ(a));
  }, [editableLayers, getEffectiveZ]);

  // Swap z-indices of two layers
  const swapZ = useCallback((layerA: string, layerB: string) => {
    const zA = getEffectiveZ(layerA);
    const zB = getEffectiveZ(layerB);
    setZOverrides((prev) => ({ ...prev, [layerA]: zB, [layerB]: zA }));
    setExportJson(null);
  }, [getEffectiveZ]);

  // Select a trait
  const handleSelect = useCallback((layer: string, traitId: string, path: string, trait: UnifiedTrait | null) => {
    setSelectedTraitIds((prev) => ({ ...prev, [layer]: traitId }));
    setSelectedPaths((prev) => ({ ...prev, [layer]: path }));
    setG2Selections((prev) => {
      const next = { ...prev };
      if (!trait || trait.source === 'g1') {
        delete next[layer as UILayerName];
      } else {
        const g2Category = trait.id.split('_')[0] || layer;
        const defaultColors: Record<string, string> = { ...(G2_DEFAULT_COLORS[trait.id] || {}) };
        if (Object.keys(defaultColors).length === 0 && trait.defaultColor) {
          defaultColors['fill'] = trait.defaultColor;
        }
        if (Object.keys(defaultColors).length === 0 && trait.defaultColors) {
          trait.defaultColors.forEach((c, i) => { defaultColors[`fill${i}`] = c; });
        }
        next[layer as UILayerName] = { traitId: trait.id, g2Category, colors: defaultColors };
      }
      return next;
    });
    setExportJson(null);
  }, []);

  // Update rule for a layer
  const handleRuleChange = useCallback((layer: string, rule: LayerRule) => {
    setRules((prev) => ({ ...prev, [layer]: rule }));
    setExportJson(null);
  }, []);

  // Render preview
  useEffect(() => {
    let cancelled = false;
    const sel = selectedPaths as SelectedLayers;
    const baseLayers = buildRenderLayers(sel);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComputedLayers(baseLayers);

    const activeOpacities: Record<string, number> = {};
    for (const [k, v] of Object.entries(layerOpacities)) {
      if (v < 1) activeOpacities[k] = v;
    }

    // Build clip overrides from active rules
    const clipOverrides: Record<string, LayerRenderOverride> = {};
    for (const [layer, r] of Object.entries(rules)) {
      const ov: LayerRenderOverride = {};
      if (r.hidden) ov.hidden = true;
      if (r.crop.enabled) {
        const crop: NonNullable<LayerRenderOverride['crop']> = {};
        if (r.crop.x.enabled) crop.x = { clip: r.crop.x.clip, side: r.crop.x.side };
        if (r.crop.y.enabled) crop.y = { clip: r.crop.y.clip, side: r.crop.y.side };
        if (crop.x || crop.y) ov.crop = crop;
      }
      if (r.under.enabled) {
        const under: NonNullable<LayerRenderOverride['underSuit']> = {};
        if (r.under.x.enabled) under.x = { clip: r.under.x.clip, side: r.under.x.side };
        if (r.under.y.enabled) under.y = { clip: r.under.y.clip, side: r.under.y.side };
        if (under.x || under.y) ov.underSuit = under;
      }
      if (zOverrides[layer] !== undefined) ov.zIndex = zOverrides[layer];
      if (ov.hidden || ov.crop || ov.underSuit || ov.zIndex !== undefined) {
        clipOverrides[layer] = ov;
      }
    }

    // Also pass z-index overrides for layers without other rules
    for (const layer of editableLayers) {
      if (zOverrides[layer] !== undefined && !clipOverrides[layer]) {
        clipOverrides[layer] = { zIndex: zOverrides[layer] };
      }
    }

    renderToCanvas(sel, {
      size: CANVAS_SIZE,
      includeBackground: true,
      g2Selections: Object.keys(g2Selections).length > 0 ? g2Selections : undefined,
      layerOpacities: Object.keys(activeOpacities).length > 0 ? activeOpacities : undefined,
      layerClipOverrides: Object.keys(clipOverrides).length > 0 ? clipOverrides : undefined,
    })
      .then((result) => { if (!cancelled) setPreviewUrl(result.dataUrl); })
      .catch(() => { if (!cancelled) setPreviewUrl(null); });

    return () => { cancelled = true; };
  }, [selectedPaths, g2Selections, layerOpacities, rules, zOverrides, editableLayers]);

  // All layers that have any line-based rule
  const lineLayers = useMemo(() => {
    return editableLayers.filter((l) => {
      const r = rules[l];
      if (!r) return false;
      return ((r.crop.enabled && (r.crop.x.enabled || r.crop.y.enabled)) ||
              (r.under.enabled && (r.under.x.enabled || r.under.y.enabled))) && !r.hidden;
    });
  }, [editableLayers, rules]);

  // Export
  const handleExport = useCallback(() => {
    const conditions: ExportedRule['conditions'] = {};
    for (const layer of RENDER_ORDER) {
      const traitId = selectedTraitIds[layer];
      const path = selectedPaths[layer];
      if (traitId && path) {
        const trait = (traitsByLayer[layer] || []).find((t) => t.id === traitId);
        conditions[layer] = { traitId, traitName: trait?.name || traitId, path };
      }
    }

    const layerRules: ExportedRule['layerRules'] = {};
    for (const [layer, r] of Object.entries(rules)) {
      if (!r.crop.enabled && !r.under.enabled && !r.hidden && zOverrides[layer] === undefined) continue;
      const entry: ExportedRule['layerRules'][string] = {};
      if (r.hidden) entry.hidden = true;
      if (r.crop.enabled) {
        const crop: NonNullable<ExportedRule['layerRules'][string]['crop']> = {};
        if (r.crop.x.enabled) crop.x = { clip: r.crop.x.clip, side: r.crop.x.side };
        if (r.crop.y.enabled) crop.y = { clip: r.crop.y.clip, side: r.crop.y.side };
        if (crop.x || crop.y) entry.crop = crop;
      }
      if (r.under.enabled) {
        const under: NonNullable<ExportedRule['layerRules'][string]['underSuit']> = {};
        if (r.under.x.enabled) under.x = { clip: r.under.x.clip, side: r.under.x.side };
        if (r.under.y.enabled) under.y = { clip: r.under.y.clip, side: r.under.y.side };
        if (under.x || under.y) entry.underSuit = under;
      }
      if (zOverrides[layer] !== undefined) entry.zIndex = zOverrides[layer];
      if (r.note) entry.note = r.note;
      layerRules[layer] = entry;
    }

    const computed = computedLayers.map((l) => {
      const entry: ExportedRule['computedLayers'][number] = { layerName: l.layerName, zIndex: l.zIndex };
      if (l.clipLeftPercent) entry.clip = `clipLeft:${l.clipLeftPercent}`;
      if (l.clipRightPercent) entry.clip = `clipRight:${l.clipRightPercent}`;
      if (l.clipRightHalf) entry.clip = 'clipRightHalf';
      if (l.clipPolygon) entry.clip = 'polygon';
      if (l.clipTopPercent) entry.clip = `clipTop:${l.clipTopPercent}`;
      return entry;
    });

    const rule: ExportedRule = {
      id: `rule-${Date.now()}`,
      description: ruleDescription || 'No description',
      timestamp: new Date().toISOString(),
      conditions,
      layerRules,
      computedLayers: computed,
    };
    const json = JSON.stringify(rule, null, 2);
    setExportJson(json);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedTraitIds, selectedPaths, rules, zOverrides, computedLayers, traitsByLayer, ruleDescription]);

  const handleCopy = useCallback(() => {
    if (exportJson) {
      navigator.clipboard.writeText(exportJson).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [exportJson]);

  const handleClear = useCallback(() => {
    setSelectedTraitIds({});
    setSelectedPaths({});
    setG2Selections({});
    setRules({});
    setLayerOpacities({});
    setZOverrides({});
    setPreviewUrl(null);
    setComputedLayers([]);
    setExportJson(null);
    setRuleDescription('');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p>Loading traits...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          Layer Rule Builder
        </h1>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary text-sm" onClick={handleClear}>
            Clear all
          </button>
          <button type="button" className="btn btn-primary text-sm" onClick={handleExport}>
            {copied ? 'Copied to clipboard!' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* Description */}
      <input
        type="text"
        className="input text-sm"
        placeholder="Describe the rule, e.g. 'Bandana + 3D glasses + Gopher suit: left 35% of mask and eyes under suit'"
        value={ruleDescription}
        onChange={(e) => setRuleDescription(e.target.value)}
      />

      {/* Main layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '220px 1fr 300px' }}>
        {/* LEFT: Trait selectors */}
        <div className="flex flex-col gap-2">
          {UI_ORDER.map((layer) => (
            <LayerDropdown
              key={layer}
              layer={layer}
              traits={traitsByLayer[layer] || []}
              selectedTraitId={selectedTraitIds[layer] || ''}
              onSelect={(traitId, path, trait) => handleSelect(layer, traitId, path, trait)}
            />
          ))}
        </div>

        {/* CENTER: Canvas */}
        <div className="flex flex-col gap-3 items-center">
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
            {previewUrl && (
              <img src={previewUrl} alt="Preview" width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ display: 'block' }} />
            )}

            {/* Drag lines — up to 4 per layer: crop X, crop Y, under X, under Y */}
            {lineLayers.map((layerName) => {
              const rule = rules[layerName] || DEFAULT_RULE;
              const color = LAYER_COLORS[layerName] || '#ff6b00';
              return (
                <span key={layerName}>
                  {rule.crop.enabled && rule.crop.x.enabled && (
                    <DragLine
                      canvasSize={CANVAS_SIZE} axis="x"
                      percent={rule.crop.x.clip}
                      onChange={(p) => handleRuleChange(layerName, { ...rule, crop: { ...rule.crop, x: { ...rule.crop.x, clip: p } } })}
                      color={color}
                      label={`${layerName} crop`}
                    />
                  )}
                  {rule.crop.enabled && rule.crop.y.enabled && (
                    <DragLine
                      canvasSize={CANVAS_SIZE} axis="y"
                      percent={rule.crop.y.clip}
                      onChange={(p) => handleRuleChange(layerName, { ...rule, crop: { ...rule.crop, y: { ...rule.crop.y, clip: p } } })}
                      color={color}
                      label={`${layerName} crop`}
                    />
                  )}
                  {rule.under.enabled && rule.under.x.enabled && (
                    <DragLine
                      canvasSize={CANVAS_SIZE} axis="x"
                      percent={rule.under.x.clip}
                      onChange={(p) => handleRuleChange(layerName, { ...rule, under: { ...rule.under, x: { ...rule.under.x, clip: p } } })}
                      color={color}
                      label={`${layerName} under`}
                      dashed
                    />
                  )}
                  {rule.under.enabled && rule.under.y.enabled && (
                    <DragLine
                      canvasSize={CANVAS_SIZE} axis="y"
                      percent={rule.under.y.clip}
                      onChange={(p) => handleRuleChange(layerName, { ...rule, under: { ...rule.under, y: { ...rule.under.y, clip: p } } })}
                      color={color}
                      label={`${layerName} under`}
                      dashed
                    />
                  )}
                </span>
              );
            })}
          </div>

          {/* Layer stack info */}
          {computedLayers.length > 0 && (
            <div
              className="w-full p-2 rounded-lg text-xs font-mono text-muted"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              {computedLayers.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span style={{ minWidth: '28px' }}>{l.zIndex}</span>
                  <span>{l.layerName}</span>
                  {l.clipLeftPercent ? <span>L{(l.clipLeftPercent * 100).toFixed(0)}%</span> : null}
                  {l.clipRightPercent ? <span>R{(l.clipRightPercent * 100).toFixed(0)}%</span> : null}
                  {l.clipRightHalf ? <span>R50%</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Layer rules (sorted top-to-bottom = highest z-index first) */}
        <div className="flex flex-col gap-2" style={{ maxHeight: '700px', overflowY: 'auto' }}>
          <p className="text-xs text-muted">
            Top = rendered on top. Use ▲▼ to reorder.
          </p>
          {sortedEditableLayers.length === 0 ? (
            <p className="text-xs p-3 text-muted">
              Select traits on the left to see layer rules here.
            </p>
          ) : (
            sortedEditableLayers.map((layer, idx) => {
              const rule = rules[layer] || DEFAULT_RULE;
              const color = LAYER_COLORS[layer] || '#ff6b00';
              return (
                <LayerCard
                  key={layer}
                  layerName={layer}
                  rule={rule}
                  onChange={(r) => handleRuleChange(layer, r)}
                  color={color}
                  opacity={layerOpacities[layer] ?? 1}
                  onOpacityChange={(v) => setLayerOpacities((prev) => ({ ...prev, [layer]: v }))}
                  effectiveZ={getEffectiveZ(layer)}
                  onMoveUp={() => {
                    if (idx > 0) swapZ(layer, sortedEditableLayers[idx - 1]);
                  }}
                  onMoveDown={() => {
                    if (idx < sortedEditableLayers.length - 1) swapZ(layer, sortedEditableLayers[idx + 1]);
                  }}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < sortedEditableLayers.length - 1}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Export output */}
      {exportJson && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Exported JSON
            </h2>
            <button type="button" className="btn btn-secondary text-xs" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <pre
            className="p-4 rounded-lg text-xs overflow-auto"
            style={{
              background: '#0d0d15',
              border: '1px solid var(--color-border)',
              maxHeight: '300px',
              fontFamily: 'ui-monospace, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {exportJson}
          </pre>
        </div>
      )}
    </div>
  );
}
