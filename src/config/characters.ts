/**
 * Character Type Configuration
 *
 * Registry of all character types in the Wojak Farmers Plot collection.
 * Total: 4,200 NFTs across 14 character types.
 */

import type { CharacterTypeConfig, CharacterType } from '@/types/nft';

export const CHARACTER_TYPES: CharacterTypeConfig[] = [
  {
    id: 'wojak',
    name: 'Wojak',
    shortName: 'Wojak',
    description: 'The classic Wojak, farming the fields of Chia',
    count: 800,
    previewImage: '/assets/gallery-previews/wojak.webp',
  },
  {
    id: 'soyjak',
    name: 'Soyjak',
    shortName: 'Soyjak',
    description: 'The enthusiastic Soyjak, excited about everything',
    count: 700,
    previewImage: '/assets/gallery-previews/soyjak.webp',
  },
  {
    id: 'waifu',
    name: 'Waifu',
    shortName: 'Waifu',
    description: 'The elegant Waifu of the Tang Gang',
    count: 500,
    previewImage: '/assets/gallery-previews/waifu.webp',
  },
  {
    id: 'baddie',
    name: 'Baddie',
    shortName: 'Baddie',
    description: 'The confident Baddie, running the show',
    count: 500,
    previewImage: '/assets/gallery-previews/baddie.webp',
  },
  {
    id: 'papa-tang',
    name: 'Papa Tang',
    shortName: 'Papa',
    description: 'The legendary Papa Tang, founder of the farm',
    count: 100,
    previewImage: '/assets/gallery-previews/papa-tang.webp',
    accentColor: '#ff8c00',
  },
  {
    id: 'monkey-zoo',
    name: 'Monkey Zoo',
    shortName: 'Monkey',
    description: 'The wild Monkey Zoo crew',
    count: 300,
    previewImage: '/assets/gallery-previews/monkey-zoo.webp',
  },
  {
    id: 'bepe-wojak',
    name: 'Bepe Wojak',
    shortName: 'B-Wojak',
    description: 'Wojak channeling Bepe energy',
    count: 200,
    previewImage: '/assets/gallery-previews/bepe-wojak.webp',
    accentColor: '#4ade80',
  },
  {
    id: 'bepe-soyjak',
    name: 'Bepe Soyjak',
    shortName: 'B-Soyjak',
    description: 'Soyjak with rare Bepe traits',
    count: 200,
    previewImage: '/assets/gallery-previews/bepe-soyjak.webp',
    accentColor: '#4ade80',
  },
  {
    id: 'bepe-waifu',
    name: 'Bepe Waifu',
    shortName: 'B-Waifu',
    description: 'Waifu with rare Bepe traits',
    count: 200,
    previewImage: '/assets/gallery-previews/bepe-waifu.webp',
    accentColor: '#4ade80',
  },
  {
    id: 'bepe-baddie',
    name: 'Bepe Baddie',
    shortName: 'B-Baddie',
    description: 'Baddie with rare Bepe traits',
    count: 200,
    previewImage: '/assets/gallery-previews/bepe-baddie.webp',
    accentColor: '#4ade80',
  },
  {
    id: 'alien-wojak',
    name: 'Alien Wojak',
    shortName: 'A-Wojak',
    description: 'Wojak from beyond the stars',
    count: 150,
    previewImage: '/assets/gallery-previews/alien-wojak.webp',
    accentColor: '#a855f7',
  },
  {
    id: 'alien-soyjak',
    name: 'Alien Soyjak',
    shortName: 'A-Soyjak',
    description: 'Soyjak abducted and enhanced',
    count: 150,
    previewImage: '/assets/gallery-previews/alien-soyjak.webp',
    accentColor: '#a855f7',
  },
  {
    id: 'alien-waifu',
    name: 'Alien Waifu',
    shortName: 'A-Waifu',
    description: 'Waifu of extraterrestrial origin',
    count: 100,
    previewImage: '/assets/gallery-previews/alien-waifu.webp',
    accentColor: '#a855f7',
  },
  {
    id: 'alien-baddie',
    name: 'Alien Baddie',
    shortName: 'A-Baddie',
    description: 'Baddie from another dimension',
    count: 100,
    previewImage: '/assets/gallery-previews/alien-baddie.webp',
    accentColor: '#a855f7',
  },
];

// Total NFT count
export const TOTAL_NFT_COUNT = CHARACTER_TYPES.reduce((sum, type) => sum + type.count, 0);

/**
 * Get character config by ID
 */
export function getCharacterConfig(id: CharacterType): CharacterTypeConfig | undefined {
  return CHARACTER_TYPES.find((c) => c.id === id);
}

/**
 * Get accent color for character type (falls back to brand primary)
 */
export function getCharacterAccentColor(id: CharacterType): string {
  const config = getCharacterConfig(id);
  return config?.accentColor || 'var(--color-primary)';
}
