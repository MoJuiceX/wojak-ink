/**
 * Declarative Rules Engine Evaluator
 *
 * Evaluates JSON-defined rules against current generator selections.
 * Replaces hardcoded rule functions with a data-driven approach.
 *
 * Supports:
 * - Boolean combinators: all (AND), any (OR), not
 * - Fact types: traitId, path, isEmpty, isNotEmpty, hasAnySelection
 * - Operators: equals, notEquals, in, notIn, contains, notContains, containsAny, notContainsAny
 * - Actions: disable, force, clear, disableOption
 */

import type { UILayerName } from '@/lib/layerRegistry';
import { UI_ORDER, DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH, DEFAULT_CLOTHES_PATH } from '@/lib/layerRegistry';
import type { SelectionResolver } from '@/lib/selectionResolver';

// ============ Result Type ============

export interface DisabledLayersResult {
  disabledLayers: UILayerName[];
  reasons: Record<string, string>;
  clearSelections: UILayerName[];
  forceSelections: Partial<Record<UILayerName, string>>;
  disabledOptions: Partial<Record<UILayerName, Set<string>>>;
  /** Reasons for specific disabled options: { LayerName: { OptionName: "reason" } } */
  disabledOptionReasons: Partial<Record<UILayerName, Record<string, string>>>;
}

// ============ Rule Schema Types ============

export interface LeafCondition {
  fact: 'traitId' | 'path' | 'isEmpty' | 'isNotEmpty' | 'hasAnySelection';
  layer?: string;
  excludeLayers?: string[];
  operator?: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains' | 'notContains' | 'containsAny' | 'notContainsAny';
  value?: unknown;
}

export interface AllCondition { all: Condition[] }
export interface AnyCondition { any: Condition[] }
export interface NotCondition { not: Condition }

export type Condition = LeafCondition | AllCondition | AnyCondition | NotCondition;

export interface DisableAction { action: 'disable'; target: string; reason?: string }
export interface ForceAction { action: 'force'; target: string; value: string }
export interface ClearAction { action: 'clear'; target: string }
export interface DisableOptionAction { action: 'disableOption'; target: string; options: string[]; reason?: string }

export type RuleAction = DisableAction | ForceAction | ClearAction | DisableOptionAction;

export interface Rule {
  id: string;
  priority: number;
  description: string;
  when: Condition;
  then: RuleAction[];
}

export interface RulesFile {
  $schema: string;
  rules: Rule[];
}

// ============ Default Path Resolution ============

const LAYER_DEFAULTS: Record<string, string> = {
  Base: DEFAULT_BASE_PATH,
  MouthBase: DEFAULT_MOUTHBASE_PATH,
  Clothes: DEFAULT_CLOTHES_PATH,
};

function resolveActionValue(value: string, target: string): string {
  if (value === '$default') return LAYER_DEFAULTS[target] ?? '';
  return value;
}

// ============ Condition Evaluation ============

function evaluateLeaf(condition: LeafCondition, resolver: SelectionResolver): boolean {
  const { fact, layer, operator, value } = condition;

  // Boolean facts (no operator needed)
  if (fact === 'isEmpty') {
    const path = resolver.getPath(layer ?? '');
    return !path;
  }
  if (fact === 'isNotEmpty') {
    const path = resolver.getPath(layer ?? '');
    return !!path;
  }
  if (fact === 'hasAnySelection') {
    const exclude = condition.excludeLayers ?? [];
    for (const l of UI_ORDER) {
      if (exclude.includes(l)) continue;
      if (resolver.getPath(l)) return true;
    }
    return false;
  }

  // Fact-based conditions requiring an operator
  let factValue: string | null | undefined;
  if (fact === 'traitId') {
    factValue = resolver.getTraitId(layer as UILayerName);
  } else if (fact === 'path') {
    factValue = resolver.getPath(layer ?? '');
  }

  return applyOperator(factValue ?? null, operator ?? 'equals', value);
}

function applyOperator(factValue: string | null, op: string, value: unknown): boolean {
  switch (op) {
    case 'equals':
      return factValue === value;
    case 'notEquals':
      return factValue !== value;
    case 'in':
      return factValue !== null && Array.isArray(value) && value.includes(factValue);
    case 'notIn':
      return factValue === null || !Array.isArray(value) || !value.includes(factValue);
    case 'contains':
      return factValue !== null && factValue.toLowerCase().includes(String(value).toLowerCase());
    case 'notContains':
      return factValue === null || !factValue.toLowerCase().includes(String(value).toLowerCase());
    case 'containsAny':
      return (
        factValue !== null &&
        Array.isArray(value) &&
        value.some((v) => factValue!.toLowerCase().includes(String(v).toLowerCase()))
      );
    case 'notContainsAny':
      return (
        factValue === null ||
        !Array.isArray(value) ||
        !value.some((v) => factValue!.toLowerCase().includes(String(v).toLowerCase()))
      );
    default:
      return false;
  }
}

function evaluateCondition(condition: Condition, resolver: SelectionResolver): boolean {
  if ('all' in condition) {
    return (condition as AllCondition).all.every((c) => evaluateCondition(c, resolver));
  }
  if ('any' in condition) {
    return (condition as AnyCondition).any.some((c) => evaluateCondition(c, resolver));
  }
  if ('not' in condition) {
    return !evaluateCondition((condition as NotCondition).not, resolver);
  }
  return evaluateLeaf(condition as LeafCondition, resolver);
}

// ============ Action Application ============

function applyActions(actions: RuleAction[], result: DisabledLayersResult): void {
  for (const action of actions) {
    const target = action.target as UILayerName;

    switch (action.action) {
      case 'disable':
        if (!result.disabledLayers.includes(target)) {
          result.disabledLayers.push(target);
        }
        if (action.reason) {
          result.reasons[target] = action.reason;
        }
        break;

      case 'force':
        result.forceSelections[target] = resolveActionValue(action.value, action.target);
        break;

      case 'clear':
        if (!result.clearSelections.includes(target)) {
          result.clearSelections.push(target);
        }
        break;

      case 'disableOption': {
        if (!result.disabledOptions[target]) {
          result.disabledOptions[target] = new Set();
        }
        for (const opt of action.options) {
          result.disabledOptions[target]!.add(opt.toLowerCase());
        }
        if (action.reason) {
          if (!result.disabledOptionReasons[target]) {
            result.disabledOptionReasons[target] = {};
          }
          for (const opt of action.options) {
            result.disabledOptionReasons[target]![opt] = action.reason;
          }
        }
        break;
      }
    }
  }
}

// ============ Public API ============

/**
 * Evaluate all rules against the current selection state.
 * Rules are sorted by priority (ascending) and results merge additively.
 * Force actions use last-write-wins semantics.
 */
export function evaluateRules(rules: Rule[], resolver: SelectionResolver): DisabledLayersResult {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const result: DisabledLayersResult = {
    disabledLayers: [],
    reasons: {},
    clearSelections: [],
    forceSelections: {},
    disabledOptions: {},
    disabledOptionReasons: {},
  };

  for (const rule of sorted) {
    if (evaluateCondition(rule.when, resolver)) {
      applyActions(rule.then, result);
    }
  }

  return result;
}

// ============ Validation ============

export interface ValidationError {
  ruleId: string;
  message: string;
}

const VALID_FACTS = new Set(['traitId', 'path', 'isEmpty', 'isNotEmpty', 'hasAnySelection']);
const VALID_OPERATORS = new Set([
  'equals', 'notEquals', 'in', 'notIn',
  'contains', 'notContains', 'containsAny', 'notContainsAny',
]);
const VALID_ACTIONS = new Set(['disable', 'force', 'clear', 'disableOption']);
const VALID_LAYERS = new Set([...UI_ORDER, 'ClothesAddon']);

function validateCondition(condition: Condition, ruleId: string, errors: ValidationError[]): void {
  if ('all' in condition) {
    for (const c of (condition as AllCondition).all) validateCondition(c, ruleId, errors);
    return;
  }
  if ('any' in condition) {
    for (const c of (condition as AnyCondition).any) validateCondition(c, ruleId, errors);
    return;
  }
  if ('not' in condition) {
    validateCondition((condition as NotCondition).not, ruleId, errors);
    return;
  }

  const leaf = condition as LeafCondition;
  if (!VALID_FACTS.has(leaf.fact)) {
    errors.push({ ruleId, message: `Unknown fact: "${leaf.fact}"` });
  }
  if (leaf.operator && !VALID_OPERATORS.has(leaf.operator)) {
    errors.push({ ruleId, message: `Unknown operator: "${leaf.operator}"` });
  }
  if (leaf.layer && !VALID_LAYERS.has(leaf.layer)) {
    errors.push({ ruleId, message: `Unknown layer: "${leaf.layer}"` });
  }
}

/** Validate all rules at load time. Returns empty array if valid. */
export function validateRules(rules: Rule[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();

  for (const rule of rules) {
    if (ids.has(rule.id)) {
      errors.push({ ruleId: rule.id, message: `Duplicate rule ID: "${rule.id}"` });
    }
    ids.add(rule.id);

    if (typeof rule.priority !== 'number') {
      errors.push({ ruleId: rule.id, message: 'Missing or invalid priority' });
    }

    validateCondition(rule.when, rule.id, errors);

    for (const action of rule.then) {
      if (!VALID_ACTIONS.has(action.action)) {
        errors.push({ ruleId: rule.id, message: `Unknown action: "${action.action}"` });
      }
      if (action.action === 'disableOption' && !Array.isArray(action.options)) {
        errors.push({ ruleId: rule.id, message: 'disableOption requires options array' });
      }
    }
  }

  return errors;
}
