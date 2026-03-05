import { describe, expect, it } from 'vitest';
import { buildIpfsUrlCandidates, getPreferredIpfsUrl } from './ipfs';

describe('ipfs utilities', () => {
  it('prefers the configured canonical gateways over raw ipfs.io URLs', () => {
    const raw = 'https://ipfs.io/ipfs/QmTestCid123456789012345678901234567890123456/0060.png';
    const candidates = buildIpfsUrlCandidates(raw);

    expect(candidates[0]).toBe(
      'https://bronze-used-crow-589.mypinata.cloud/ipfs/QmTestCid123456789012345678901234567890123456/0060.png'
    );
    expect(candidates).toContain(raw);
  });

  it('drops unstable public gateway URLs when generating candidates', () => {
    const raw = 'https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/0060.png';
    const candidates = buildIpfsUrlCandidates(raw);

    expect(candidates).not.toContain(raw);
    expect(candidates[0]).toBe(
      'https://bronze-used-crow-589.mypinata.cloud/ipfs/bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq/0060.png'
    );
  });

  it('preserves ordinary non-IPFS URLs unchanged', () => {
    const raw = 'https://example.com/static/avatar.png';
    expect(buildIpfsUrlCandidates(raw)).toEqual([raw]);
  });

  it('returns the preferred canonical gateway for multi-value payloads', () => {
    const raw = JSON.stringify([
      'https://ipfs.io/ipfs/QmAnotherCid12345678901234567890123456789012345/7.png',
      'ipfs://QmAnotherCid12345678901234567890123456789012345/7.png',
    ]);

    expect(getPreferredIpfsUrl(raw)).toBe(
      'https://bronze-used-crow-589.mypinata.cloud/ipfs/QmAnotherCid12345678901234567890123456789012345/7.png'
    );
  });
});
