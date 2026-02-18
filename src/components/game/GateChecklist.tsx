// Progressive onboarding checklist gate.
// Shows wallet connection, DID input, and Phase 1 verification steps.

import { useState } from 'react';
import { useSageWallet } from '@/sage-wallet';

interface GateChecklistProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
  onLinkDid?: (did: string) => Promise<void>;
  onVerifyNft?: (nftId: string) => Promise<boolean>;
}

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{45,}$/.test(did.trim());
}

function isValidNftId(id: string): boolean {
  return /^nft1[a-z0-9]{58,62}$/.test(id.trim());
}

export function GateChecklist({ walletConnected, hasDid, hasPhase1, onLinkDid, onVerifyNft }: GateChecklistProps) {
  const { connect } = useSageWallet();
  const [didInput, setDidInput] = useState('');
  const [didError, setDidError] = useState('');
  const [linking, setLinking] = useState(false);
  const [nftInput, setNftInput] = useState('');
  const [nftError, setNftError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerifyNft = async () => {
    const id = nftInput.trim();
    if (!isValidNftId(id)) {
      setNftError('Invalid Launcher ID. It should start with nft1...');
      return;
    }
    setNftError('');
    setVerifying(true);
    try {
      const verified = await onVerifyNft?.(id);
      if (!verified) {
        setNftError('NFT not found in your DID or not a Wojak Farmers Plot. Make sure it\'s assigned to your DID.');
      }
    } catch {
      setNftError('Verification failed. Try again.');
    } finally {
      setVerifying(false);
    }
  };

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

  // Steps 2+ require wallet — reset if disconnected
  const steps = [
    { label: 'Connect wallet', done: walletConnected },
    { label: 'Link your DID', done: walletConnected && hasDid },
    { label: 'Hold a Wojak Farmers Plot', done: walletConnected && hasPhase1 },
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
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-muted text-sm">
                      Paste the Launcher ID of your Wojak Farmers Plot NFT from Sage wallet.
                    </span>
                    <input
                      className="input text-sm"
                      type="text"
                      placeholder="nft1..."
                      value={nftInput}
                      onChange={e => { setNftInput(e.target.value); setNftError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleVerifyNft(); }}
                      style={{ fontSize: 13 }}
                    />
                    {nftError && <span className="text-sm" style={{ color: 'var(--color-error)' }}>{nftError}</span>}
                    <button
                      className="btn btn-primary text-sm"
                      style={{ padding: '6px 16px' }}
                      onClick={handleVerifyNft}
                      disabled={verifying || !nftInput.trim()}
                    >
                      {verifying ? 'Verifying...' : 'Verify NFT'}
                    </button>
                    <a
                      href="https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-sm"
                    >
                      Don't have one? View collection &rarr;
                    </a>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
