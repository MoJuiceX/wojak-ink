interface PowerLevelDisplayProps {
  level: number;
  rank?: number;
  breakdown?: {
    holdings: { score: number; nftCount: number; uniqueCreators: number };
    creations: { score: number; quality: number; spread: number; uniqueCollectors: number };
  };
}

function getTier(level: number) {
  if (level >= 9000) return { name: 'Legend', class: 'tier-legend', label: "IT'S OVER 9,000!" };
  if (level >= 5000) return { name: 'Top Tier', class: 'tier-top', label: 'Top Tier' };
  if (level >= 2000) return { name: 'Serious', class: 'tier-serious', label: 'Serious' };
  if (level >= 500) return { name: 'Active', class: 'tier-active', label: 'Active' };
  if (level >= 100) return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
  return { name: 'New', class: 'tier-casual', label: 'New Player' };
}

export function PowerLevelDisplay({ level, rank, breakdown }: PowerLevelDisplayProps) {
  const tier = getTier(level);

  return (
    <div className="card-static p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{level.toLocaleString()}</h2>
          <p className="text-secondary text-sm">Power Level</p>
        </div>
        <div className={`power-level-badge ${tier.class}`}>
          {tier.label}
        </div>
      </div>

      {rank && (
        <p className="text-secondary">
          Rank <span className="text-accent font-bold">#{rank}</span> on the leaderboard
        </p>
      )}

      {breakdown && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-secondary">From holdings:</span>
            <span>+{breakdown.holdings.score} ({breakdown.holdings.nftCount} NFTs, {breakdown.holdings.uniqueCreators} creators)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary">From creations:</span>
            <span>+{breakdown.creations.score} ({breakdown.creations.uniqueCollectors} collectors)</span>
          </div>
        </div>
      )}
    </div>
  );
}
