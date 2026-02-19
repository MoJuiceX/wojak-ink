/* eslint-disable react-refresh/only-export-components */
/**
 * BigPulp Component
 *
 * The Tang Gang mascot - an adult orange with glasses.
 * Customizable with hats, moods, and accessories.
 * Appears on profile, in games, and in achievement drawer.
 */

import { useState, useEffect } from 'react';

type BigPulpMood = 'happy' | 'chill' | 'sleepy' | 'hype' | 'grumpy' | 'sergeant' | 'numb' | 'rekt';

interface BigPulpProps {
  hat?: string | null;
  mood?: BigPulpMood;
  accessory?: string | null;
  size?: 'small' | 'medium' | 'large';
  dialogue?: string;
  showDialogue?: boolean;
  className?: string;
}

// Hat emoji mappings
const hatEmojis: Record<string, string> = {
  'bigpulp-hat-party': '🎉',
  'bigpulp-hat-cowboy': '🤠',
  'bigpulp-hat-chef': '👨‍🍳',
  'bigpulp-hat-viking': '⚔️',
  'bigpulp-hat-pirate': '🏴‍☠️',
  'bigpulp-hat-beret': '🎨',
  'bigpulp-hat-tophat': '🎩',
  'bigpulp-hat-wizard': '🧙',
  'bigpulp-hat-devil': '😈',
  'bigpulp-hat-crown': '👑',
  'bigpulp-hat-halo': '😇',
  // Shorthand versions
  'party': '🎉',
  'cowboy': '🤠',
  'chef': '👨‍🍳',
  'viking': '⚔️',
  'pirate': '🏴‍☠️',
  'beret': '🎨',
  'tophat': '🎩',
  'wizard': '🧙',
  'devil': '😈',
  'crown': '👑',
  'halo': '😇',
};

// Mood animation classes
const moodAnimations: Record<BigPulpMood, string> = {
  happy: 'bigpulp-bob',
  chill: 'bigpulp-float',
  sleepy: 'bigpulp-breathe',
  hype: 'bigpulp-bounce',
  grumpy: 'bigpulp-shake',
  sergeant: 'bigpulp-attention',
  numb: 'bigpulp-still',
  rekt: 'bigpulp-drip',
};

// Mood expressions (eyes/mouth styling)
const moodExpressions: Record<BigPulpMood, { eyes: string; mouth: string }> = {
  happy: { eyes: '◡◡', mouth: '‿' },
  chill: { eyes: '−−', mouth: '‿' },
  sleepy: { eyes: '︶︶', mouth: 'ω' },
  hype: { eyes: '◉◉', mouth: 'D' },
  grumpy: { eyes: '︵︵', mouth: '︿' },
  sergeant: { eyes: '▬▬', mouth: '─' },
  numb: { eyes: '◯◯', mouth: '─' },
  rekt: { eyes: '×̷×', mouth: '△' },
};

// Size configurations
const sizeConfigs = {
  small: { container: 'w-16 h-16', body: 'w-12 h-12', hat: 'text-lg', glasses: 'text-xs' },
  medium: { container: 'w-24 h-24', body: 'w-16 h-16', hat: 'text-xl', glasses: 'text-sm' },
  large: { container: 'w-32 h-32', body: 'w-24 h-24', hat: 'text-2xl', glasses: 'text-base' },
};

export function BigPulp({
  hat = null,
  mood = 'happy',
  accessory = null,
  size = 'medium',
  dialogue,
  showDialogue = false,
  className = '',
}: BigPulpProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animation = moodAnimations[mood];
  const expression = moodExpressions[mood];
  const config = sizeConfigs[size];
  const hatEmoji = hat ? (hatEmojis[hat] || '🎩') : null;

  // Trigger animation on dialogue change
  useEffect(() => {
    if (dialogue) {
      queueMicrotask(() => setIsAnimating(true));
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [dialogue]);

  return (
    <div className={`bigpulp-wrapper flex flex-col items-center ${className}`}>
      {/* BigPulp Body */}
      <div className={`bigpulp-container relative ${config.container} ${animation} ${isAnimating ? 'scale-110' : ''} transition-transform`}>
        {/* Hat (if equipped) */}
        {hatEmoji && (
          <div className={`bigpulp-hat absolute -top-4 left-1/2 -translate-x-1/2 ${config.hat}`}>
            {hatEmoji}
          </div>
        )}

        {/* Orange Body */}
        <div
          className={`bigpulp-body ${config.body} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg relative flex items-center justify-center mx-auto`}
          style={{
            boxShadow: '0 4px 20px var(--color-primary-40), inset 0 -4px 10px var(--color-black-20)',
          }}
        >
          {/* Glasses */}
          <div className={`bigpulp-glasses ${config.glasses} absolute top-1/3`}>
            🕶️
          </div>

          {/* Expression (below glasses) */}
          <div className="absolute bottom-1/4 text-xs text-white/80">
            {expression.mouth}
          </div>

          {/* Rekt mode - bleeding effect */}
          {mood === 'rekt' && (
            <div className="absolute top-1/3 left-1/4 text-red-500 text-xs animate-drip">
              💧
            </div>
          )}
        </div>

        {/* Accessory */}
        {accessory && (
          <div className={`bigpulp-accessory absolute ${getAccessoryPosition(accessory)}`}>
            {getAccessoryEmoji(accessory)}
          </div>
        )}
      </div>

      {/* Dialogue Bubble */}
      {showDialogue && dialogue && (
        <div className="bigpulp-dialogue mt-3 max-w-xs">
          <div className="dialogue-bubble bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm text-center relative">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-white/10">▲</span>
            💬 {dialogue}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for accessories
function getAccessoryPosition(accessory: string): string {
  const positions: Record<string, string> = {
    'bigpulp-acc-bowtie': 'bottom-0 left-1/2 -translate-x-1/2',
    'bigpulp-acc-bandana': 'top-1/4 left-1/2 -translate-x-1/2',
    'bigpulp-acc-earring': 'top-1/2 -right-1',
    'bigpulp-acc-headphones': 'top-1/4 left-1/2 -translate-x-1/2',
    'bigpulp-acc-cigar': 'bottom-1/4 -right-2',
    'bigpulp-acc-monocle': 'top-1/3 left-1/4',
    'bigpulp-acc-scar': 'top-1/2 left-1/3',
    // Shorthand
    'bowtie': 'bottom-0 left-1/2 -translate-x-1/2',
    'bandana': 'top-1/4 left-1/2 -translate-x-1/2',
    'earring': 'top-1/2 -right-1',
    'headphones': 'top-1/4 left-1/2 -translate-x-1/2',
    'cigar': 'bottom-1/4 -right-2',
    'monocle': 'top-1/3 left-1/4',
    'scar': 'top-1/2 left-1/3',
  };
  return positions[accessory] || 'bottom-0';
}

function getAccessoryEmoji(accessory: string): string {
  const emojis: Record<string, string> = {
    'bigpulp-acc-bowtie': '🎀',
    'bigpulp-acc-bandana': '🧣',
    'bigpulp-acc-earring': '💎',
    'bigpulp-acc-headphones': '🎧',
    'bigpulp-acc-cigar': '🚬',
    'bigpulp-acc-monocle': '🧐',
    'bigpulp-acc-scar': '⚡',
    // Shorthand
    'bowtie': '🎀',
    'bandana': '🧣',
    'earring': '💎',
    'headphones': '🎧',
    'cigar': '🚬',
    'monocle': '🧐',
    'scar': '⚡',
  };
  return emojis[accessory] || '';
}

// BigPulp Dialogue System
interface DialogueEntry {
  text: string;
  mood: BigPulpMood;
}

const WIN_DIALOGUES: DialogueEntry[] = [
  { text: "WINNERS WIN, BABY! 🍊", mood: "hype" },
  { text: "That's what I'm talking about!", mood: "hype" },
  { text: "The Grove is proud of you!", mood: "happy" },
  { text: "Now THAT'S how it's done!", mood: "sergeant" },
  { text: "You absolute legend.", mood: "chill" },
];

const LOSS_DIALOGUES: DialogueEntry[] = [
  { text: "Paper hands detected... Try again!", mood: "grumpy" },
  { text: "Even legends have bad days. Run it back!", mood: "chill" },
  { text: "The beret stays on. So do you. Again.", mood: "sergeant" },
  { text: "That was rough. But we don't quit.", mood: "numb" },
  { text: "Accept cookies and try again.", mood: "grumpy" },
];

const DRAWER_DIALOGUES: Record<string, DialogueEntry[]> = {
  small: [
    { text: "Nice start! Keep grinding, seedling.", mood: "happy" },
    { text: "Everyone starts somewhere. Keep at it!", mood: "chill" },
  ],
  medium: [
    { text: "Now we're talking! The Grove recognizes you.", mood: "happy" },
    { text: "Solid collection. You're getting there!", mood: "hype" },
  ],
  large: [
    { text: "ABSOLUTE UNIT. This drawer is STACKED!", mood: "hype" },
    { text: "Look at this flex! Impressive.", mood: "sergeant" },
  ],
  legendary: [
    { text: "You madlad. You actually got them all. 👑", mood: "hype" },
    { text: "This is what PEAK performance looks like.", mood: "sergeant" },
  ],
};

export function getBigPulpDialogue(
  context: 'win' | 'loss' | 'drawer' | 'game_start',
  options?: { collectionSize?: number; score?: number }
): DialogueEntry {
  let pool: DialogueEntry[];

  switch (context) {
    case 'win':
      pool = WIN_DIALOGUES;
      break;
    case 'loss':
      pool = LOSS_DIALOGUES;
      break;
    case 'drawer': {
      const size = options?.collectionSize || 0;
      if (size >= 50) pool = DRAWER_DIALOGUES.legendary;
      else if (size >= 20) pool = DRAWER_DIALOGUES.large;
      else if (size >= 10) pool = DRAWER_DIALOGUES.medium;
      else pool = DRAWER_DIALOGUES.small;
      break;
    }
    default:
      pool = [{ text: "Let's do this! 🍊", mood: "hype" }];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export type { BigPulpMood, BigPulpProps };
