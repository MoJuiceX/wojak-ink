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

// Resolve IPFS image URI — handles JSON arrays of gateway URLs or plain strings.
export function resolveImageUri(raw: string | null): string {
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const urls = JSON.parse(raw) as string[];
      return urls.find(u => u.startsWith('https://')) || urls[0] || '';
    } catch { return raw; }
  }
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
