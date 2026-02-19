// Power Level hero card — centered score, tier badge, collapsible breakdown, credits.
import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface PowerLevelDisplayProps {
  level: number;
  rank?: number;
  credits?: number;
  voteStreak?: number;
  breakdown?: {
    holdings: { score: number; nftCount: number; uniqueCreators: number };
    creations: { score: number; quality: number; spread: number; uniqueCollectors: number };
  };
}

function getTier(level: number) {
  if (level >= 9000) return { name: 'Legend', class: 'tier-legend', label: "IT'S OVER 9,000!" };
  if (level >= 5000) return { name: 'Top Tier', class: 'tier-top', label: 'Top Tier' };
  if (level >= 2000) return { name: 'Serious', class: 'tier-serious', label: 'Serious' };
  if (level >= 500)  return { name: 'Active', class: 'tier-active', label: 'Active' };
  if (level >= 100)  return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
  return { name: 'New', class: 'tier-casual', label: 'New Player' };
}

export function PowerLevelDisplay({ level, rank, credits, voteStreak, breakdown }: PowerLevelDisplayProps) {
  const tier = getTier(level);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <div className="card-static p-6 flex flex-col items-center gap-2">
      {rank != null && (
        <p className="text-muted" style={{ fontSize: 13 }}>#{rank}</p>
      )}

      <div className="flex items-center gap-2">
        <h2 className="font-bold" style={{ fontSize: 36 }}>{level.toLocaleString()}</h2>
        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="btn btn-ghost"
          style={{ padding: 4, opacity: 0.6 }}
          aria-label="What is Power Level?"
        >
          <Info size={16} />
        </button>
      </div>

      {showExplainer && (
        <div className="text-secondary w-full" style={{ fontSize: 13 }}>
          <p>Your Power Level reflects your standing in the Wojak ecosystem.</p>
          <p className="mt-1"><strong className="text-primary">Holdings:</strong> Quality and diversity of NFTs you collect</p>
          <p><strong className="text-primary">Creations:</strong> How well your minted Wojaks perform in votes</p>
        </div>
      )}

      <div className={`power-level-badge ${tier.class}`}>
        {tier.label}
      </div>

      <div className="flex items-center gap-3" style={{ fontSize: 13 }}>
        {credits != null && credits > 0 && (
          <span className="text-muted">Credits: {credits}</span>
        )}
        {voteStreak != null && voteStreak > 0 && (
          <span className="text-accent">{voteStreak}-day streak</span>
        )}
      </div>

      {breakdown && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="btn btn-ghost flex items-center gap-1"
            style={{ fontSize: 13 }}
          >
            {showBreakdown ? 'Hide' : 'View'} Breakdown
            {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showBreakdown && (
            <div className="flex flex-col gap-1 w-full" style={{ fontSize: 13 }}>
              <div className="flex justify-between text-secondary">
                <span>From holdings:</span>
                <span>+{breakdown.holdings.score} ({breakdown.holdings.nftCount} NFTs, {breakdown.holdings.uniqueCreators} creators)</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>From creations:</span>
                <span>+{breakdown.creations.score} ({breakdown.creations.uniqueCollectors} collectors)</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { getTier };
