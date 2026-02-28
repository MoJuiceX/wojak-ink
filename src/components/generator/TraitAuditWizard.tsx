/**
 * Trait Audit Wizard
 *
 * QA tool that steps through problematic trait combinations.
 * Activate via /generator?audit=1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useGenerator } from '@/contexts/GeneratorContext';
import type { UILayerName } from '@/lib/layerRegistry';
import type { UnifiedTrait } from '@/services/generatorService';
import { LAYER_BASE } from '@/config/layerAssetBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TraitSpec {
  layer: UILayerName;
  /** G1 full asset path, or G2 trait ID */
  id: string;
  mode: 'g1' | 'g2';
}

interface AuditTestCase {
  id: string;
  category: string;
  title: string;
  /** What the tester should look for */
  lookFor: string;
  /** Traits to auto-select (applied sequentially) */
  traits: TraitSpec[];
}

type Verdict = 'works' | 'fail';

// ---------------------------------------------------------------------------
// Test case data
// ---------------------------------------------------------------------------

const AUDIT_TEST_CASES: AuditTestCase[] = [
  // ---- Category 1: Copium Mask Rules ----
  {
    id: 'copium-astronaut',
    category: 'Copium Mask Rules',
    title: 'Copium Mask + Astronaut',
    lookFor:
      'Astronaut is selected first, then Copium Mask. These should be mutually exclusive. If BOTH are visible, the rule is broken. One should be cleared or blocked.',
    traits: [
      { layer: 'Clothes', id: 'Clothes_Astronaut', mode: 'g2' },
      { layer: 'Mask', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Copium-Mask.png`, mode: 'g1' },
    ],
  },
  {
    id: 'copium-pizza-mouth',
    category: 'Copium Mask Rules',
    title: 'Copium Mask + Pizza Mouth',
    lookFor:
      'Pizza is selected first, then Copium Mask. Copium should force the mouth to Numb. If Pizza mouth is still visible, the rule is broken.',
    traits: [
      { layer: 'MouthBase', id: `${LAYER_BASE}/MOUTH/MOUTH_Pizza.png`, mode: 'g1' },
      { layer: 'Mask', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Copium-Mask.png`, mode: 'g1' },
    ],
  },

  // ---- Category 2: Clown Head + Mouth ----
  {
    id: 'clown-cig',
    category: 'Clown Head + Mouth',
    title: 'Clown + Cig',
    lookFor: 'Does the cigarette clip with the Clown red nose? Check the mouth/nose area for visual overlap.',
    traits: [
      { layer: 'Head', id: 'Head_Clown', mode: 'g2' },
      { layer: 'MouthItem', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Cig_.png`, mode: 'g1' },
    ],
  },
  {
    id: 'clown-joint',
    category: 'Clown Head + Mouth',
    title: 'Clown + Joint',
    lookFor: 'Does the joint clip with the Clown red nose? Check for visual overlap in the mouth area.',
    traits: [
      { layer: 'Head', id: 'Head_Clown', mode: 'g2' },
      { layer: 'MouthItem', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Joint_.png`, mode: 'g1' },
    ],
  },
  {
    id: 'clown-pipe',
    category: 'Clown Head + Mouth',
    title: 'Clown + Pipe',
    lookFor: 'Does the pipe overlap badly with the Clown head? Check the left side of the face.',
    traits: [
      { layer: 'Head', id: 'Head_Clown', mode: 'g2' },
      { layer: 'MouthBase', id: `${LAYER_BASE}/MOUTH/MOUTH_Pipe.png`, mode: 'g1' },
    ],
  },
  {
    id: 'clown-pizza',
    category: 'Clown Head + Mouth',
    title: 'Clown + Pizza',
    lookFor: 'Does the pizza overlap with Clown hair or nose? Check for z-order issues.',
    traits: [
      { layer: 'Head', id: 'Head_Clown', mode: 'g2' },
      { layer: 'MouthBase', id: `${LAYER_BASE}/MOUTH/MOUTH_Pizza.png`, mode: 'g1' },
    ],
  },

  // ---- Category 3: Centurion + Mouth Items ----
  {
    id: 'centurion-cig',
    category: 'Centurion + Mouth',
    title: 'Centurion + Cig',
    lookFor: 'The Cig should render on top of the Centurion cheek guards. Check that it is visible and not hidden behind the helmet.',
    traits: [
      { layer: 'Head', id: 'Head_Centurion', mode: 'g2' },
      { layer: 'MouthItem', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Cig_.png`, mode: 'g1' },
    ],
  },
  {
    id: 'centurion-pipe',
    category: 'Centurion + Mouth',
    title: 'Centurion + Pipe',
    lookFor: 'The Pipe should render correctly with the Centurion helmet. Check for clipping at the left cheek guard area.',
    traits: [
      { layer: 'Head', id: 'Head_Centurion', mode: 'g2' },
      { layer: 'MouthBase', id: `${LAYER_BASE}/MOUTH/MOUTH_Pipe.png`, mode: 'g1' },
    ],
  },
  {
    id: 'centurion-joint',
    category: 'Centurion + Mouth',
    title: 'Centurion + Joint',
    lookFor: 'The Joint should render on top of the Centurion helmet. Check for visibility issues around the cheek guards.',
    traits: [
      { layer: 'Head', id: 'Head_Centurion', mode: 'g2' },
      { layer: 'MouthItem', id: `${LAYER_BASE}/MOUTH/EXTRA_MOUTH_Joint_.png`, mode: 'g1' },
    ],
  },

  // ---- Category 4: VR + Night Vision ----
  {
    id: 'vr-night-vision',
    category: 'VR + Night Vision',
    title: 'VR Headset then Night Vision',
    lookFor:
      'VR Headset is selected. Both VR and Night Vision are on the Eyes layer. Try manually selecting Night Vision in the Eyes grid — it should cleanly replace VR Headset (not stack). Check the preview updates correctly.',
    traits: [{ layer: 'Eyes', id: 'Face-wear_VR-headset', mode: 'g2' }],
  },

  // ---- Category 5: Pirate Hat + Eyes ----
  {
    id: 'pirate-ninja',
    category: 'Pirate Hat + Eyes',
    title: 'Pirate Hat + Ninja Turtle Mask',
    lookFor:
      'Check the right side of the face where Pirate Hat brim overlaps the Ninja Turtle mask. There is a 22% clip applied. Is the mask partially hidden? Does it look acceptable?',
    traits: [
      { layer: 'Head', id: `${LAYER_BASE}/HEAD/HEAD_Pirate-Hat_.png`, mode: 'g1' },
      { layer: 'Eyes', id: 'Face-wear_Ninja-Turtle-Mask', mode: 'g2' },
    ],
  },
  {
    id: 'pirate-vr',
    category: 'Pirate Hat + Eyes',
    title: 'Pirate Hat + VR Headset',
    lookFor: 'Check if VR Headset is partially covered by the Pirate Hat brim. Look for z-order issues on the right eye area.',
    traits: [
      { layer: 'Head', id: `${LAYER_BASE}/HEAD/HEAD_Pirate-Hat_.png`, mode: 'g1' },
      { layer: 'Eyes', id: 'Face-wear_VR-headset', mode: 'g2' },
    ],
  },

  // ---- Category 6: Full Face Masks + Laser Eyes ----
  {
    id: 'skull-laser',
    category: 'Full Face Mask + Laser',
    title: 'Skull Mask + Laser Eyes',
    lookFor:
      'Skull Mask is selected first, then Laser Eyes. The rule should block Laser Eyes when a full-face mask is active. If both are visible, the rule is broken.',
    traits: [
      { layer: 'Mask', id: `${LAYER_BASE}/MASK/Skull_mask_orange.png`, mode: 'g1' },
      { layer: 'Eyes', id: `${LAYER_BASE}/EYE/EYE_Laser-Eyes_red.png`, mode: 'g1' },
    ],
  },
  {
    id: 'medieval-laser',
    category: 'Full Face Mask + Laser',
    title: 'MedievalBepe + Laser Eyes',
    lookFor:
      'MedievalBepe mask is selected first, then Laser Eyes. The rule should block Laser Eyes. If both are visible, the rule is broken.',
    traits: [
      { layer: 'Mask', id: `${LAYER_BASE}/MASK/MedievalBepe_cowboy.png`, mode: 'g1' },
      { layer: 'Eyes', id: `${LAYER_BASE}/EYE/EYE_Laser-Eyes_red.png`, mode: 'g1' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const STORAGE_KEY = 'wojak-audit-results';

function loadResults(): Map<string, Verdict> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Map(JSON.parse(raw) as [string, Verdict][]);
  } catch {
    /* ignore */
  }
  return new Map();
}

function saveResults(results: Map<string, Verdict>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...results]));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TraitAuditWizardProps {
  onClose: () => void;
}

export function TraitAuditWizard({ onClose }: TraitAuditWizardProps) {
  const ctx = useGenerator();
  const { isInitialized } = ctx;
  const prefersReducedMotion = useReducedMotion();

  const [isOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Map<string, Verdict>>(loadResults);
  const [isApplying, setIsApplying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Cache for G2 trait lookups so we don't fetch every navigation
  const traitCache = useRef<Map<string, UnifiedTrait | null>>(new Map());

  const currentCase = AUDIT_TEST_CASES[currentIndex];
  const total = AUDIT_TEST_CASES.length;
  const passCount = [...results.values()].filter((v) => v === 'works').length;
  const failCount = [...results.values()].filter((v) => v === 'fail').length;
  const currentVerdict = currentCase ? results.get(currentCase.id) ?? null : null;

  // Persist on change
  useEffect(() => {
    saveResults(results);
  }, [results]);

  // Resolve a G2 trait by ID
  const resolveG2Trait = useCallback(
    async (layer: UILayerName, traitId: string): Promise<UnifiedTrait | null> => {
      const cacheKey = `${layer}:${traitId}`;
      if (traitCache.current.has(cacheKey)) return traitCache.current.get(cacheKey) ?? null;

      const traits = await ctx.getUnifiedTraitsForLayer(layer);
      const found = traits.find((t) => t.id === traitId) ?? null;
      traitCache.current.set(cacheKey, found);
      return found;
    },
    [ctx],
  );

  // Apply all traits for a test case
  const applyTestCase = useCallback(
    async (testCase: AuditTestCase) => {
      if (!isInitialized) return;
      setIsApplying(true);

      try {
        // Reset to defaults
        ctx.clearAll();
        await delay(200);

        // Apply each trait sequentially
        for (const spec of testCase.traits) {
          if (spec.mode === 'g1') {
            ctx.selectLayer(spec.layer, spec.id);
          } else {
            const trait = await resolveG2Trait(spec.layer, spec.id);
            if (trait) {
              if (trait.source === 'g1' && trait.g1Path) {
                ctx.selectLayer(spec.layer, trait.g1Path);
              } else {
                ctx.selectG2Layer(spec.layer, trait);
              }
            } else {
              console.warn(`[AuditWizard] Trait not found: ${spec.id} in ${spec.layer}`);
            }
          }
          await delay(150);
        }
      } catch (err) {
        console.error('[AuditWizard] Error applying test case:', err);
      }

      setIsApplying(false);
    },
    [ctx, isInitialized, resolveG2Trait],
  );

  // Auto-apply when index changes (only after user clicks Start)
  useEffect(() => {
    if (isOpen && hasStarted && currentCase && isInitialized) {
      applyTestCase(currentCase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isOpen, hasStarted, isInitialized]);

  const recordVerdict = useCallback(
    (verdict: Verdict) => {
      if (!currentCase) return;
      setResults((prev) => {
        const next = new Map(prev);
        next.set(currentCase.id, verdict);
        return next;
      });
      // Auto-advance
      if (currentIndex < total - 1) {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentCase, currentIndex, total],
  );

  const clearResults = useCallback(() => {
    setResults(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleClose = useCallback(() => {
    handleClose();
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const verdictBg = (v: Verdict | null) =>
    v === 'works' ? 'rgba(34, 197, 94, 0.15)' : v === 'fail' ? 'var(--color-error-15)' : 'transparent';

  // Start screen before audit begins
  if (!hasStarted) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0, 0, 0, 0.85)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div
          className="rounded-2xl p-8 max-w-md w-full mx-4 text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 40px var(--color-black-50)',
          }}
        >
          <h2
            className="text-lg font-bold mb-2 text-accent"
          >
            TRAIT AUDIT WIZARD
          </h2>
          <p className="text-sm mb-4 text-secondary">
            {total} test cases across 6 categories. Each test auto-selects traits on the
            preview. Mark each as Works or Doesn't Work.
          </p>
          {results.size > 0 && (
            <p className="text-xs mb-4 text-muted">
              Previous session: {passCount} pass, {failCount} fail, {total - passCount - failCount} remaining
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary px-6 py-2"
              onClick={() => setHasStarted(true)}
            >
              Start Audit
            </button>
            <button
              type="button"
              className="btn btn-ghost px-4 py-2"
              onClick={() => handleClose()}
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            boxShadow: '0 -4px 24px var(--color-black-50)',
          }}
          initial={prefersReducedMotion ? undefined : { y: '100%', opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header — single compact row */}
          <div className="flex items-center justify-between px-4 py-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-accent">AUDIT</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full text-secondary" style={{ background: 'var(--color-white-8)' }}>{currentCase?.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-success">{passCount}P</span>
              <span className="text-[10px] text-error">{failCount}F</span>
              <span className="text-[10px] font-mono text-secondary">{currentIndex + 1}/{total}</span>
              <button type="button" className="text-[9px] px-1.5 rounded text-muted" style={{ background: 'var(--color-white-5)' }} onClick={clearResults} title="Clear all results">Reset</button>
              <button type="button" onClick={() => handleClose()} className="w-5 h-5 flex items-center justify-center rounded text-secondary" title="Close">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
          </div>

          {/* Body — compact two-row layout */}
          <div
            className="px-4 py-1.5 flex flex-col gap-1"
            style={{ background: verdictBg(currentVerdict), transition: 'background 0.3s' }}
          >
            {/* Row 1: Title + description */}
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold shrink-0 text-primary">
                {currentCase?.title}
              </span>
              {isApplying && (
                <span className="text-[9px] px-1 rounded animate-pulse text-accent" style={{ background: 'rgba(255,107,0,0.2)' }}>
                  Loading...
                </span>
              )}
              {currentVerdict && (
                <span className="text-[9px] px-1 rounded font-medium" style={{
                  background: currentVerdict === 'works' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  color: currentVerdict === 'works' ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  {currentVerdict === 'works' ? 'PASS' : 'FAIL'}
                </span>
              )}
              <span className="text-[10px] truncate text-muted">
                {currentCase?.lookFor}
              </span>
            </div>

            {/* Row 2: Navigation + Verdict + dots */}
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost text-[11px] px-2 py-1" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>Prev</button>
              <button type="button" className="text-[11px] px-3 py-1 rounded font-medium text-error" style={{ background: 'var(--color-error-15)', border: '1px solid var(--color-error-30)' }} disabled={isApplying} onClick={() => recordVerdict('fail')}>Fail</button>
              <button type="button" className="text-[11px] px-3 py-1 rounded font-medium text-success" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid var(--color-success-30)' }} disabled={isApplying} onClick={() => recordVerdict('works')}>Works</button>
              <button type="button" className="btn btn-ghost text-[11px] px-2 py-1" disabled={currentIndex === total - 1} onClick={() => setCurrentIndex((i) => i + 1)}>Next</button>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5">
                {AUDIT_TEST_CASES.map((tc, i) => {
                  const v = results.get(tc.id);
                  return (
                    <button key={tc.id} type="button" className="w-2 h-2 rounded-full" style={{
                      background: v === 'works' ? 'var(--color-success)' : v === 'fail' ? 'var(--color-error)' : i === currentIndex ? 'var(--color-primary)' : 'var(--color-white-15)',
                      border: i === currentIndex ? '1px solid var(--color-text)' : 'none',
                      cursor: 'pointer',
                    }} onClick={() => setCurrentIndex(i)} title={`${i + 1}. ${tc.title}`} />
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
