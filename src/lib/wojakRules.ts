/**
 * Wojak Generator Rules Engine — Declarative Version
 *
 * Enforces valid layer combinations and auto-corrects invalid states.
 * Rules are defined in src/data/rules.json and evaluated by ruleEvaluator.ts.
 *
 * This file is now a thin wrapper that:
 * 1. Loads the declarative rules from JSON
 * 2. Validates them at startup
 * 3. Delegates to evaluateRules() for all rule evaluation
 *
 * The public API (getDisabledLayers, isLayerDisabled, getDisabledReason) is unchanged.
 */

import type { GeneratorLayerName } from './memeLayers';
import type { UILayerName } from '@/lib/layerRegistry';
import type { SelectionResolver } from '@/lib/selectionResolver';
import { evaluateRules, validateRules, type Rule } from '@/lib/ruleEvaluator';
import rulesData from '@/data/rules.json';

export type SelectedLayers = Partial<Record<GeneratorLayerName, string>>;

// Re-export for consumers
export type { UILayerName } from '@/lib/layerRegistry';
export type { DisabledLayersResult } from '@/lib/ruleEvaluator';

// ============ Load & Validate Rules ============

const rules: Rule[] = rulesData.rules as Rule[];

// Validate at startup — log warnings but don't crash
const validationErrors = validateRules(rules);
if (validationErrors.length > 0) {
  console.warn('[wojakRules] Rule validation errors:', validationErrors);
}

// ============ Public API ============

/**
 * Get all disabled layers based on current selections.
 * Uses SelectionResolver so rules rely on trait IDs and paths from a single source.
 */
export function getDisabledLayers(resolver: SelectionResolver) {
  return evaluateRules(rules, resolver);
}

/**
 * Check if a specific layer is disabled
 */
export function isLayerDisabled(layerName: UILayerName, resolver: SelectionResolver): boolean {
  const { disabledLayers } = getDisabledLayers(resolver);
  return disabledLayers.includes(layerName);
}

/**
 * Get the reason why a layer is disabled
 */
export function getDisabledReason(layerName: UILayerName, resolver: SelectionResolver): string | null {
  const { reasons } = getDisabledLayers(resolver);
  return reasons[layerName] || null;
}
