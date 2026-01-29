import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Effect types (support both kebab-case and camelCase for backwards compatibility)
export type EffectType =
  | 'shockwave'
  | 'sparks'
  | 'confetti'
  | 'combo-text' | 'comboText'
  | 'floating-emoji' | 'floatingEmoji'
  | 'screen-shake' | 'screenShake'
  | 'lightning'
  | 'speed-lines' | 'speedLines'
  | 'score-popup' | 'scorePopup'
  | 'vignette-pulse' | 'vignettePulse';

export type EffectIntensity = 'low' | 'normal' | 'medium' | 'high' | 'strong';

export interface Effect {
  id: string;
  type: EffectType;
  intensity?: EffectIntensity;
  position?: { x: number; y: number };
  data?: Record<string, any>;
  duration: number;
  createdAt: number;
}

export interface EffectPreset {
  effects: Omit<Effect, 'id' | 'createdAt'>[];
}

interface EffectsContextType {
  activeEffects: Effect[];
  triggerEffect: (type: EffectType, options?: Partial<Effect>) => void;
  /** Alias for triggerEffect that accepts object form: trigger({ type, intensity?, ...options }) */
  trigger: (options: { type: EffectType; intensity?: EffectIntensity } & Partial<Omit<Effect, 'type' | 'intensity'>>) => void;
  triggerPreset: (preset: EffectPreset) => void;
  clearEffects: () => void;
  setIntensity: (level: 'low' | 'medium' | 'high') => void;
}

const EffectsContext = createContext<EffectsContextType | undefined>(undefined);

let effectIdCounter = 0;

// Default durations for each effect type (supports both naming conventions)
function getDefaultDuration(type: EffectType): number {
  const durations: Partial<Record<EffectType, number>> = {
    'shockwave': 600,
    'sparks': 800,
    'confetti': 3000,
    'combo-text': 1000, 'comboText': 1000,
    'floating-emoji': 2000, 'floatingEmoji': 2000,
    'screen-shake': 500, 'screenShake': 500,
    'lightning': 300,
    'speed-lines': 500, 'speedLines': 500,
    'score-popup': 1500, 'scorePopup': 1500,
    'vignette-pulse': 400, 'vignettePulse': 400
  };
  return durations[type] || 1000;
}

export const EffectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);
  const [intensity, setIntensityState] = useState<'low' | 'medium' | 'high'>('high');

  // Generate unique ID
  const generateId = () => `effect-${++effectIdCounter}-${Date.now()}`;

  // Trigger a single effect
  const triggerEffect = useCallback((
    type: EffectType,
    options?: Partial<Effect>
  ) => {
    // Skip some effects on low intensity
    if (intensity === 'low' && ['sparks', 'lightning', 'speed-lines'].includes(type)) {
      return;
    }

    const effect: Effect = {
      id: generateId(),
      type,
      duration: getDefaultDuration(type),
      createdAt: Date.now(),
      ...options
    };

    setActiveEffects(prev => [...prev, effect]);

    // Auto-remove after duration
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(e => e.id !== effect.id));
    }, effect.duration);
  }, [intensity]);

  // Trigger a preset (multiple effects at once)
  const triggerPreset = useCallback((preset: EffectPreset) => {
    preset.effects.forEach((effectConfig, index) => {
      // Stagger effects slightly for more dynamic feel
      setTimeout(() => {
        triggerEffect(effectConfig.type, effectConfig);
      }, index * 50);
    });
  }, [triggerEffect]);

  // Clear all effects
  const clearEffects = useCallback(() => {
    setActiveEffects([]);
  }, []);

  // Set intensity level
  const setIntensity = useCallback((level: 'low' | 'medium' | 'high') => {
    setIntensityState(level);
  }, []);

  // Alias for triggerEffect that accepts object form
  const trigger = useCallback((options: { type: EffectType; intensity?: EffectIntensity } & Partial<Omit<Effect, 'type' | 'intensity'>>) => {
    const { type, ...rest } = options;
    triggerEffect(type, rest as Partial<Effect>);
  }, [triggerEffect]);

  return (
    <EffectsContext.Provider
      value={{
        activeEffects,
        triggerEffect,
        trigger,
        triggerPreset,
        clearEffects,
        setIntensity
      }}
    >
      {children}
    </EffectsContext.Provider>
  );
};

export const useEffects = () => {
  const context = useContext(EffectsContext);
  if (!context) {
    throw new Error('useEffects must be used within EffectsProvider');
  }
  return context;
};
