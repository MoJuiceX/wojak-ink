// src/config/aiEnhancePresets.ts

import type { AICategory } from '@/types/aiEnhance';

export interface AIPreset {
  label: string;
  prompt: string;
}

export const AI_PRESETS: Record<AICategory, AIPreset[]> = {
  clothes: [
    { label: '🔥 Flame pattern',    prompt: 'Add a flame pattern' },
    { label: '🐯 Tiger print',      prompt: 'Add tiger print' },
    { label: '✨ Gold embroidery',   prompt: 'Add gold embroidery' },
    { label: '🎨 Tie-dye',          prompt: 'Make it tie-dye' },
    { label: '💎 Diamond studs',    prompt: 'Add diamond studs' },
    { label: '🌲 Camouflage',       prompt: 'Add camouflage pattern' },
    { label: '🏁 Racing stripes',   prompt: 'Add racing stripes' },
    { label: '👴 Vintage wash',     prompt: 'Make it look vintage washed' },
  ],
  head: [
    { label: '⚔️ Battle-worn',     prompt: 'Add battle-worn dents and scratches' },
    { label: '✨ Gold plating',     prompt: 'Make it gold plated' },
    { label: '💎 Diamond encrusted', prompt: 'Make it diamond encrusted' },
    { label: '🔩 Rusty metal',      prompt: 'Make it look like rusty metal' },
    { label: '💡 Neon glow trim',   prompt: 'Add neon glow trim' },
    { label: '🧸 Fur-lined',        prompt: 'Add fur lining' },
    { label: '🎨 Graffiti paint',   prompt: 'Add graffiti paint' },
  ],
  facewear: [
    { label: '⚙️ Steampunk goggles',  prompt: 'Steampunk brass goggles' },
    { label: '💎 Diamond monocle',     prompt: 'Diamond-encrusted monocle' },
    { label: '🤖 Cyberpunk visor',     prompt: 'Cyberpunk LED visor' },
    { label: '🕶️ Aviator sunglasses', prompt: 'Aviator sunglasses with orange lenses' },
    { label: '🎭 Phantom mask',        prompt: 'Opera phantom half-mask' },
    { label: '📡 AR holographic',      prompt: 'AR holographic display glasses' },
    { label: '🥇 Gold spectacles',     prompt: 'Gold-rimmed round spectacles' },
  ],
  background: [
    { label: '🌃 Tokyo neon',       prompt: 'Tokyo neon alley at night with rain reflections' },
    { label: '🐠 Coral reef',       prompt: 'Underwater coral reef with tropical fish' },
    { label: '🏰 Castle throne',    prompt: 'Medieval castle throne room with torches' },
    { label: '🚀 Spaceship',        prompt: 'Inside a spaceship cockpit with stars visible' },
    { label: '🌇 Skyscraper',       prompt: 'On top of a skyscraper at golden hour sunset' },
    { label: '🌧️ Cyberpunk rain',  prompt: 'Cyberpunk city street in the rain' },
    { label: '🏠 Cozy cabin',       prompt: 'Cozy cabin interior with fireplace' },
  ],
};

// Extended pool for randomizer (presets + extras)
export const AI_RANDOMIZER_POOL: Record<AICategory, string[]> = {
  clothes: [
    ...AI_PRESETS.clothes.map((p) => p.prompt),
    'Add pixel art pattern',
    'Make it look like denim',
    'Add gold chain stitching',
    'Make it sparkle with glitter',
    'Add a plaid pattern',
    'Make it look like leather',
    'Add neon trim',
    'Make it look knitted',
    'Add a galaxy print',
    'Make it look like silk',
  ],
  head: [
    ...AI_PRESETS.head.map((p) => p.prompt),
    'Add flames coming off the top',
    'Make it look frozen with ice',
    'Add LED lights',
    'Make it chrome',
    'Add tribal engravings',
    'Make it translucent',
    'Add spikes and studs',
  ],
  facewear: [
    ...AI_PRESETS.facewear.map((p) => p.prompt),
    'Welding goggles with green lenses',
    'Cat-eye glasses with jewels',
    'Futuristic transparent visor',
    'Round John Lennon glasses',
    'Ski goggles with mirror coating',
    'Smart glasses with HUD display',
    'Butterfly masquerade mask',
    'Gas mask with colored filters',
  ],
  background: [
    ...AI_PRESETS.background.map((p) => p.prompt),
    'Inside a volcano with lava flows',
    'Floating island in the clouds',
    'Deep space nebula',
    'Ancient Egyptian temple',
    'Inside a submarine looking through porthole',
    'Japanese zen garden at dawn',
    'Apocalyptic wasteland',
    'Inside the Matrix with green code',
    'Art deco luxury lounge',
    'Tropical beach at sunset',
  ],
};

export function getRandomPrompt(category: AICategory): string {
  const pool = AI_RANDOMIZER_POOL[category];
  return pool[Math.floor(Math.random() * pool.length)];
}
