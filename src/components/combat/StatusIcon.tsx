/**
 * StatusIcon — small animated icon for combat status effects (burn, poison, etc.).
 */

interface StatusIconProps {
  status: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  burn: { label: 'Burned', emoji: '\u{1F525}', className: 'status-icon status-icon-burn' },
  poison: { label: 'Poisoned', emoji: '\u{2620}\u{FE0F}', className: 'status-icon status-icon-poison' },
  badly_poisoned: { label: 'Badly Poisoned', emoji: '\u{2620}\u{FE0F}', className: 'status-icon status-icon-poison' },
  paralysis: { label: 'Paralyzed', emoji: '\u{26A1}', className: 'status-icon status-icon-paralysis' },
  freeze: { label: 'Frozen', emoji: '\u{2744}\u{FE0F}', className: 'status-icon status-icon-freeze' },
  sleep: { label: 'Asleep', emoji: '\u{1F4A4}', className: 'status-icon status-icon-sleep' },
  confusion: { label: 'Confused', emoji: '\u{1F4AB}', className: 'status-icon status-icon-confusion' },
};

export function StatusIcon({ status }: StatusIconProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={config.className}
      title={config.label}
      aria-label={config.label}
    >
      {config.emoji}
    </span>
  );
}
