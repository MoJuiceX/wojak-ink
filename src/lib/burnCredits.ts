// Burn credit estimation — shared between frontend (CollectionScroll modal) and backend (burn.ts).
// Credits are in centis (100 = 1 credit).

export function calculateBurnCredits(likes: number, dislikes: number): number {
  const total = likes + dislikes;
  if (total === 0) return 500; // Unvoted = 5 credits

  const dislikeRatio = dislikes / total;

  // Heavily disliked (>70%): 20 credits
  // Moderately disliked (50-70%): 12 credits
  // Neutral (30-50%): 5 credits
  // Liked (<30%): 2 credits
  if (dislikeRatio > 0.7) return 2000;
  if (dislikeRatio > 0.5) return 1200;
  if (dislikeRatio > 0.3) return 500;
  return 200;
}
