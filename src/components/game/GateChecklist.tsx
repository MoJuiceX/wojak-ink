// Progressive onboarding checklist gate.
// Replaces old separate gate screens with a single progressive checklist.
// Stub — will be fleshed out in T6.

import { useSageWallet } from '@/sage-wallet';

interface GateChecklistProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
}

export function GateChecklist({ walletConnected, hasDid, hasPhase1 }: GateChecklistProps) {
  const { connect } = useSageWallet();

  const steps = [
    { label: 'Connect wallet', done: walletConnected },
    { label: 'Create a DID', done: hasDid },
    { label: 'Get a Wojak Farmers Plot', done: hasPhase1 },
    { label: 'Start voting', done: walletConnected && hasDid && hasPhase1 },
  ];

  return (
    <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 380, width: '100%' }}>
      <h2 className="text-xl font-bold">Your Wojak</h2>
      <p className="text-secondary text-sm text-center">
        Complete these steps to start voting.
      </p>
      <ol className="flex flex-col gap-3 w-full" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {steps.map((step, i) => {
          const isCurrent = !step.done && steps.slice(0, i).every(s => s.done);
          return (
            <li key={step.label} className="gate-step" aria-current={isCurrent ? 'step' : undefined}>
              <span className="gate-step-icon">
                {step.done ? '\u2705' : isCurrent ? '\u2610' : ''}
                {!step.done && !isCurrent && <div className="gate-step-icon-future" />}
              </span>
              <div className="gate-step-content">
                <span className={step.done ? 'text-secondary text-sm' : isCurrent ? 'text-sm font-medium' : 'text-muted text-sm'}>
                  {step.label}
                </span>
                {isCurrent && i === 0 && (
                  <button className="btn btn-primary mt-2 text-sm" style={{ padding: '6px 16px' }} onClick={connect}>
                    Connect Wallet
                  </button>
                )}
                {isCurrent && i === 1 && (
                  <a
                    href="https://docs.sagewalletapp.com/getting-started/did"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost mt-2 text-sm"
                    style={{ padding: '6px 16px' }}
                  >
                    Learn How &rarr;
                  </a>
                )}
                {isCurrent && i === 2 && (
                  <a
                    href="https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost mt-2 text-sm"
                    style={{ padding: '6px 16px' }}
                  >
                    View Collection &rarr;
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
