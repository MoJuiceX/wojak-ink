/**
 * DamageNumber — floating damage number that animates upward and fades out.
 * Self-removes after animation completes via onComplete callback.
 */

import { useEffect } from 'react';

interface DamageNumberProps {
  id: string;
  value: number | string;
  type: 'normal' | 'crit' | 'heal' | 'super-effective' | 'immune';
  onComplete: () => void;
}

const TYPE_CLASS_MAP: Record<DamageNumberProps['type'], string> = {
  normal: 'damage-number damage-normal',
  crit: 'damage-number damage-crit',
  heal: 'damage-number damage-heal',
  'super-effective': 'damage-number damage-super-effective',
  immune: 'damage-number damage-immune',
};

export function DamageNumber({ id, value, type, onComplete }: DamageNumberProps) {
  useEffect(() => {
    const duration = type === 'crit' ? 1200 : 1000;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const displayValue = type === 'heal'
    ? `+${value}`
    : type === 'immune'
      ? 'Immune'
      : value;

  return (
    <div className={TYPE_CLASS_MAP[type]} data-damage-id={id}>
      {displayValue}
    </div>
  );
}
