// src/types/aiEnhance.ts

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
}

export interface AIEnhanceResult {
  imageBase64: string;
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

export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  discount: string;
  badge?: string;
}

export const AI_CREDIT_BUNDLES: AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.10, discount: '' },
  { tier: '10', credits: 10, priceXch: 0.80, discount: '20% off' },
  { tier: '25', credits: 25, priceXch: 1.50, discount: '40% off', badge: 'POPULAR' },
  { tier: '50', credits: 50, priceXch: 2.40, discount: '52% off', badge: 'BEST VALUE' },
];

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
