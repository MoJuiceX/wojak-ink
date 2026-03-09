/* eslint-disable react-refresh/only-export-components */
// src/contexts/AIEnhanceContext.tsx

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSageWallet } from '@/sage-wallet';
import type { AICategory, AIEnhancement, AIEnhanceResult, AIWizardStep, PromptSubStep } from '@/types/aiEnhance';
import type { AIStyleFamily, AIPresetOption } from '@/types/aiEnhance';

export interface AIEnhanceContextValue {
  // Balance
  balance: number;
  isLoadingBalance: boolean;
  refetchBalance: () => Promise<void>;

  // Wizard state
  isLightboxOpen: boolean;
  openLightbox: () => void;
  closeLightbox: () => void;
  wizardStep: AIWizardStep;
  setWizardStep: (step: AIWizardStep) => void;
  selectedCategory: AICategory | null;
  selectCategory: (cat: AICategory) => void;
  selectedMode: 'enhance' | 'create_new' | null;
  setSelectedMode: (mode: 'enhance' | 'create_new') => void;

  // Prompt sub-step (managed here so lightbox back button can navigate)
  promptSubStep: PromptSubStep;
  setPromptSubStep: (step: PromptSubStep) => void;
  selectedFamily: AIStyleFamily | null;
  setSelectedFamily: (f: AIStyleFamily | null) => void;
  selectedOption: AIPresetOption | null;
  setSelectedOption: (o: AIPresetOption | null) => void;
  handlePromptBack: () => void;

  // Enhancement
  isEnhancing: boolean;
  enhanceError: string | null;
  clearError: () => void;
  submitEnhance: (imageBase64: string, category: AICategory, prompt: string, parentId?: string, layersJson?: string) => Promise<AIEnhanceResult | null>;

  // Result
  currentResult: AIEnhanceResult | null;
  clearResult: () => void;

  // Enhanced image state
  enhancedImage: string | null;  // base64 of currently accepted AI image
  enhancedCategories: Set<AICategory>;
  acceptResult: () => void;
  resetToLayers: () => void;
  isAIEnhancedMode: boolean;
  acceptedOptions: Partial<Record<AICategory, AIPresetOption>>;
  acceptedFamilies: Partial<Record<AICategory, string>>;

  // Creations gallery
  creations: AIEnhancement[];
  isLoadingCreations: boolean;
  fetchCreations: () => Promise<void>;

  // Load a gallery creation for further enhancement
  loadImageForEnhancing: (imageDataUrl: string) => void;

  // Shop
  isShopOpen: boolean;
  openShop: () => void;
  closeShop: () => void;

  // Auth
  sessionToken: string | null;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  authenticate: () => Promise<void>;
}

const AIEnhanceContext = createContext<AIEnhanceContextValue | null>(null);

export function AIEnhanceProvider({ children }: { children: ReactNode }) {
  const { address, signMessage } = useSageWallet();

  // Balance
  const [balance, setBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Wizard
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<AIWizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<AICategory | null>(null);
  const [selectedMode, setSelectedMode] = useState<'enhance' | 'create_new' | null>(null);

  // Prompt sub-steps
  const [promptSubStep, setPromptSubStep] = useState<PromptSubStep>('mode');
  const [selectedFamily, setSelectedFamily] = useState<AIStyleFamily | null>(null);
  const [selectedOption, setSelectedOption] = useState<AIPresetOption | null>(null);

  // Enhancement
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AIEnhanceResult | null>(null);

  // AI Enhanced Mode
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancedCategories, setEnhancedCategories] = useState<Set<AICategory>>(new Set());
  const [acceptedOptions, setAcceptedOptions] = useState<Partial<Record<AICategory, AIPresetOption>>>({});
  const [acceptedFamilies, setAcceptedFamilies] = useState<Partial<Record<AICategory, string>>>({});

  // Creations
  const [creations, setCreations] = useState<AIEnhancement[]>([]);
  const [isLoadingCreations, setIsLoadingCreations] = useState(false);

  // Shop
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Auth
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isAuthenticated = sessionToken !== null;

  const isAIEnhancedMode = enhancedImage !== null;

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    return headers;
  }, [sessionToken]);

  const authenticate = useCallback(async () => {
    if (!address) return;
    setIsAuthenticating(true);
    try {
      // Step 1: Request challenge nonce
      const challengeRes = await fetch('/api/ai/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!challengeRes.ok) throw new Error('Challenge request failed');
      const { nonce } = await challengeRes.json();

      // Step 2: Sign with Sage Wallet
      const { signature, publicKey } = await signMessage(nonce);

      // Step 3: Verify and get session token
      const verifyRes = await fetch('/api/ai/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          nonce,
          signature,
          publicKey,
        }),
      });
      if (!verifyRes.ok) throw new Error('Verification failed');
      const { sessionToken: token } = await verifyRes.json();

      setSessionToken(token);
    } catch (err) {
      console.error('[AI Auth] Authentication failed:', err);
      setSessionToken(null);
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessage]);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (address && !sessionToken && !isAuthenticating) {
      authenticate();
    }
    if (!address) {
      setSessionToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // --- Fetch balance ---
  const refetchBalance = useCallback(async () => {
    if (!address || !sessionToken) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch('/api/ai/balance', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch AI balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, sessionToken, authHeaders]);

  useEffect(() => {
    if (sessionToken) {
      refetchBalance();
    }
  }, [sessionToken, refetchBalance]);

  // --- Lightbox ---
  const openLightbox = useCallback(() => {
    setIsLightboxOpen(true);
    setWizardStep('category');
    setSelectedCategory(null);
    setCurrentResult(null);
    setEnhanceError(null);
  }, []);

  const closeLightbox = useCallback(() => {
    if (isEnhancing) return; // Prevent closing during API call
    setIsLightboxOpen(false);
  }, [isEnhancing]);

  // --- Category ---
  const selectCategory = useCallback((cat: AICategory) => {
    setSelectedCategory(cat);
    setSelectedMode(null);
    setPromptSubStep('mode');
    setSelectedFamily(null);
    setSelectedOption(null);
    setWizardStep('prompt');
    setEnhanceError(null);
    setCurrentResult(null);
  }, []);

  // --- Prompt back navigation (called by lightbox header back button) ---
  const handlePromptBack = useCallback(() => {
    setEnhanceError(null);
    if (promptSubStep === 'confirm') {
      setPromptSubStep('option');
    } else if (promptSubStep === 'option') {
      setSelectedFamily(null);
      setSelectedOption(null);
      setPromptSubStep('family');
    } else if (promptSubStep === 'family') {
      // Background always skips mode → go to category
      // All other categories show mode step
      if (selectedCategory === 'background') {
        setWizardStep('category');
      } else {
        setSelectedMode(null);
        setPromptSubStep('mode');
      }
    } else if (promptSubStep === 'mode') {
      setWizardStep('category');
    }
  }, [promptSubStep, selectedCategory]);

  // --- Submit enhancement ---
  const submitEnhance = useCallback(async (
    imageBase64: string,
    category: AICategory,
    prompt: string,
    parentId?: string,
    layersJson?: string,
  ): Promise<AIEnhanceResult | null> => {
    if (!address || !sessionToken) return null;
    setIsEnhancing(true);
    setEnhanceError(null);
    setWizardStep('loading');

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          imageBase64: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
          category,
          prompt,
          mode: selectedMode ?? 'enhance',
          parentEnhancementId: parentId,
          baseLayersJson: layersJson,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEnhanceError(data.error || 'Enhancement failed. Try again.');
        setWizardStep('prompt');
        return null;
      }

      const result: AIEnhanceResult = data;
      setCurrentResult(result);
      setBalance(result.creditsRemaining);
      setWizardStep('result');
      return result;
    } catch (err) {
      console.error('Enhance error:', err);
      setEnhanceError('Network error. Check your connection and try again.');
      setWizardStep('prompt');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [address, sessionToken, selectedMode, authHeaders]);

  // --- Accept result ---
  const acceptResult = useCallback(() => {
    if (!currentResult || !selectedOption) return;
    const imageData = `data:image/png;base64,${currentResult.imageBase64}`;
    setEnhancedImage(imageData);
    setEnhancedCategories((prev) => new Set([...prev, currentResult.category]));
    setAcceptedOptions((prev) => ({ ...prev, [currentResult.category]: selectedOption }));
    setAcceptedFamilies((prev) => ({ ...prev, [currentResult.category]: selectedFamily?.label ?? '' }));
  }, [currentResult, selectedOption, selectedFamily]);

  // --- Reset ---
  const resetToLayers = useCallback(() => {
    setEnhancedImage(null);
    setEnhancedCategories(new Set());
    setAcceptedOptions({});
    setAcceptedFamilies({});
  }, []);

  const clearResult = useCallback(() => setCurrentResult(null), []);
  const clearError = useCallback(() => setEnhanceError(null), []);

  // --- Fetch creations ---
  const fetchCreations = useCallback(async () => {
    if (!address || !sessionToken) return;
    setIsLoadingCreations(true);
    try {
      const res = await fetch('/api/ai/creations', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCreations(data.creations ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch AI creations:', err);
    } finally {
      setIsLoadingCreations(false);
    }
  }, [address, sessionToken, authHeaders]);

  // --- Load gallery creation for further enhancement ---
  const loadImageForEnhancing = useCallback((imageDataUrl: string) => {
    setEnhancedImage(imageDataUrl);
    setEnhancedCategories(new Set()); // Reset — we don't know prior edits
    setIsLightboxOpen(true);
    setWizardStep('category');
    setSelectedCategory(null);
    setCurrentResult(null);
    setEnhanceError(null);
  }, []);

  // --- Shop ---
  const openShop = useCallback(() => setIsShopOpen(true), []);
  const closeShop = useCallback(() => setIsShopOpen(false), []);

  const value: AIEnhanceContextValue = {
    balance,
    isLoadingBalance,
    refetchBalance,
    isLightboxOpen,
    openLightbox,
    closeLightbox,
    wizardStep,
    setWizardStep,
    selectedCategory,
    selectCategory,
    selectedMode,
    setSelectedMode,
    promptSubStep,
    setPromptSubStep,
    selectedFamily,
    setSelectedFamily,
    selectedOption,
    setSelectedOption,
    handlePromptBack,
    isEnhancing,
    enhanceError,
    clearError,
    submitEnhance,
    currentResult,
    clearResult,
    enhancedImage,
    enhancedCategories,
    acceptResult,
    resetToLayers,
    isAIEnhancedMode,
    acceptedOptions,
    acceptedFamilies,
    creations,
    isLoadingCreations,
    fetchCreations,
    loadImageForEnhancing,
    isShopOpen,
    openShop,
    closeShop,
    sessionToken,
    isAuthenticating,
    isAuthenticated,
    authenticate,
  };

  return <AIEnhanceContext.Provider value={value}>{children}</AIEnhanceContext.Provider>;
}

export function useAIEnhance(): AIEnhanceContextValue {
  const ctx = useContext(AIEnhanceContext);
  if (!ctx) {
    throw new Error('useAIEnhance must be used within AIEnhanceProvider');
  }
  return ctx;
}
