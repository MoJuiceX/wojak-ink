// Tier system for arcade game leaderboards.
// Fight Club no longer uses tiers — this is only for GamePodium and GameLeaderboardList.

export function getTier(level: number) {
  if (level >= 250) return { name: 'Legend', class: 'tier-legend', label: 'Legend' };
  if (level >= 120) return { name: 'Elite', class: 'tier-top', label: 'Elite' };
  if (level >= 60) return { name: 'Strong', class: 'tier-serious', label: 'Strong' };
  if (level >= 25) return { name: 'Serious', class: 'tier-active', label: 'Serious' };
  if (level >= 10) return { name: 'Active', class: 'tier-casual', label: 'Active' };
  return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'Legend': return 'var(--color-primary)';
    case 'Elite': return 'var(--color-cyan, #06b6d4)';
    case 'Strong': return 'var(--color-success)';
    case 'Serious': return 'var(--color-text)';
    case 'Active': return 'var(--color-text-secondary)';
    default: return 'var(--color-text-muted)';
  }
}
