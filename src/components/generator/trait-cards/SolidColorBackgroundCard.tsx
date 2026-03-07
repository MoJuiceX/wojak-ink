/**
 * SolidColorBackgroundCard — trait card for solid color background option.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';

export interface SolidColorBackgroundCardProps {
  color: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const SolidColorBackgroundCard = memo(function SolidColorBackgroundCard({ color, isSelected, isDisabled, disabledReason, onClick }: SolidColorBackgroundCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : 'Solid color — pick with color picker'}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate text-primary"
        style={{
          background: 'linear-gradient(transparent, var(--color-black-70))',
        }}
      >
        Solid color
      </div>
    </TraitCardShell>
  );
});
