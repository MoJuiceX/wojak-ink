// GET /api/profile/random-name — Generate a random fun name

interface Env {
  DB: D1Database;
}

// Random name generation components
const ADJECTIVES = [
  'Based', 'Degen', 'Diamond', 'Paper', 'Crypto', 'Moon', 'Alpha',
  'Gigachad', 'Wojak', 'Pepe', 'Dank', 'Epic', 'Rare', 'Golden',
  'Mega', 'Ultra', 'Super', 'Turbo', 'Hyper', 'Cosmic', 'Sigma',
  'Giga', 'Meme', 'Comfy', 'Cozy', 'Stoic', 'Zen', 'Pixel',
];

const NOUNS = [
  'Wojak', 'Anon', 'Chad', 'Holder', 'Trader', 'Farmer', 'Ape',
  'Bull', 'Bear', 'Whale', 'Shrimp', 'Goblin', 'Fren', 'Degen',
  'King', 'Lord', 'Master', 'Wizard', 'Sage', 'Hunter', 'Knight',
  'Punk', 'Ninja', 'Samurai', 'Viking', 'Pirate', 'Chimp', 'Otter',
];

function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return Response.json({ name: generateRandomName() });
};
