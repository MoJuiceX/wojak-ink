// Progressive onboarding checklist gate.
// Shows wallet connection, DID input, and Phase 1 verification steps.

import { useState } from 'react';
import { useSageWallet } from '@/sage-wallet';

interface GateChecklistProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
  onLinkDid?: (did: string) => Promise<void>;
}

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{45,}$/.test(did.trim());
}

export function GateChecklist({ walletConnected, hasDid, hasPhase1, onLinkDid }: GateChecklistProps) {
  const { connect } = useSageWallet();
  const [didInput, setDidInput] = useState('');
  const [didError, setDidError] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLinkDid = async () => {
    const did = didInput.trim();
    if (!isValidDid(did)) {
      setDidError('Invalid DID. It should start with did:chia:1...');
      return;
    }
    setDidError('');
    setLinking(true);
    try {
      await onLinkDid?.(did);
    } catch {
      setDidError('Registration failed. Try again.');
    } finally {
      setLinking(false);
    }
  };

  const steps = [
    { label: 'Connect wallet', done: walletConnected },
    { label: 'Link your DID', done: hasDid },
    { label: 'Hold a Wojak Farmers Plot', done: hasPhase1 },
    { label: 'Start swiping', done: walletConnected && hasDid && hasPhase1 },
  ];

  return (
    <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 380, width: '100%' }}>
      <h2 className="text-xl font-bold">Wojak Swipe</h2>
      <p className="text-secondary text-sm text-center">
        Complete these steps to start swiping.
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
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-muted text-sm">
                      Paste your DID from Sage wallet.
                    </span>
                    <input
                      className="input text-sm"
                      type="text"
                      placeholder="did:chia:1..."
                      value={didInput}
                      onChange={e => { setDidInput(e.target.value); setDidError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleLinkDid(); }}
                      style={{ fontSize: 13 }}
                    />
                    {didError && <span className="text-sm" style={{ color: 'var(--color-error)' }}>{didError}</span>}
                    <button
                      className="btn btn-primary text-sm"
                      style={{ padding: '6px 16px' }}
                      onClick={handleLinkDid}
                      disabled={linking || !didInput.trim()}
                    >
                      {linking ? 'Linking...' : 'Link DID'}
                    </button>
                    <a
                      href="https://docs.sagewalletapp.com/getting-started/did"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-sm"
                    >
                      Don't have a DID? Learn how to create one &rarr;
                    </a>
                  </div>
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
