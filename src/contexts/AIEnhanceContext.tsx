/* eslint-disable react-refresh/only-export-components */
// src/contexts/AIEnhanceContext.tsx

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSageWallet } from '@/sage-wallet';
import type { AICategory, AIEnhancement, AIEnhanceResult, AIWizardStep, PromptSubStep } from '@/types/aiEnhance';
import type { AIStyleFamily, AIPresetOption } from '@/types/aiEnhance';
import { compositeMaskedEnhancement, compositeOverlay } from '@/lib/aiEnhanceImage';

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

  // Character overlay (transparent PNG without background — for background compositing)
  characterOverlay: string | null;
  setCharacterOverlay: (overlay: string | null) => void;
  targetOverlays: Partial<Record<'clothes' | 'head', string>>;
  setTargetOverlay: (category: 'clothes' | 'head', overlay: string | null) => void;
  foregroundOverlays: Partial<Record<'clothes' | 'head', string>>;
  setForegroundOverlay: (category: 'clothes' | 'head', overlay: string | null) => void;

  // Enhanced image state
  enhancedImage: string | null;  // base64 of currently accepted AI image
  enhancedCategories: Set<AICategory>;
  acceptResult: (currentImage?: string | null) => void;
  resetToLayers: () => void;
  isAIEnhancedMode: boolean;
  acceptedOptions: Partial<Record<AICategory, AIPresetOption>>;
  acceptedFamilies: Partial<Record<AICategory, string>>;
  aiTraitOverrides: Record<string, string>;

  // Creations gallery
  creations: AIEnhancement[];
  isLoadingCreations: boolean;
  fetchCreations: () => Promise<void>;

  // Load a gallery creation for further enhancement
  loadImageForEnhancing: (imageDataUrl: string, traitOverrides?: Record<string, string>) => void;

  // Shop
  isShopOpen: boolean;
  openShop: () => void;
  closeShop: () => void;

  // Auth
  sessionToken: string | null;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  authenticate: () => Promise<string | null>;
  ensureAuthenticated: () => Promise<string | null>;
  /** Clear expired session and re-authenticate fresh (use after 401). */
  reauthenticate: () => Promise<string | null>;
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

  // Character overlay (transparent PNG — used for background compositing)
  const [characterOverlay, setCharacterOverlay] = useState<string | null>(null);
  const [targetOverlays, setTargetOverlays] = useState<Partial<Record<'clothes' | 'head', string>>>({});
  const [foregroundOverlays, setForegroundOverlays] = useState<Partial<Record<'clothes' | 'head', string>>>({});

  // AI Enhanced Mode
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancedCategories, setEnhancedCategories] = useState<Set<AICategory>>(new Set());
  const [acceptedOptions, setAcceptedOptions] = useState<Partial<Record<AICategory, AIPresetOption>>>({});
  const [acceptedFamilies, setAcceptedFamilies] = useState<Partial<Record<AICategory, string>>>({});
  const [aiTraitOverrides, setAiTraitOverrides] = useState<Record<string, string>>({});

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

  // Returns the session token on success (so callers can use it immediately
  // without waiting for React state to update).
  const authenticate = useCallback(async (): Promise<string | null> => {
    if (!address || !signMessage) return null;
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
      const { sessionToken: token, expiresAt } = await verifyRes.json();

      // Persist session so page refreshes don't require re-signing
      try {
        localStorage.setItem('ai_session', JSON.stringify({ token, expiresAt, walletAddress: address }));
      } catch { /* storage unavailable */ }

      setSessionToken(token);
      return token;
    } catch (err) {
      console.error('[AI Auth] Authentication failed:', err);
      setSessionToken(null);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessage]);

  // Re-authenticate on 401 (expired session) — returns new token or null
  const handleAuthError = useCallback(async (res: Response): Promise<string | null> => {
    if (res.status === 401) {
      localStorage.removeItem('ai_session');
      setSessionToken(null);
      return authenticate(); // returns token or null
    }
    return null;
  }, [authenticate]);

  // Clear expired session and authenticate fresh. Use after a 401 response
  // instead of ensureAuthenticated (which would return the stale token).
  const reauthenticate = useCallback(async (): Promise<string | null> => {
    localStorage.removeItem('ai_session');
    setSessionToken(null);
    return authenticate();
  }, [authenticate]);

  // Ensure we have a valid session token (lazy auth).
  // Returns the current token, restores from localStorage, or authenticates fresh.
  const ensureAuthenticated = useCallback(async (): Promise<string | null> => {
    // Already have a token in state
    if (sessionToken) return sessionToken;

    // Try to restore from localStorage
    try {
      const raw = localStorage.getItem('ai_session');
      if (raw) {
        const stored = JSON.parse(raw) as { token: string; expiresAt: string; walletAddress: string };
        if (stored.walletAddress === address && new Date(stored.expiresAt) > new Date()) {
          setSessionToken(stored.token);
          return stored.token;
        }
      }
    } catch { /* ignore malformed storage */ }
    localStorage.removeItem('ai_session');

    // Authenticate fresh (will prompt user to sign)
    return authenticate();
  }, [sessionToken, address, authenticate]);

  // Restore cached session on wallet connect (no BLS signing prompt).
  // BLS auth is deferred to when the user actually tries to spend credits.
  useEffect(() => {
    if (!address) {
      setSessionToken(null);
      return;
    }
    // Only restore from localStorage — never prompt to sign just for connecting
    try {
      const raw = localStorage.getItem('ai_session');
      if (raw) {
        const stored = JSON.parse(raw) as { token: string; expiresAt: string; walletAddress: string };
        if (stored.walletAddress === address && new Date(stored.expiresAt) > new Date()) {
          setSessionToken(stored.token);
          return;
        }
      }
    } catch { /* ignore malformed storage */ }
    localStorage.removeItem('ai_session');
  }, [address]);

  // --- Fetch balance (public endpoint, no auth needed) ---
  const refetchBalance = useCallback(async () => {
    if (!address) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch(`/api/ai/balance?wallet=${encodeURIComponent(address)}`);
      if (!res.ok) return;
      const data = await res.json();
      setBalance(data.balance ?? 0);
    } catch (err) {
      console.error('Failed to fetch AI balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address]);

  // Fetch balance immediately when wallet connects (no auth needed)
  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, refetchBalance]);

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
    setSelectedFamily(null);
    setSelectedOption(null);
    setWizardStep('prompt');
    setEnhanceError(null);
    setCurrentResult(null);

    // Background only has "enhance" mode — skip the mode selection step
    if (cat === 'background') {
      setSelectedMode('enhance');
      setPromptSubStep('family');
    } else {
      setSelectedMode(null);
      setPromptSubStep('mode');
    }
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

  // --- Submit enhancement (lazy auth — authenticates on first use) ---
  const submitEnhance = useCallback(async (
    imageBase64: string,
    category: AICategory,
    prompt: string,
    parentId?: string,
    layersJson?: string,
  ): Promise<AIEnhanceResult | null> => {
    if (!address) return null;
    setIsEnhancing(true);
    setEnhanceError(null);
    setWizardStep('loading');

    let step = 'init';
    try {
      // Step 1: Authenticate
      step = 'auth';
      const token = await ensureAuthenticated();
      if (!token) {
        setEnhanceError('Wallet authentication required. Please sign the message in your wallet.');
        setWizardStep('prompt');
        setIsEnhancing(false);
        return null;
      }

      // Validate token is clean ASCII hex with correct length (128 hex chars = 64 bytes)
      if (!/^[a-f0-9]{128}$/i.test(token)) {
        console.error('[AI Enhance] Invalid session token format — clearing and re-authenticating');
        localStorage.removeItem('ai_session');
        setSessionToken(null);
        setEnhanceError('Session corrupted. Please try again.');
        setWizardStep('prompt');
        setIsEnhancing(false);
        return null;
      }

      // Step 2: Build payload
      step = 'payload';
      // Background: no image needed (backend generates scene-only, frontend composites)
      // Other categories: send the current image for editing
      const sourceImage = category === 'background'
        ? undefined
        : (category === 'clothes' || category === 'head')
          ? (targetOverlays[category] ?? imageBase64)
          : imageBase64;
      const rawImage = sourceImage && sourceImage.includes(',') ? sourceImage.split(',')[1] : sourceImage;
      const payload = {
        imageBase64: rawImage,
        category,
        prompt,
        mode: selectedMode ?? 'enhance',
        parentEnhancementId: parentId ?? undefined,
        baseLayersJson: layersJson ?? undefined,
        traitLabel: selectedOption?.label ?? null,
        parentTraitOverrides: Object.keys(aiTraitOverrides).length > 0 ? aiTraitOverrides : undefined,
      };
      // Debug payload (warn level allowed by lint)
      console.warn('[AI Enhance] Payload meta:', {
        category: payload.category,
        mode: payload.mode,
        prompt: payload.prompt?.slice(0, 60),
        imageSize: rawImage?.length ?? 0,
        traitLabel: payload.traitLabel,
        hasParentId: !!parentId,
        tokenLen: token.length,
      });

      // Step 3: Send request
      step = 'fetch';
      const makeRequest = async (authToken: string) => {
        return fetch('/api/ai/enhance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
      };

      let res = await makeRequest(token);

      // If 401, re-authenticate and retry once
      if (res.status === 401) {
        step = 'reauth';
        const newToken = await handleAuthError(res);
        if (newToken) {
          res = await makeRequest(newToken);
        } else {
          setEnhanceError('Session expired. Please try again.');
          setWizardStep('prompt');
          return null;
        }
      }

      // Step 4: Parse response
      step = 'response';
      console.warn('[AI Enhance] Response status:', res.status, 'ok:', res.ok);

      // Handle error responses — must parse carefully since CF may return HTML on 502
      if (!res.ok) {
        let errorMsg = `Server error (${res.status}). Please try again.`;
        try {
          const text = await res.text();
          // Try to parse as JSON (our backend returns { error: "..." })
          if (text.startsWith('{')) {
            const parsed = JSON.parse(text);
            errorMsg = parsed.error || errorMsg;
          } else {
            // HTML error page from Cloudflare (function timeout/crash)
            console.error('[AI Enhance] Non-JSON error response:', res.status, text.slice(0, 100));
            if (res.status === 502 || res.status === 504) {
              errorMsg = 'The AI service took too long to respond. Please try again — it usually works on retry.';
            }
          }
        } catch {
          // Failed to read body — use status-based message
          if (res.status === 502 || res.status === 504) {
            errorMsg = 'The AI service took too long to respond. Please try again.';
          }
        }
        console.error('[AI Enhance] Error:', errorMsg);
        setEnhanceError(errorMsg);
        setWizardStep('prompt');
        return null;
      }

      const data = await res.json();

      const result: AIEnhanceResult = data;
      setCurrentResult(result);
      setBalance(result.creditsRemaining);
      setWizardStep('result');
      return result;
    } catch (err) {
      console.error(`[AI Enhance] Error at step "${step}":`, err);
      const message = err instanceof Error ? err.message : String(err);
      const errName = err instanceof Error ? err.constructor.name : typeof err;

      // Log diagnostic info for debugging
      console.error('[AI Enhance] Error details:', { step, errName, message });

      // User-friendly error messages
      if (/rejected|denied|cancel/i.test(message)) {
        setEnhanceError('Wallet signing was cancelled. Try again.');
      } else if (/timeout|abort/i.test(message)) {
        setEnhanceError('Request timed out. Check your connection and try again.');
      } else if (/network|fetch|failed to fetch/i.test(message)) {
        setEnhanceError('Network error. Check your connection and try again.');
      } else if (/pattern|did not match/i.test(message)) {
        // Safari DOMException from crypto/URL — likely auth or request construction issue
        setEnhanceError('Connection error. Please disconnect and reconnect your wallet, then try again.');
      } else {
        setEnhanceError('Enhancement failed. Please try again.');
      }
      setWizardStep('prompt');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [address, selectedMode, selectedOption, aiTraitOverrides, ensureAuthenticated, handleAuthError, targetOverlays]);

  // Convert any image (JPEG or PNG) to PNG data URL via canvas
  const ensurePng = useCallback(async (base64: string, ct?: string): Promise<string> => {
    const mime = ct?.includes('jpeg') || ct?.includes('jpg') ? 'image/jpeg' : 'image/png';
    // If already PNG, return directly
    if (mime === 'image/png') return `data:image/png;base64,${base64}`;
    // Convert JPEG to PNG via canvas
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        // Fallback: assume PNG if conversion fails
        resolve(`data:image/png;base64,${base64}`);
      };
      img.src = `data:${mime};base64,${base64}`;
    });
  }, []);

  const buildCompositedEnhancement = useCallback(async (
    result: AIEnhanceResult,
    currentImage?: string | null,
  ): Promise<string> => {
    if (result.isBgOnly && characterOverlay) {
      const bgDataUrl = await ensurePng(result.imageBase64, result.contentType);
      return compositeOverlay(bgDataUrl, characterOverlay);
    }

    if (
      currentImage &&
      (result.category === 'clothes' || result.category === 'head')
    ) {
      const targetOverlay = targetOverlays[result.category];
      if (targetOverlay) {
        const enhancedDataUrl = await ensurePng(result.imageBase64, result.contentType);
        const composited = await compositeMaskedEnhancement(currentImage, enhancedDataUrl, targetOverlay);
        const foregroundOverlay = foregroundOverlays[result.category];
        if (foregroundOverlay) {
          return compositeOverlay(composited, foregroundOverlay);
        }
        return composited;
      }
    }

    return ensurePng(result.imageBase64, result.contentType);
  }, [characterOverlay, ensurePng, foregroundOverlays, targetOverlays]);

  // --- Accept result ---
  const acceptResult = useCallback(async (currentImage?: string | null) => {
    if (!currentResult || !selectedOption) return;

    const imageData = await buildCompositedEnhancement(currentResult, currentImage);

    setEnhancedImage(imageData);
    setEnhancedCategories((prev) => new Set([...prev, currentResult.category]));
    setAcceptedOptions((prev) => ({ ...prev, [currentResult.category]: selectedOption }));
    setAcceptedFamilies((prev) => ({ ...prev, [currentResult.category]: selectedFamily?.label ?? '' }));
    // Update cumulative trait overrides from the server response
    if (currentResult.aiTraitOverrides && Object.keys(currentResult.aiTraitOverrides).length > 0) {
      setAiTraitOverrides(currentResult.aiTraitOverrides);
    }
  }, [buildCompositedEnhancement, currentResult, selectedOption, selectedFamily]);

  // --- Reset ---
  const resetToLayers = useCallback(() => {
    setEnhancedImage(null);
    setEnhancedCategories(new Set());
    setAcceptedOptions({});
    setAcceptedFamilies({});
    setAiTraitOverrides({});
  }, []);

  const clearResult = useCallback(() => setCurrentResult(null), []);
  const clearError = useCallback(() => setEnhanceError(null), []);
  const setTargetOverlay = useCallback((category: 'clothes' | 'head', overlay: string | null) => {
    setTargetOverlays((prev) => {
      if (overlay) return { ...prev, [category]: overlay };
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }, []);
  const setForegroundOverlay = useCallback((category: 'clothes' | 'head', overlay: string | null) => {
    setForegroundOverlays((prev) => {
      if (overlay) return { ...prev, [category]: overlay };
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }, []);

  // --- Fetch creations (lazy auth — only authenticates when user opens gallery) ---
  const fetchCreations = useCallback(async () => {
    if (!address) return;
    setIsLoadingCreations(true);
    try {
      const token = await ensureAuthenticated();
      if (!token) return;

      const res = await fetch('/api/ai/creations', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          const newToken = await handleAuthError(res);
          if (newToken) {
            const retryRes = await fetch('/api/ai/creations', {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`,
              },
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              setCreations(data.creations ?? []);
            }
          }
        }
        return;
      }
      const data = await res.json();
      setCreations(data.creations ?? []);
    } catch (err) {
      console.error('Failed to fetch AI creations:', err);
    } finally {
      setIsLoadingCreations(false);
    }
  }, [address, ensureAuthenticated, handleAuthError]);

  // --- Load gallery creation for further enhancement ---
  const loadImageForEnhancing = useCallback((imageDataUrl: string, traitOverrides?: Record<string, string>) => {
    setEnhancedImage(imageDataUrl);
    // Restore prior AI edits from the creation's stored overrides
    const overrides = traitOverrides ?? {};
    setAiTraitOverrides(overrides);
    setEnhancedCategories(new Set(Object.keys(overrides) as AICategory[]));
    setAcceptedOptions({});
    setAcceptedFamilies({});
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
    characterOverlay,
    setCharacterOverlay,
    targetOverlays,
    setTargetOverlay,
    foregroundOverlays,
    setForegroundOverlay,
    enhancedImage,
    enhancedCategories,
    acceptResult,
    resetToLayers,
    isAIEnhancedMode,
    acceptedOptions,
    acceptedFamilies,
    aiTraitOverrides,
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
    ensureAuthenticated,
    reauthenticate,
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

/** Safe version that returns null outside AIEnhanceProvider (for shared hooks). */
export function useAIEnhanceOptional(): AIEnhanceContextValue | null {
  return useContext(AIEnhanceContext);
}
