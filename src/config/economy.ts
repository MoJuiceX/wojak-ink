/**
 * Wojak.ink Economy Configuration
 *
 * Central configuration for all currency-related values.
 * All earning rates reduced 30% from initial estimates for sustainability.
 * Crypto conversion is a future feature - currently disabled.
 *
 */

// ============ STARTING BALANCE ============
export const STARTING_BALANCE = {
  oranges: 100,
  gems: 0,
};

export const ONBOARDING_REWARDS = {
  tutorial: { oranges: 250, freeCosmetic: true },
  walletConnect: { oranges: 500, requiresNft: true },
};

// ============ CRYPTO CONVERSION (FUTURE FEATURE) ============
export const CRYPTO_CONVERSION = {
  // 10,000 oranges = 1 HOA token
  ORANGES_PER_HOA: 10_000,

  // 1,000 gems = 1 $CHIA token
  GEMS_PER_CHIA: 1_000,

  // Withdrawals currently disabled
  WITHDRAWALS_ENABLED: false,

  // Minimum withdrawal amounts (when enabled)
  MIN_ORANGE_WITHDRAWAL: 100_000, // 10 HOA minimum
  MIN_GEM_WITHDRAWAL: 1_000, // 1 $CHIA minimum
};

// Estimated USD values (for display only, not guaranteed)
export const ESTIMATED_VALUES = {
  HOA_USD: 0.00143,
  CHIA_USD: 0.018,
  XCH_USD: 4.5,
};

// ============ LOGIN REWARDS ============
export const DAILY_LOGIN_REWARDS = [
  { day: 1, oranges: 15, gems: 0 },
  { day: 2, oranges: 30, gems: 0 },
  { day: 3, oranges: 45, gems: 0 },
  { day: 4, oranges: 60, gems: 0 },
  { day: 5, oranges: 75, gems: 0 },
  { day: 6, oranges: 90, gems: 0 },
  { day: 7, oranges: 105, gems: 3 }, // Gems on day 7
];

// Weekly total: 420 oranges + 3 gems

// ============ GAME TIERS & REWARDS ============
export type GameTier = 'easy' | 'medium' | 'hard';

export const GAME_TIERS: Record<
  GameTier,
  {
    baseReward: number;
    highScoreBonus: number;
    top10Bonus: number;
  }
> = {
  easy: { baseReward: 5, highScoreBonus: 10, top10Bonus: 20 },
  medium: { baseReward: 10, highScoreBonus: 15, top10Bonus: 30 },
  hard: { baseReward: 15, highScoreBonus: 20, top10Bonus: 40 },
};

// Max per game: Easy=35, Medium=55, Hard=75

export const GAME_TIER_MAP: Record<string, GameTier> = {
  // Easy tier (5 oranges base)
  'memory-match': 'easy',
  'color-reaction': 'easy',
  'orange-snake': 'easy',
  'citrus-drop': 'easy',
  'wojak-whack': 'easy',

  // Medium tier (10 oranges base)
  'orange-pong': 'medium',
  'merge-2048': 'medium',
  'block-puzzle': 'medium',
  'brick-breaker': 'medium',
  'orange-wordle': 'medium',

  // Hard tier (15 oranges base)
  'flappy-orange': 'hard',
  'wojak-runner': 'hard',
  'orange-stack': 'hard',
  'knife-game': 'hard',
  'orange-juggle': 'hard',
};

// Per-game minimum scores (must reach to earn rewards)
export const GAME_MIN_SCORES: Record<string, number> = {
  // Easy tier
  'memory-match': 4, // Must match 4 pairs
  'color-reaction': 5, // Must get 5 correct
  'orange-snake': 5, // Must eat 5 items
  'citrus-drop': 3, // Must catch 3 items
  'wojak-whack': 5, // Must whack 5 wojaks

  // Medium tier
  'orange-pong': 3, // Must score 3 points
  'merge-2048': 256, // Must reach 256 tile
  'block-puzzle': 100, // Must score 100 points
  'brick-breaker': 50, // Must score 50 points
  'orange-wordle': 1, // Must complete 1 word

  // Hard tier
  'flappy-orange': 5, // Must pass 5 pipes
  'wojak-runner': 100, // Must run 100 meters
  'orange-stack': 5, // Must stack 5 blocks
  'knife-game': 10, // Must stick 10 knives
  'orange-juggle': 10, // Must juggle 10 times
};

// ============ DAILY CHALLENGES ============
export const DAILY_CHALLENGES = {
  easy: { id: 'games-played-5', target: 5, reward: 30, type: 'games_played' as const },
  medium: { id: 'personal-best-1', target: 1, reward: 50, type: 'personal_best' as const },
  hard: { id: 'play-time-600', target: 600, reward: 70, type: 'play_time_seconds' as const },
  // No bonus for completing all 3 - total: 150 oranges
};

export const DAILY_CHALLENGE_MAX = 150; // 30 + 50 + 70

// ============ LEADERBOARD REWARDS ============
export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface RewardTier {
  minRank: number;
  maxRank: number;
  reward: number;
}

export const LEADERBOARD_REWARDS: Record<PeriodType, { tiers: RewardTier[] }> = {
  daily: {
    tiers: [
      { minRank: 1, maxRank: 1, reward: 20 },
      { minRank: 2, maxRank: 2, reward: 15 },
      { minRank: 3, maxRank: 3, reward: 10 },
      { minRank: 4, maxRank: 10, reward: 5 },
      { minRank: 11, maxRank: 20, reward: 2 },
      { minRank: 21, maxRank: 50, reward: 1 },
    ],
  },
  weekly: {
    tiers: [
      { minRank: 1, maxRank: 1, reward: 350 },
      { minRank: 2, maxRank: 2, reward: 210 },
      { minRank: 3, maxRank: 3, reward: 105 },
    ],
  },
  monthly: {
    tiers: [
      { minRank: 1, maxRank: 1, reward: 1400 },
      { minRank: 2, maxRank: 2, reward: 700 },
      { minRank: 3, maxRank: 3, reward: 350 },
    ],
  },
};

// Helper to get reward for a rank
export function getRewardForRank(periodType: PeriodType, rank: number): number {
  const config = LEADERBOARD_REWARDS[periodType];
  const tier = config.tiers.find((t) => rank >= t.minRank && rank <= t.maxRank);
  return tier?.reward || 0;
}

// ============ GEM ECONOMY ============
export const GEM_CONFIG = {
  orangesPerGem: 1500,
  monthlyConversionCap: 10,
  loginStreakGems: 3, // Gems per 7-day streak
};

// ============ SHOP PRICES ============
export const SHOP_PRICES = {
  // Orange items
  common: { min: 500, max: 800 },
  rare: { min: 1000, max: 1500 },
  epic: { min: 2000, max: 2500 },
  limited: { min: 3000, max: 5000 },
  prestige: { min: 10000, max: 50000 },

  // Voting
  votingPack: 50, // 10 donuts OR 10 poops

  // Upgrades
  upgradeLv1ToLv2: 500,
  upgradeLv2ToLv3: 1000,
  colorVariant: 300,
  styleVariant: 500,

  // Gameplay
  continueGame: 50,
};

export const PREMIUM_PRICES = {
  entry: { min: 10, max: 15 },
  mid: { min: 20, max: 25 },
  high: { min: 50, max: 75 },
  ultra: { min: 100, max: 100 },
};

// ============ GIFTING ============
export const GIFTING_CONFIG = {
  dailySendLimit: 500,
  giftedOrangesConvertible: false, // Cannot convert to gems
  premiumItemsGiftable: false, // Soulbound
};

// ============ ANTI-ABUSE ============
export const ANTI_ABUSE = {
  stagedTrustDays: 7,
  stagedTrustMultiplier: 0.5, // 50% rewards for new accounts
  suspiciousGamesPerDay: 50,
  leaderboardReviewDelayHours: 48,
  rookieBracketDays: 30,
};

// ============ GAME IDS ============
export const GAME_IDS = [
  'orange-stack',
  'memory-match',
  'orange-pong',
  'wojak-runner',
  'orange-juggle',
  'knife-game',
  'color-reaction',
  'merge-2048',
  'orange-wordle',
  'block-puzzle',
  'flappy-orange',
  'citrus-drop',
  'orange-snake',
  'brick-breaker',
  'wojak-whack',
] as const;

export type GameId = (typeof GAME_IDS)[number];

// ============ PERIOD HELPERS ============

// Get today's date in UTC (YYYY-MM-DD)
export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

// Get current period key for a given period type
export function getCurrentPeriodKey(periodType: PeriodType): string {
  const now = new Date();

  switch (periodType) {
    case 'daily':
      return now.toISOString().split('T')[0]; // 2026-01-21

    case 'weekly': {
      // Get ISO week number
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`; // 2026-W03
    }

    case 'monthly':
      return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`; // 2026-01

    default:
      throw new Error(`Unknown period type: ${periodType}`);
  }
}

// Get previous period key (for payouts)
export function getPreviousPeriodKey(periodType: PeriodType): string {
  const now = new Date();

  switch (periodType) {
    case 'daily': {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    case 'weekly': {
      const lastWeek = new Date(now);
      lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
      // Recalculate week key for last week
      const d = new Date(Date.UTC(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    }

    case 'monthly': {
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      return `${lastMonth.getUTCFullYear()}-${(lastMonth.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    default:
      throw new Error(`Unknown period type: ${periodType}`);
  }
}

// Get milliseconds until midnight UTC
export function getTimeUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
