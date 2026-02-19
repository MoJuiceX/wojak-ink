/**
 * TraitNameAudit — Review wizard for generator trait names
 *
 * Loads every trait per layer, resolves its display name via TRAIT_NAME_MAP,
 * then cross-references against Phase 1 metadata values.
 *
 * Three confidence tiers (shown most-suspect first):
 *   Red    — Unmapped: no entry in TRAIT_NAME_MAP at all
 *   Yellow — Generator-only: mapped, but resolved name not in Phase 1 collection
 *   Green  — Confirmed: mapped and exists in Phase 1 metadata
 *
 * Renders in the right panel (replaces metadata preview when active).
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGenerator } from '@/contexts/GeneratorContext';
import { UI_ORDER, type UILayerName } from '@/lib/layerRegistry';
import { lookupTraitName, BACKGROUND_COLOR_NAMES } from '@/lib/traitNameMap';
import { formatDisplayLabel } from '@/lib/traitOptions';
import { COLOR_FAMILIES } from '@/components/generator/ColorPicker';
import type { UnifiedTrait } from '@/services/generatorService';

// ── Phase 1 trait values (from Wojak_Farmers_Plot metadata) ─────────────

/** Every trait value that exists in the Phase 1 collection of 4200 NFTs (179 values). */
const PHASE1_VALUES = new Set([
  // Face (6)
  'Classic', 'Rekt', 'Terminator', 'Rugged', 'Bleeding Bags', 'NPC',
  // Face Wear (18)
  'No Face Wear', 'MOG Glasses', 'Shades', 'Alpha Shades', 'Aviators',
  'Matrix Lenses', 'Clown Nose', '3D Glasses', 'Cool Glasses', 'Cyber Shades',
  'Laser Eyes', 'Wizard Glasses', 'Ninja Turtle Mask', 'Eye Patch',
  'Night Vision', 'Tyson Tattoo', 'VR Headset', 'Fake It Mask',
  // Mouth (20)
  'Numb', 'Cig', 'Screaming', 'Joint', 'Cohiba', 'Gold Teeth', 'Teeth',
  'Pizza', 'Bubble Gum', 'Neckbeard', 'Pipe', 'Smile', 'Glossed Lips',
  'Vampire Teeth', 'Stache', 'Bandana Mask', 'Copium Mask', 'Stunned',
  'Hannibal Mask', 'Sexy Lip Bite',
  // Head (40)
  'No Headgear', 'Wizard Hat', 'Super Saiyan', 'Military Beret', 'Clown',
  'Crown', 'Construction Helmet', 'Propeller Hat', 'Viking Helmet', 'Centurion',
  'Ronin Helmet', 'Field Cap', 'Cap', 'SWAT Helmet', 'Tin Foil Hat', 'Fedora',
  'Firefighter Helmet', 'Pirate Hat', 'Hard Hat', 'Super Wojak Hat',
  'Devil Horns', 'Cowboy Hat', 'Beer Hat', 'Spikes', 'Trump Wave', 'Comrade Hat',
  'Halo', 'Beanie', 'Hip Hop Hat', 'Mermaid Waves', 'Vixen Waves', 'Ponytail',
  'Power Bob', 'Twin Braids', 'Standard Cut', '2Pac Bandana', 'Tiara',
  'Soy Hair', 'Headphones', 'Piccolo Turban',
  // Clothes (36)
  'Topless', 'Suit', 'Sports Jacket', 'Chia Farmer', 'Bepe Army',
  'Born to Ride', 'Leather Jacket', 'Wizard Drip', 'Roman Drip',
  'Super Saiyan Uniform', 'Ronin', 'Ninja Turtle Fit', 'Viking Armor',
  'SWAT Gear', 'Bathrobe', 'Tee', 'Tank Top', 'Proof of Prayer', 'Drac',
  'Firefighter Uniform', 'Gopher Suit', 'Straitjacket', "God's Robe",
  'Pepe Suit', 'Goose Suit', 'Sports Bra', 'Bepe Suit', 'Pickle Suit',
  'Vintage Dress', 'El Presidente', 'Astronaut', 'Sonic Suit', 'Denim Vest',
  'Prom Dress', 'School Uniform', 'Piccolo Uniform',
  // Background (45)
  'Chia Green', '$CHIA', 'Sky Dive', 'Sky Shock Blue', 'Green Candle',
  'Neo Mint', 'Tangerine Pop', 'Moon', 'Bepe Barracks', 'Orange Grove',
  '$HOA', 'Mellow Yellow', 'Radioactive Forest', 'Hell', 'Matrix',
  'Hot Coral', '$LOVE', 'Heaven', 'Golden Hour', 'Chia Farm', '$BEPE',
  'Price Down', 'One Market', 'Pirate Ship', 'NYSE Pump', 'Price Up',
  'Route 66', 'Silicon Data Center', 'NYSE Dump', 'Moms Basement',
  'Spell Room', 'Nesting Grounds', '$PIZZA', '$NECKCOIN', 'Ronin Dojo',
  'NYSE Rug', 'White House', '$CASTER', 'Everythings Fine', 'Rome',
  '$HONK', 'Morning Routine', 'Rainforest', 'Crazy Room', 'Signal Lost',
]);

// ── Layer → Phase 1 trait_type mapping (matches MetadataPreview) ─────────

const LAYER_TO_TRAIT_TYPE: Record<string, string> = {
  Base: 'Face',
  Eyes: 'Face Wear',
  Mask: 'Face Wear',
  MouthBase: 'Mouth',
  MouthItem: 'Mouth',
  FacialHair: 'Mouth',
  Head: 'Head',
  Clothes: 'Clothes',
  Background: 'Background',
};

// ── Types ────────────────────────────────────────────────────────────────

type TraitStatus = 'unmapped' | 'generator-only' | 'confirmed';

interface ResolvedTrait {
  id: string;
  name: string;
  source: 'g1' | 'g2' | 'both';
  rawId: string;
  mappedName: string | null;
  fallbackName: string;
  status: TraitStatus;
  traitType: string;
}

// Skip Base layer — it's always "Wojak" (fixed entry)
const AUDIT_LAYERS = UI_ORDER.filter((l) => l !== 'Base');

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveRawId(trait: UnifiedTrait): string {
  // G2/both traits: use trait.name from the G2 manifest — always the clean base name
  // without color variants or category prefixes.
  if (trait.source === 'g2' || trait.source === 'both') {
    let raw = trait.name;
    // Strip any "Category_" prefix in case name was set to the full ID
    const underscoreIdx = raw.indexOf('_');
    if (underscoreIdx > 0 && underscoreIdx < raw.length - 1) {
      raw = raw.substring(underscoreIdx + 1);
    }
    return raw.replace(/[-_]/g, ' ').trim();
  }

  // G1-only: extract raw identifier directly from the g1Path filename.
  // Self-contained logic to strip ALL-CAPS layer prefix, extension, and normalize.
  if (trait.g1Path) {
    const filename = trait.g1Path.split('/').pop() || '';
    let raw = filename.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    // Strip ALL-CAPS prefix (CLOTHES_, HEAD_, BACKGROUND_, EXTRA_, etc.)
    raw = raw.replace(/^[A-Z]+_/, '');
    // Handle EXTRA_MOUTH_ → after first strip becomes MOUTH_
    raw = raw.replace(/^MOUTH_/i, '');
    // Strip Base-Wojak prefix from base layer files
    raw = raw.replace(/^Base-Wojak[_\s]*/i, '');
    // Normalize separators
    raw = raw.replace(/[-_]/g, ' ');
    // Strip "Mouth" prefix leftover from EXTRA_MOUTH paths
    raw = raw.replace(/^Extra\s*Mouth\s*/i, '');
    raw = raw.replace(/^Mouth\s*/i, '');
    return raw.trim();
  }

  // Fallback: use trait.name directly
  return trait.name.replace(/[-_]/g, ' ').trim();
}

function getStatus(mapped: string | null): TraitStatus {
  if (!mapped) return 'unmapped';
  if (!PHASE1_VALUES.has(mapped)) return 'generator-only';
  return 'confirmed';
}

const STATUS_ORDER: Record<TraitStatus, number> = {
  'unmapped': 0,
  'generator-only': 1,
  'confirmed': 2,
};

const STATUS_LABEL: Record<TraitStatus, string> = {
  'unmapped': 'No map entry',
  'generator-only': 'Generator only',
  'confirmed': 'Phase 1',
};

const STATUS_COLOR: Record<TraitStatus, string> = {
  'unmapped': '#ef4444',
  'generator-only': '#fbbf24',
  'confirmed': '#22c55e',
};

const STATUS_BG: Record<TraitStatus, string> = {
  'unmapped': 'rgba(239,68,68,0.12)',
  'generator-only': 'rgba(251,191,36,0.12)',
  'confirmed': 'rgba(34,197,94,0.08)',
};

const STATUS_BORDER: Record<TraitStatus, string> = {
  'unmapped': 'rgba(239,68,68,0.4)',
  'generator-only': 'rgba(251,191,36,0.3)',
  'confirmed': 'transparent',
};

type FilterMode = 'needs-review' | 'all';

// ── Component ────────────────────────────────────────────────────────────

interface TraitNameAuditProps {
  onBack: () => void;
}

export function TraitNameAudit({ onBack }: TraitNameAuditProps) {
  const ctx = useGenerator();
  const [activeLayer, setActiveLayer] = useState<UILayerName>(AUDIT_LAYERS[0]);
  const [traitsByLayer, setTraitsByLayer] = useState<Record<string, ResolvedTrait[]>>({});
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('needs-review');
  const loadedRef = useRef<Set<string>>(new Set());

  const loadLayer = useCallback(async (layer: UILayerName) => {
    if (loadedRef.current.has(layer)) return;
    loadedRef.current.add(layer);
    setLoading(true);
    try {
      const traits = await ctx.getUnifiedTraitsForLayer(layer);
      const traitType = LAYER_TO_TRAIT_TYPE[layer] || layer;
      // Filter out synthetic entries (e.g. __solid__ for color picker backgrounds)
      const realTraits = traits.filter((t) => !t.id.includes('__solid__') && !t.g1Path?.includes('__solid__'));
      const resolved: ResolvedTrait[] = realTraits.map((t) => {
        const rawId = resolveRawId(t);
        const mapped = lookupTraitName(rawId);
        return {
          id: t.id,
          name: t.name,
          source: t.source,
          rawId,
          mappedName: mapped,
          fallbackName: formatDisplayLabel(rawId),
          status: getStatus(mapped),
          traitType,
        };
      });
      // Sort: unmapped first, then generator-only, then confirmed; within tier alphabetical
      resolved.sort((a, b) => {
        const tierDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (tierDiff !== 0) return tierDiff;
        return (a.mappedName || a.fallbackName).localeCompare(b.mappedName || b.fallbackName);
      });
      setTraitsByLayer((prev) => ({ ...prev, [layer]: resolved }));
    } finally {
      setLoading(false);
    }
  }, [ctx]);

  useEffect(() => {
    loadLayer(activeLayer);
  }, [activeLayer, loadLayer]);

  // Eagerly load all layers for global stats
  useEffect(() => {
    for (const layer of AUDIT_LAYERS) {
      loadLayer(layer);
    }
  }, [loadLayer]);

  const currentTraits = traitsByLayer[activeLayer] || [];
  const displayTraits = filterMode === 'needs-review'
    ? currentTraits.filter((t) => t.status !== 'confirmed')
    : currentTraits;

  // Global stats across all layers
  const globalStats = useMemo(() => {
    let total = 0;
    let unmapped = 0;
    let generatorOnly = 0;
    let confirmed = 0;
    for (const traits of Object.values(traitsByLayer)) {
      for (const t of traits) {
        total++;
        if (t.status === 'unmapped') unmapped++;
        else if (t.status === 'generator-only') generatorOnly++;
        else confirmed++;
      }
    }
    return { total, unmapped, generatorOnly, confirmed, needsReview: unmapped + generatorOnly };
  }, [traitsByLayer]);

  // Per-layer issue counts for tab badges
  const layerIssueCounts = useMemo(() => {
    const counts: Record<string, { unmapped: number; generatorOnly: number }> = {};
    for (const [layer, traits] of Object.entries(traitsByLayer)) {
      counts[layer] = {
        unmapped: traits.filter((t) => t.status === 'unmapped').length,
        generatorOnly: traits.filter((t) => t.status === 'generator-only').length,
      };
    }
    return counts;
  }, [traitsByLayer]);

  const layerStats = useMemo(() => {
    const traits = traitsByLayer[activeLayer] || [];
    return {
      total: traits.length,
      unmapped: traits.filter((t) => t.status === 'unmapped').length,
      generatorOnly: traits.filter((t) => t.status === 'generator-only').length,
      confirmed: traits.filter((t) => t.status === 'confirmed').length,
    };
  }, [traitsByLayer, activeLayer]);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-secondary">
            Review Wizard
          </span>
          {globalStats.total > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: globalStats.needsReview === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: globalStats.needsReview === 0 ? 'var(--color-success)' : 'var(--color-error)',
                fontSize: '10px',
              }}
            >
              {globalStats.needsReview > 0
                ? `${globalStats.needsReview} to review`
                : 'all confirmed'}
            </span>
          )}
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded text-muted"
          style={{ background: 'rgba(255,255,255,0.05)' }}
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {/* Summary bar */}
      {globalStats.total > 0 && (
        <div className="flex gap-3 px-1" style={{ fontSize: '10px' }}>
          <span style={{ color: STATUS_COLOR['unmapped'] }}>
            {globalStats.unmapped} unmapped
          </span>
          <span style={{ color: STATUS_COLOR['generator-only'] }}>
            {globalStats.generatorOnly} gen-only
          </span>
          <span style={{ color: STATUS_COLOR['confirmed'] }}>
            {globalStats.confirmed} confirmed
          </span>
        </div>
      )}

      {/* Layer tabs */}
      <div className="flex flex-wrap gap-1 px-1">
        {AUDIT_LAYERS.map((layer) => {
          const issues = layerIssueCounts[layer];
          const hasUnmapped = issues && issues.unmapped > 0;
          const hasGenOnly = issues && issues.generatorOnly > 0;
          const isActive = layer === activeLayer;
          const issueCount = (issues?.unmapped || 0) + (issues?.generatorOnly || 0);
          return (
            <button
              key={layer}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: isActive ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: isActive ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                border: isActive
                  ? '1px solid rgba(0,212,255,0.3)'
                  : hasUnmapped
                    ? `1px solid ${STATUS_BORDER['unmapped']}`
                    : hasGenOnly
                      ? `1px solid ${STATUS_BORDER['generator-only']}`
                      : '1px solid transparent',
                fontSize: '10px',
              }}
              onClick={() => setActiveLayer(layer)}
            >
              {layer}
              {issueCount > 0 && (
                <span
                  style={{
                    color: hasUnmapped ? STATUS_COLOR['unmapped'] : STATUS_COLOR['generator-only'],
                    marginLeft: '3px',
                  }}
                >
                  {issueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter toggle + layer stats */}
      <div className="flex items-center justify-between px-1">
        <span className="text-muted" style={{ fontSize: '10px' }}>
          {layerStats.total} traits
          {layerStats.unmapped > 0 && (
            <span style={{ color: STATUS_COLOR['unmapped'] }}> / {layerStats.unmapped} unmapped</span>
          )}
          {layerStats.generatorOnly > 0 && (
            <span style={{ color: STATUS_COLOR['generator-only'] }}> / {layerStats.generatorOnly} gen-only</span>
          )}
        </span>
        <button
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: filterMode === 'needs-review' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            color: filterMode === 'needs-review' ? '#ef4444' : 'var(--color-text-muted)',
            fontSize: '10px',
          }}
          onClick={() => setFilterMode((m) => m === 'needs-review' ? 'all' : 'needs-review')}
        >
          {filterMode === 'needs-review' ? 'Show All' : 'Issues Only'}
        </button>
      </div>

      {/* Trait list */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="text-xs p-2 text-muted">
            Loading...
          </div>
        ) : displayTraits.length === 0 && activeLayer !== 'Background' ? (
          <div className="text-xs p-2 text-muted">
            {filterMode === 'needs-review' ? 'All traits confirmed for this layer!' : 'No traits found'}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Background color names audit (only on Background tab) */}
            {activeLayer === 'Background' && (
              <>
                <div
                  className="px-2 py-1.5 rounded"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  <span className="text-cyan" style={{ fontSize: '10px', fontWeight: 600 }}>
                    Solid Color Names ({Object.keys(BACKGROUND_COLOR_NAMES).length} colors)
                  </span>
                </div>
                {/* Default background color */}
                <div className="flex flex-col gap-0.5">
                  <span
                    className="px-2 text-muted"
                    style={{ fontSize: '9px', fontWeight: 600, marginTop: '4px' }}
                  >
                    Default
                  </span>
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid transparent' }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        backgroundColor: '#1a1a2e',
                        border: '1px solid rgba(255,255,255,0.15)',
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-primary" style={{ fontSize: '11px', fontWeight: 600, flex: 1 }}>
                      {BACKGROUND_COLOR_NAMES['#1A1A2E']}
                    </span>
                    <span className="text-muted" style={{ fontSize: '9px', fontFamily: 'monospace' }}>
                      #1A1A2E
                    </span>
                  </div>
                </div>
                {COLOR_FAMILIES.map((family) => (
                  <div key={family.label} className="flex flex-col gap-0.5">
                    <span
                      className="px-2 text-muted"
                      style={{ fontSize: '9px', fontWeight: 600, marginTop: '4px' }}
                    >
                      {family.label}
                    </span>
                    {family.colors.map((hex) => {
                      const normHex = hex.toUpperCase();
                      const name = BACKGROUND_COLOR_NAMES[normHex];
                      const isMapped = !!name;
                      return (
                        <div
                          key={hex}
                          className="flex items-center gap-2 px-2 py-1 rounded"
                          style={{
                            background: isMapped ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.12)',
                            border: isMapped ? '1px solid transparent' : '1px solid rgba(239,68,68,0.4)',
                          }}
                        >
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              backgroundColor: hex,
                              border: normHex === '#FFFFFF' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.2)',
                              flexShrink: 0,
                            }}
                          />
                          <span className="text-primary" style={{ fontSize: '11px', fontWeight: 600, flex: 1 }}>
                            {name || '???'}
                          </span>
                          <span
                            className="text-muted" style={{ fontSize: '9px', fontFamily: 'monospace' }}
                          >
                            {normHex}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {/* Separator before scene backgrounds */}
                {displayTraits.length > 0 && (
                  <div
                    className="px-2 py-1.5 rounded"
                    style={{
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      marginTop: '6px',
                    }}
                  >
                    <span className="text-cyan" style={{ fontSize: '10px', fontWeight: 600 }}>
                      Scene Backgrounds ({displayTraits.length} images)
                    </span>
                  </div>
                )}
              </>
            )}

            {displayTraits.map((trait) => (
              <div
                key={trait.id}
                className="flex flex-col px-2 py-1.5 rounded"
                style={{
                  background: STATUS_BG[trait.status],
                  border: `1px solid ${STATUS_BORDER[trait.status]}`,
                }}
              >
                {/* Row 1: display name + status badge */}
                <div className="flex items-center justify-between">
                  <span style={{
                    color: trait.status === 'confirmed' ? 'var(--color-text)' : STATUS_COLOR[trait.status],
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {trait.mappedName || trait.fallbackName}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: '9px',
                      color: STATUS_COLOR[trait.status],
                      background: STATUS_BG[trait.status],
                    }}
                  >
                    {STATUS_LABEL[trait.status]}
                  </span>
                </div>

                {/* Row 2: trait_type + source */}
                <div className="flex items-center justify-between" style={{ marginTop: '2px' }}>
                  <span className="text-cyan" style={{ fontSize: '10px' }}>
                    {trait.traitType}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      color: trait.source === 'g2'
                        ? 'var(--color-primary)'
                        : trait.source === 'both'
                          ? 'var(--color-success)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    {trait.source}
                  </span>
                </div>

                {/* Row 3: raw key for debugging */}
                <span
                  className="truncate text-muted"
                  style={{ fontSize: '9px', fontFamily: 'monospace' }}
                  title={trait.rawId}
                >
                  key: {trait.rawId.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
