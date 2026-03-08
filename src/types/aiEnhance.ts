// src/types/aiEnhance.ts

export type AICategory = 'clothes' | 'head' | 'facewear' | 'background';
export type AICategoryFreedom = 'enhance' | 'free';

export interface AICategoryConfig {
  label: string;
  icon: string;
  freedom: AICategoryFreedom;
}

export const AI_CATEGORIES: Record<AICategory, AICategoryConfig> = {
  clothes:    { label: 'Clothes',    icon: '👕', freedom: 'enhance' },
  head:       { label: 'Head',       icon: '🎩', freedom: 'enhance' },
  facewear:   { label: 'Facewear',   icon: '🎭', freedom: 'free' },
  background: { label: 'Background', icon: '🖼', freedom: 'free' },
};

export interface AIEnhancement {
  id: number;
  r2Key: string;
  category: AICategory;
  prompt: string;
  parentEnhancementId: number | null;
  createdAt: string;
}

export interface AIEnhanceResult {
  imageBase64: string;
  r2Key: string;
  enhancementId: string;
  category: AICategory;
  prompt: string;
  creditsRemaining: number;
  reveRequestId?: string;
}

export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  discount: string;
  badge?: string;
}

export const AI_CREDIT_BUNDLES: AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.08, discount: '' },
  { tier: '5',  credits: 5,  priceXch: 0.35, discount: '12.5% off' },
  { tier: '15', credits: 15, priceXch: 0.90, discount: '25% off', badge: 'POPULAR' },
  { tier: '30', credits: 30, priceXch: 1.50, discount: '37.5% off' },
  { tier: '50', credits: 50, priceXch: 2.00, discount: '50% off', badge: 'BEST VALUE' },
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
