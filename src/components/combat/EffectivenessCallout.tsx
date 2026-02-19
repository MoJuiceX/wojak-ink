/**
 * EffectivenessCallout — centered text popup for "Super Effective!", "Not Very Effective...", "Immune".
 * Self-removes after animation via onComplete callback.
 */

import { useEffect } from 'react';

interface EffectivenessCalloutProps {
  id: string;
  type: 'super_effective' | 'not_very_effective' | 'immune';
  onComplete: () => void;
}

const CALLOUT_CONFIG: Record<string, { text: string; className: string }> = {
  super_effective: { text: 'Super Effective!', className: 'effectiveness-callout callout-super-effective' },
  not_very_effective: { text: 'Not Very Effective...', className: 'effectiveness-callout callout-not-very-effective' },
  immune: { text: 'No Effect', className: 'effectiveness-callout callout-immune' },
};

export function EffectivenessCallout({ id, type, onComplete }: EffectivenessCalloutProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const config = CALLOUT_CONFIG[type];
  if (!config) return null;

  return (
    <div className={config.className} data-callout-id={id}>
      {config.text}
    </div>
  );
}
