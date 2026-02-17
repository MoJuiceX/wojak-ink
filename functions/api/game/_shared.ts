// Game constants
export const VOTES_PER_DAY = 10;
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

// Streak milestone credit awards (in x100 units)
export const STREAK_MILESTONES: Record<number, number> = {
  3: 300,    // 3 credits
  7: 500,    // 5 credits
  14: 1000,  // 10 credits
  30: 2000,  // 20 credits
  100: 5000, // 50 credits
};
