// src/types/aiEnhance.ts
import type { DerivedAICreditBundle } from '@/lib/aiCreditPricing';
export { getAICreditBundles } from '@/lib/aiCreditPricing';
import type { G2Selections, SelectedLayers } from '@/types/generator';
import type { UILayerName } from '@/lib/layerRegistry';

export type AICategory = 'clothes' | 'head' | 'facewear' | 'background';
export type AICategoryFreedom = 'enhance' | 'free';

export type AIMode = 'enhance' | 'create_new';

/** Sub-steps within the 'prompt' wizard step. */
export type PromptSubStep = 'mode' | 'family' | 'option' | 'confirm';

export interface AIPresetOption {
  label: string;
  prompt: string;
}

export interface AIStyleFamily {
  label: string;
  options: AIPresetOption[];
}

/** A family that spans all categories and both modes. */
export interface MasterFamily {
  label: string;
  clothesEnhance:     AIPresetOption[];
  clothesCreate:      AIPresetOption[];
  headEnhance:        AIPresetOption[];
  headCreate:         AIPresetOption[];
  backgroundEnhance:  AIPresetOption[];
  backgroundCreate:   AIPresetOption[];
}

export interface AICategoryPresets {
  enhance?: AIStyleFamily[];
  create_new: AIStyleFamily[];
}

export interface AICategoryConfig {
  label: string;
  icon: string;
  freedom: AICategoryFreedom;
}

export const AI_CATEGORIES: Record<AICategory, AICategoryConfig> = {
  clothes:    { label: 'Clothes',    icon: '👕', freedom: 'enhance' },
  head:       { label: 'Head',       icon: '🎩', freedom: 'enhance' },
  facewear:   { label: 'Facewear',   icon: '🎭', freedom: 'free' },
  background: { label: 'Background', icon: '🖼', freedom: 'enhance' },
};

/** Categories available in the AI wizard. Facewear excluded — too risky for AI edits. */
export const AI_WIZARD_CATEGORIES: AICategory[] = ['clothes', 'head', 'background'];

export interface AIEnhancement {
  id: number;
  r2Key: string;
  category: AICategory;
  prompt: string;
  parentEnhancementId: number | null;
  createdAt: string;
  aiTraitOverrides: Record<string, string>;
  generatorSnapshot: AIGeneratorSnapshot | null;
  isLegacy: boolean;
}

export interface AIGeneratorSnapshot {
  selectedLayers: SelectedLayers;
  g2Selections: G2Selections;
  selectedColors: Partial<Record<UILayerName, string>>;
}

export interface AIEnhanceResult {
  imageBase64: string;
  /** MIME type of the image (image/jpeg or image/png) */
  contentType?: string;
  r2Key: string;
  enhancementId: string;
  category: AICategory;
  prompt: string;
  creditsRemaining: number;
  reveRequestId?: string;
  aiTraitOverrides: Record<string, string>;
  /** True when the result is a background-only scene (needs frontend compositing with character overlay) */
  isBgOnly?: boolean;
}

export type AICreditBundle = DerivedAICreditBundle;

export type AIWizardStep = 'category' | 'prompt' | 'loading' | 'result';

export interface AIWizardState {
  step: AIWizardStep;
  selectedCategory: AICategory | null;
  prompt: string;
  originalImage: string | null;  // base64
  resultImage: string | null;    // base64
  enhancedCategories: Set<AICategory>;
  currentEnhancementId: string | null;
  error: string | null;
}
