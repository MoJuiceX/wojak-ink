/* eslint-disable react-refresh/only-export-components */
// Power Level hero card — centered score, tier badge, collapsible breakdown, credits.
import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface PowerLevelDisplayProps {
  level: number;
  rank?: number;
  credits?: number;
  voteStreak?: number;
  breakdown?: {
    plotPower: number;
    plotCount: number;
    wojakPower: number;
    wojakCount: number;
    collectionBonus: number;
    collectedCount: number;
  };
}

function getTier(level: number) {
  if (level >= 250) return { name: 'Legend', class: 'tier-legend', label: 'Legend' };
  if (level >= 120) return { name: 'Elite', class: 'tier-top', label: 'Elite' };
  if (level >= 60) return { name: 'Strong', class: 'tier-serious', label: 'Strong' };
  if (level >= 25) return { name: 'Serious', class: 'tier-active', label: 'Serious' };
  if (level >= 10) return { name: 'Active', class: 'tier-casual', label: 'Active' };
  return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
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
          type="button"
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
          <p className="mt-1"><strong className="text-primary">Plots:</strong> 20 power per Farmer's Plot NFT</p>
          <p><strong className="text-primary">Wojaks:</strong> Net vote score of Your Wojaks you hold</p>
          <p><strong className="text-primary">Collection:</strong> 10% bonus from top Wojaks by other creators</p>
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
            type="button"
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
                <span>Farmer's Plots:</span>
                <span>+{breakdown.plotPower} ({breakdown.plotCount} plots)</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Your Wojaks:</span>
                <span>+{breakdown.wojakPower} ({breakdown.wojakCount} Wojaks)</span>
              </div>
              {breakdown.collectionBonus > 0 && (
                <div className="flex justify-between text-accent">
                  <span>Collection Bonus:</span>
                  <span>+{breakdown.collectionBonus} ({breakdown.collectedCount} top Wojaks)</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { getTier };
