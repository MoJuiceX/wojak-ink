// Game constants
export const VOTES_PER_DAY = 20; // For holders (legacy constant)
export const VOTES_PER_DAY_HOLDER = 20; // Holders with Farmers Plot NFT
export const VOTES_PER_DAY_FREE = 5; // Guests and connected users without NFT
export const POWER_LEVEL_MAX = 9000;
export const PHASE1_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'; // Wojak Farmers Plot
export const PHASE2_COLLECTION_ID = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx'; // Your Wojak

// Onboarding credit bonuses (in x100 units, matching credit system)
export const ONBOARDING_CREDITS = {
  phase1: 500,    // 5 credits for verifying Phase 1 NFT
  first_mint: 500, // 5 credits for first Your Wojak mint
  first_vote: 200, // 2 credits for first vote
  first_battle: 300, // 3 credits for first battle
} as const;

// Validate DID format (did:chia:...)
export function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}

// Validate guest ID format (guest_[a-z0-9]{16})
export function isValidGuestId(guestId: string): boolean {
  return /^guest_[a-z0-9]{16}$/.test(guestId);
}

// Get today's date string for vote reset tracking
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get yesterday's date string for streak tracking
export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Resolve IPFS image URI — extracts CID and rebuilds using a CORS-safe gateway.
// Handles JSON arrays of gateway URLs, plain IPFS URIs (ipfs://), and HTTPS URLs.
// Private Pinata gateways (*.mypinata.cloud) and public Pinata (gateway.pinata.cloud)
// both CORS-block browser requests, so we extract the CID and use nftstorage.link.
export function resolveImageUri(raw: string | null): string {
  if (!raw) return '';

  // Extract CID from a URL or ipfs:// URI
  const extractCid = (url: string): string | null => {
    // ipfs://QmXxx or ipfs://bafyxxx
    const ipfsMatch = url.match(/^ipfs:\/\/(.+)/);
    if (ipfsMatch) return ipfsMatch[1];
    // https://gateway.pinata.cloud/ipfs/QmXxx
    // https://xxx.mypinata.cloud/ipfs/QmXxx
    // https://nftstorage.link/ipfs/QmXxx
    // https://xxx.ipfs.w3s.link (subdomain style)
    const pathMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (pathMatch) return pathMatch[1];
    // Subdomain style: https://bafyxxx.ipfs.w3s.link
    const subdomainMatch = url.match(/^https?:\/\/(baf[a-z0-9]+)\.ipfs\./);
    if (subdomainMatch) return subdomainMatch[1];
    return null;
  };

  // Build a reliable URL from a CID — use path-style for CIDv0 (Qm...) compat
  const cidToUrl = (cid: string): string => `https://ipfs.io/ipfs/${cid}`;

  if (raw.startsWith('[')) {
    try {
      const urls = JSON.parse(raw) as string[];
      // Try to extract CID from any URL and use CORS-safe gateway
      for (const url of urls) {
        const cid = extractCid(url);
        if (cid) return cidToUrl(cid);
      }
      // Fallback: first HTTPS URL that isn't private Pinata
      const publicUrl = urls.find(u => u.startsWith('https://') && !u.includes('.mypinata.cloud'));
      if (publicUrl) return publicUrl;
      return urls.find(u => u.startsWith('https://')) || urls[0] || '';
    } catch { return raw; }
  }

  // Single string
  const cid = extractCid(raw);
  if (cid) return cidToUrl(cid);

  // Skip private Pinata
  if (raw.includes('.mypinata.cloud')) return '';
  return raw;
}

// Streak milestone credit awards (in x100 units)
export const STREAK_MILESTONES: Record<number, number> = {
  3: 300,    // 3 credits
  7: 1000,   // 10 credits (updated for new economics)
  14: 1500,  // 15 credits
  30: 2500,  // 25 credits
  100: 5000, // 50 credits
};

// Participation credits: 1 credit per 20 votes
export const VOTES_PER_CREDIT = 20;
export const VOTE_CREDIT_AMOUNT = 100; // 1 display credit = 100 stored units
