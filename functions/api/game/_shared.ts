// Game constants
export const VOTES_PER_DAY = 10;
export const POWER_LEVEL_MAX = 9000;
export const PHASE1_COLLECTION_ID = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h'; // Wojak Farmers Plot

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

// Get today's date string for vote reset tracking
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
