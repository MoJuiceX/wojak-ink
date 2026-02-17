// Quick Actions — three action buttons: Vote, Battle, Burn.
import { Heart, Swords, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionsProps {
  votesRemaining: number;
  isVerified: boolean;
  hasActiveBattle?: boolean;
}

export function QuickActions({ votesRemaining, isVerified, hasActiveBattle }: QuickActionsProps) {
  return (
    <div className="flex gap-3">
      <Link
        to="/swipe"
        className="btn btn-secondary flex-1 flex flex-col items-center gap-1"
        style={{ padding: '14px 0', height: 70, position: 'relative' }}
      >
        <Heart size={20} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Vote</span>
        {votesRemaining > 0 && (
          <span className="text-muted" style={{ fontSize: 11, position: 'absolute', bottom: 4 }}>
            {votesRemaining} left
          </span>
        )}
      </Link>

      <Link
        to="/swipe/battles"
        className="btn btn-secondary flex-1 flex flex-col items-center gap-1"
        style={{
          padding: '14px 0',
          height: 70,
          position: 'relative',
          opacity: isVerified ? 1 : 0.4,
          pointerEvents: isVerified ? 'auto' : 'none',
        }}
        aria-disabled={!isVerified}
        tabIndex={isVerified ? 0 : -1}
      >
        <span style={{ position: 'relative' }}>
          <Swords size={20} />
          {hasActiveBattle && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-error)',
              }}
            />
          )}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Battle</span>
      </Link>

      <button
        className="btn btn-secondary flex-1 flex flex-col items-center gap-1"
        style={{
          padding: '14px 0',
          height: 70,
          opacity: isVerified ? 1 : 0.4,
          cursor: isVerified ? 'pointer' : 'not-allowed',
        }}
        disabled={!isVerified}
        onClick={() => {
          document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        <Flame size={20} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Burn</span>
      </button>
    </div>
  );
}
