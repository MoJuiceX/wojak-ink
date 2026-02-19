// Supply counter hype messages by mint tier
export const HYPE_TIERS: { maxMinted: number; messages: string[] }[] = [
  {
    maxMinted: 10,
    messages: [
      'Single digits. Legendary.',
      "You're looking at genesis-tier scarcity.",
      'Fewer than 10 in existence.',
      'The first chapter is being written.',
      'History starts here.',
    ],
  },
  {
    maxMinted: 50,
    messages: [
      'First wave minter territory.',
      'Under 50 — the OG club.',
      'This early? Respect.',
      'The collection is just beginning.',
      'Early adopter energy.',
    ],
  },
  {
    maxMinted: 100,
    messages: [
      'Sub-100 club is still open.',
      "Double digits won't last.",
      'Still in the first hundred.',
      'The ground floor is right here.',
      "Under 100 — blink and it's gone.",
    ],
  },
  {
    maxMinted: 500,
    messages: [
      'The collection is taking shape.',
      'Under 500 — still early.',
      'Momentum is building.',
      'The first 500 define the collection.',
      'Building something real.',
    ],
  },
  {
    maxMinted: 1000,
    messages: [
      'Past 500. The movement is real.',
      'Heating up.',
      'Four figures incoming.',
      'The community is growing.',
      'Word is spreading.',
    ],
  },
  {
    maxMinted: 2100,
    messages: [
      'Past the halfway mark.',
      'Over 1,000 Wojaks walk the chain.',
      'The floor has a memory.',
      'Halfway there. The window is closing.',
      'The collection speaks for itself.',
    ],
  },
  {
    maxMinted: 3500,
    messages: [
      'Over half claimed. Tick tock.',
      'Supply shrinking fast.',
      'The window is closing.',
      'Scarcity is setting in.',
      'The late game has begun.',
    ],
  },
  {
    maxMinted: 4100,
    messages: [
      'Final stretch. Under 700 left.',
      'This is the endgame.',
      'Late minters pay more. But they still mint.',
      'Almost gone.',
      'The end is in sight.',
    ],
  },
  {
    maxMinted: 4190,
    messages: [
      'Double digits remaining.',
      'Count them on your fingers.',
      'Almost over.',
      'The last few.',
      "Blink and they're gone.",
    ],
  },
  {
    maxMinted: 4200,
    messages: [
      'Single digits left. Last call.',
      'The final chapter.',
      'History in the making.',
      'The last ones standing.',
      'This is it.',
    ],
  },
];

export function getHypeLine(minted: number): string {
  const tier = HYPE_TIERS.find((t) => minted <= t.maxMinted) || HYPE_TIERS[HYPE_TIERS.length - 1];
  return tier.messages[Math.floor(Math.random() * tier.messages.length)];
}

export type StatInput = {
  minted: number;
  total: number;
};

export function getStatLine(input: StatInput): string {
  const { minted, total } = input;
  const remaining = total - minted;
  const pct = ((remaining / total) * 100).toFixed(1);

  const stats: string[] = [
    `${pct}% of supply still unminted`,
    `${remaining.toLocaleString()} slots remaining`,
  ];

  if (minted < 100) {
    stats.push(`Only ${minted} Wojaks on-chain`);
  }

  stats.push('Base price: 0.20 XCH');

  return stats[Math.floor(Math.random() * stats.length)];
}
