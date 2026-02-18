/**
 * PreCombatMessage — shown on NFT cards that lack a combat_fighters record.
 *
 * Indicates the Wojak was minted before the combat era and suggests
 * burning for credits toward a new combat-ready Wojak.
 */

interface PreCombatMessageProps {
  className?: string;
}

export function PreCombatMessage({ className = '' }: PreCombatMessageProps) {
  return (
    <div className={`card-static p-3 ${className}`}>
      <p className="text-xs text-secondary">
        This Wojak was minted before the combat era. Burn it to earn credits toward a new combat-ready Wojak!
      </p>
    </div>
  );
}
