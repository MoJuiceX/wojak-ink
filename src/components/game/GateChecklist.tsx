// Progressive onboarding checklist gate.
// Shows wallet connection, DID input, and Phase 1 verification steps.
// Step 3 auto-verifies first; manual Launcher ID input is a fallback.

import { useState, useEffect, useRef } from 'react';
import { useSageWallet } from '@/sage-wallet';

interface GateChecklistProps {
  walletConnected: boolean;
  hasDid: boolean;
  hasPhase1: boolean;
  onLinkDid?: (did: string) => Promise<void>;
  onAutoVerify?: () => Promise<boolean>;
  onVerifyNft?: (nftId: string) => Promise<boolean>;
  onAllComplete?: () => void;
}

function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{45,}$/.test(did.trim());
}

function isValidNftId(id: string): boolean {
  return /^nft1[a-z0-9]{58,62}$/.test(id.trim());
}

type VerifyState = 'idle' | 'checking' | 'not_found' | 'error';

export function GateChecklist({ walletConnected, hasDid, hasPhase1, onLinkDid, onAutoVerify, onVerifyNft, onAllComplete }: GateChecklistProps) {
  const { connect } = useSageWallet();
  const [didInput, setDidInput] = useState('');
  const [didError, setDidError] = useState('');
  const [linking, setLinking] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectFailed, setDetectFailed] = useState(false);
  const [showManualDid, setShowManualDid] = useState(false);

  // Progressive step reveal — checkmarks appear one by one with short delays
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    if (animStep >= 4) return;
    const stepsDone = [
      walletConnected,
      walletConnected && hasDid,
      walletConnected && hasPhase1,
      walletConnected && hasDid && hasPhase1,
    ];
    if (stepsDone[animStep]) {
      const timer = setTimeout(() => setAnimStep(prev => prev + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [animStep, walletConnected, hasDid, hasPhase1]);

  // Notify parent when all 4 steps revealed
  useEffect(() => {
    if (animStep >= 4 && walletConnected && hasDid && hasPhase1) {
      const timer = setTimeout(() => onAllComplete?.(), 500);
      return () => clearTimeout(timer);
    }
  }, [animStep, walletConnected, hasDid, hasPhase1, onAllComplete]);

  // Reset animation if wallet disconnects
  useEffect(() => {
    if (!walletConnected) setAnimStep(0);
  }, [walletConnected]);

  // Step 2 auto-detect: show detecting state while SwipeAutoRegister works
  useEffect(() => {
    if (walletConnected && !hasDid) {
      setDetecting(true);
      setDetectFailed(false);
      setShowManualDid(false);
      // Give SwipeAutoRegister time to detect DID (3 retries x 3s = ~9s)
      const timer = setTimeout(() => {
        setDetecting(false);
        setDetectFailed(true);
      }, 12000);
      return () => clearTimeout(timer);
    }
    if (hasDid) {
      setDetecting(false);
      setDetectFailed(false);
      setShowManualDid(false);
    }
  }, [walletConnected, hasDid]);

  // Step 3 state
  // Flow: auto-check → (fail) → show retry button → (retry fails) → show manual input
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [retryUsed, setRetryUsed] = useState(false);
  const [nftInput, setNftInput] = useState('');
  const [nftError, setNftError] = useState('');
  const [verifyingNft, setVerifyingNft] = useState(false);
  const [showInfoTip, setShowInfoTip] = useState(false);
  const autoVerifyAttempted = useRef(false);

  // Step 3 is active when wallet connected + DID linked + not yet verified
  const step3Active = walletConnected && hasDid && !hasPhase1;
  // Show manual input after retry has been used and failed
  const showManual = retryUsed && (verifyState === 'not_found' || verifyState === 'error');

  // Auto-verify when step 3 becomes active
  useEffect(() => {
    if (!step3Active || autoVerifyAttempted.current || !onAutoVerify) return;
    autoVerifyAttempted.current = true;

    let cancelled = false;
    setVerifyState('checking');

    onAutoVerify()
      .then(verified => {
        if (cancelled) return;
        if (!verified) {
          setVerifyState('not_found');
        }
      })
      .catch(() => {
        if (!cancelled) setVerifyState('error');
      });

    return () => { cancelled = true; };
  }, [step3Active, onAutoVerify]);

  // Reset state if step 3 becomes inactive then active again
  useEffect(() => {
    if (!step3Active) {
      autoVerifyAttempted.current = false;
      setVerifyState('idle');
      setRetryUsed(false);
    }
  }, [step3Active]);

  const handleRetry = async () => {
    if (!onAutoVerify) return;
    setRetryUsed(true);
    setVerifyState('checking');
    try {
      const verified = await onAutoVerify();
      if (!verified) setVerifyState('not_found');
      // If verified, hasPhase1 prop updates and step 3 disappears
    } catch {
      setVerifyState('error');
    }
  };

  const handleVerifyNft = async () => {
    const id = nftInput.trim();
    if (!isValidNftId(id)) {
      setNftError('Invalid Launcher ID. It should start with nft1...');
      return;
    }
    setNftError('');
    setVerifyingNft(true);
    try {
      const verified = await onVerifyNft?.(id);
      if (!verified) {
        setNftError('NFT not found in your DID or not a Wojak Farmers Plot. Make sure it\'s assigned to your DID.');
      }
    } catch {
      setNftError('Verification failed. Try again.');
    } finally {
      setVerifyingNft(false);
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
    { label: 'Detect your identity', done: walletConnected && hasDid },
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
          // isRevealed: animation has ticked past this step (show checkmark)
          const isRevealed = step.done && i < animStep;
          // isCurrent: genuinely needs user action (not just waiting for animation)
          const isCurrent = !step.done && steps.slice(0, i).every(s => s.done);
          // isScanning: step is done but animation hasn't revealed it yet
          const isScanning = step.done && !isRevealed;
          return (
            <li key={step.label} className="gate-step" aria-current={isCurrent ? 'step' : undefined}>
              <span className="gate-step-icon">
                {isRevealed ? '\u2705' : (isCurrent || isScanning) ? '\u2610' : ''}
                {!step.done && !isCurrent && <div className="gate-step-icon-future" />}
              </span>
              <div className="gate-step-content">
                <span className={isRevealed ? 'text-secondary text-sm' : (isCurrent || isScanning) ? 'text-sm font-medium' : 'text-muted text-sm'}>
                  {step.label}
                </span>
                {isCurrent && i === 0 && (
                  <button type="button" className="btn btn-primary mt-2 text-sm" style={{ padding: '6px 16px' }} onClick={connect}>
                    Connect Wallet
                  </button>
                )}
                {isCurrent && i === 1 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {detecting && !detectFailed && (
                      <span className="text-secondary text-sm">
                        Detecting your identity...
                      </span>
                    )}
                    {detectFailed && !showManualDid && (
                      <>
                        <span className="text-muted text-sm">
                          Could not detect DID automatically.
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost text-sm"
                          style={{ padding: '4px 12px', alignSelf: 'flex-start' }}
                          onClick={() => setShowManualDid(true)}
                        >
                          Enter DID manually
                        </button>
                      </>
                    )}
                    {(showManualDid || (!detecting && !detectFailed)) && (
                      <>
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
                        {didError && <span className="text-sm text-error">{didError}</span>}
                        <button
                          type="button"
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
                      </>
                    )}
                  </div>
                )}
                {isCurrent && i === 2 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Auto-checking state */}
                    {verifyState === 'checking' && (
                      <span className="text-muted text-sm">
                        Checking your DID for Wojak Farmers Plot NFTs...
                      </span>
                    )}

                    {/* First failure — show retry (one chance) */}
                    {(verifyState === 'not_found' || verifyState === 'error') && !retryUsed && (
                      <>
                        <span className="text-muted text-sm">
                          {verifyState === 'error'
                            ? 'Could not check your DID right now.'
                            : 'No Wojak Farmers Plot found in your DID yet.'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary text-sm"
                          style={{ padding: '6px 16px' }}
                          onClick={handleRetry}
                        >
                          Retry
                        </button>
                        <a
                          href="https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-sm"
                        >
                          Don't have one? View collection &rarr;
                        </a>
                      </>
                    )}

                    {/* Retry failed — show manual Launcher ID input */}
                    {showManual && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-muted text-sm">
                            Paste Launcher ID
                          </span>
                          <span
                            className="text-muted"
                            style={{
                              cursor: 'pointer',
                              fontSize: 14,
                              lineHeight: 1,
                              position: 'relative',
                            }}
                            onMouseEnter={() => setShowInfoTip(true)}
                            onMouseLeave={() => setShowInfoTip(false)}
                            onClick={() => setShowInfoTip(prev => !prev)}
                            aria-label="Where to find your Launcher ID"
                          >
                            &#9432;
                            {showInfoTip && (
                              <span
                                className="card-static"
                                style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  marginBottom: 6,
                                  padding: '8px 12px',
                                  fontSize: 12,
                                  lineHeight: 1.4,
                                  width: 240,
                                  zIndex: 10,
                                  whiteSpace: 'normal',
                                  pointerEvents: 'none',
                                }}
                              >
                                <strong>Sage Wallet:</strong> Open your NFT &rarr; copy the Launcher ID at the top.
                                <br /><br />
                                <strong>MintGarden:</strong> Open the NFT page &rarr; the nft1... ID is below the name.
                              </span>
                            )}
                          </span>
                        </div>
                        <input
                          className="input text-sm"
                          type="text"
                          placeholder="nft1..."
                          value={nftInput}
                          onChange={e => { setNftInput(e.target.value); setNftError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') handleVerifyNft(); }}
                          style={{ fontSize: 13 }}
                        />
                        {nftError && <span className="text-sm text-error">{nftError}</span>}
                        <button
                          type="button"
                          className="btn btn-primary text-sm"
                          style={{ padding: '6px 16px' }}
                          onClick={handleVerifyNft}
                          disabled={verifyingNft || !nftInput.trim()}
                        >
                          {verifyingNft ? 'Verifying...' : 'Verify NFT'}
                        </button>
                        <a
                          href="https://mintgarden.io/collections/wojak-farmers-plot-col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-sm"
                        >
                          Don't have one? View collection &rarr;
                        </a>
                      </>
                    )}
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
