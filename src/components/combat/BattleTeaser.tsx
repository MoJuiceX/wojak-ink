/**
 * BattleTeaser Component
 *
 * Info section displayed below the demo arena on the Battle tab.
 * Explains the battle system and signals the upcoming launch.
 */

import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '⚔️',
    title: 'Queue your Wojak',
    body: 'Enter the battle queue and get matched by ELO rating',
  },
  {
    icon: '🤖',
    title: 'Auto-resolved',
    body: 'The server plays both sides — check back for your results',
  },
  {
    icon: '🏆',
    title: 'Earn battle power',
    body: 'Wins add to your power score and push you up the leaderboard',
  },
  {
    icon: '📈',
    title: 'Climb ELO',
    body: 'Your rating rises and falls with every result',
  },
] as const;

export function BattleTeaser() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8 py-4">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Battle Arena</h2>
          <span className="badge badge-cyan">Coming Soon</span>
        </div>
        <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
          Pit your Wojak against others in turn-based combat. The strongest survive.
        </p>
      </div>

      {/* How it works */}
      <div className="flex flex-col gap-3">
        <h3
          className="text-muted"
          style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          How it works
        </h3>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          {FEATURES.map(({ icon, title, body }) => (
            <div key={title} className="card-static p-4 flex flex-col gap-2">
              <div style={{ fontSize: '1.5rem' }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</div>
              <p className="text-secondary" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Type system */}
      <div className="flex flex-col gap-2">
        <h3
          className="text-muted"
          style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          The type system
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.65, maxWidth: '600px' }}>
          Every Wojak has a combat type — FIRE, WATER, VENOM, DRAGON, GRASS, and more —
          determined by the traits you chose in the generator. Type matchups matter:
          FIRE hits hard against GRASS, but falls to WATER. Your type is baked into
          your NFT on-chain. Choose wisely when you mint.
        </p>
      </div>

      {/* Launch callout */}
      <div
        className="card-static p-5 flex flex-col gap-2"
        style={{ borderLeft: '3px solid var(--color-primary)' }}
      >
        <p style={{ fontWeight: 600 }}>Battles launch next week.</p>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          Keep voting now to build your power score before the arena opens.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', marginTop: '4px', padding: '6px 0' }}
          onClick={() => navigate('/fight-club/vote')}
        >
          → Go vote
        </button>
      </div>

    </div>
  );
}

export default BattleTeaser;
