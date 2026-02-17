// Onboarding checklist — progressive milestones with action links.
import { CheckCircle, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  { key: 'did' as const, label: 'Link your DID to play', action: null as null },
  { key: 'phase1' as const, label: 'Hold a Phase 1 Wojak', action: { label: 'Get One', href: 'https://mintgarden.io/collections/wojak-farmers-plot' } },
  { key: 'minted' as const, label: 'Create your first Wojak', action: { label: 'Go to Generator', to: '/generator' } },
  { key: 'voted' as const, label: 'Vote on a Wojak', action: { label: 'Vote Now', to: '/games/your-wojak' } },
  { key: 'battled' as const, label: 'Enter and win a battle', action: { label: 'Battle', to: '/games/your-wojak/battles' } },
];

export function OnboardingChecklist({ milestones }: OnboardingChecklistProps) {
  const completed = Object.values(milestones).filter(Boolean).length;
  const allDone = completed === MILESTONES.length;

  if (allDone) return null;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ fontSize: 14 }}>Getting Started</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>{completed}/{MILESTONES.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {MILESTONES.map(({ key, label, action }) => {
          const done = milestones[key];
          return (
            <div key={key} className="flex items-center gap-3" style={{ fontSize: 13 }}>
              {done
                ? <CheckCircle size={16} className="text-success" style={{ flexShrink: 0 }} />
                : <Circle size={16} className="text-muted" style={{ flexShrink: 0 }} />}
              <span className={done ? 'text-secondary line-through flex-1' : 'flex-1'}>{label}</span>
              {!done && action && (
                'to' in action && action.to
                  ? <Link to={action.to} className="text-accent" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{action.label}</Link>
                  : 'href' in action && action.href
                    ? <a href={action.href} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{action.label}</a>
                    : null
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
