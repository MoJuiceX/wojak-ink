interface OnboardingChecklistProps {
  milestones: {
    did: boolean;
    phase1: boolean;
    minted: boolean;
    voted: boolean;
    battled: boolean;
  };
}

const MILESTONES = [
  { key: 'did' as const, label: 'Create a DID' },
  { key: 'phase1' as const, label: 'Get a Wojak Farmers Plot NFT' },
  { key: 'minted' as const, label: 'Mint your first Your Wojak' },
  { key: 'voted' as const, label: 'Cast your first vote' },
  { key: 'battled' as const, label: 'Enter your first battle' },
];

export function OnboardingChecklist({ milestones }: OnboardingChecklistProps) {
  const completed = Object.values(milestones).filter(Boolean).length;
  const allDone = completed === MILESTONES.length;

  if (allDone) return null; // Hide when all milestones completed

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Getting Started</h3>
        <span className="badge">{completed}/{MILESTONES.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {MILESTONES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span>{milestones[key] ? '\u2705' : '\u2610'}</span>
            <span className={milestones[key] ? 'text-secondary line-through' : ''}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
