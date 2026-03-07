import type { MoodTag } from './moodMap';

export interface MoodPool {
  adjectives: string[];
  nouns: string[];
  titles: string[];
  fullNames: string[];
  hint: string;
}

/**
 * 16 mood-specific word pools for the Wojak name randomizer.
 *
 * CONSTRAINT: MAX_NAME_LENGTH = 15
 *   - Every fullName <= 15 chars
 *   - Every adj + " " + noun <= 15 chars
 *   - Every title + " " + noun <= 15 chars
 *
 * v2 — enriched with crypto/Chia/gamer/internet culture words.
 * Each pool targets ~18 adj, ~18 nouns, ~10 titles, ~25 fullNames.
 */
export const MOOD_POOLS: Record<MoodTag, MoodPool> = {
  aggressive: {
    adjectives: [
      'Rekt', 'Savage', 'Brutal', 'Feral', 'Lethal', 'Wicked',
      'Rabid', 'Cruel', 'Mad', 'Primal', 'Bloody', 'Grim', 'Iron',
      'Nuclear', 'Crazed', 'Cracked', 'Goated', 'Toxic',
    ],
    nouns: [
      'Rage', 'Fury', 'Hands', 'Beast', 'Fist', 'Storm',
      'Pain', 'Carnage', 'Strike', 'Havoc', 'Wreck', 'Doom', 'Rush',
      'Blitz', 'Force', 'Diff', 'Frag', 'Grief',
    ],
    titles: [
      'Warlord', 'General', 'Sgt', 'Cpt', 'Killer', 'Slayer', 'Boss',
      'Victor', 'Reaper', 'Brute',
    ],
    fullNames: [
      'Rekt Em All', 'Mad Lad', 'No Mercy', 'Rage Quit', 'Git Gud',
      '1v1 Me Bro', 'Salt Mine', 'Tryhard Andy', 'Double Kill',
      'Spawn Kill', 'GG EZ', 'Zero Chill', 'Iron Fist', 'Raw Dawg',
      'Total Rekt', 'Overkill', 'Pain Train', 'GG No Re', 'Final Boss',
      'Wreck It', 'Tilt God', 'Blood Moon', 'Brute Force', 'Built Diff',
      'Combo Break',
    ],
    hint: 'e.g. Rage Quit',
  },

  rebellious: {
    adjectives: [
      'Rogue', 'Based', 'Punk', 'Wild', 'Feral', 'Outlaw', 'Untamed',
      'Defiant', 'Rebel', 'Reckless', 'Bold', 'Brazen', 'Raw', 'Loose',
      'Free', 'Lone', 'Stray', 'Ratio',
    ],
    nouns: [
      'Anon', 'Rebel', 'Wolf', 'Outlaw', 'Riot', 'Punk', 'Rogue',
      'Menace', 'Cannon', 'Exile', 'Pirate', 'Raider', 'Vandal',
      'Flame', 'Cope', 'Fury', 'Storm', 'Ratio',
    ],
    titles: [
      'Don', 'Capo', 'Chief', 'Baron', 'Kingpin', 'OG', 'Bandit',
      'Outlaw', 'Rogue', 'Pirate',
    ],
    fullNames: [
      'No Rules', 'Send It', 'Cope Harder', 'Anon Rage', 'Stay Mad',
      'Touch Grass', 'Honk Honk', 'Not Ur Fren', 'Cry More',
      'Seethe Cope', 'Flip Table', 'GFY King', 'Mad Online', 'Born Wild',
      'Lone Wolf', 'Exit Scam', 'L Bozo', 'Bail Out', 'On Sight',
      'Foul Play', 'Not Sorry', "Ratio'd", 'Talk Cheap', 'No Cap',
      'Rebel OG',
    ],
    hint: 'e.g. No Rules',
  },

  degen: {
    adjectives: [
      'Diamond', 'Paper', 'Rekt', 'HODL', 'Degen', 'Whale', 'Rug',
      'Pump', 'Based', 'Moon', 'Bull', 'Bear', 'Ape', 'Shrimp', 'Bag',
      'Mojo', 'XCH', 'Airdrop',
    ],
    nouns: [
      'Hands', 'Bags', 'Maxi', 'Trader', 'Ape', 'HODL', 'Whale',
      'Pump', 'Dump', 'Moon', 'Stack', 'Vault', 'Coin', 'Pool', 'Mojo',
      'XCH', 'Plot', 'CAT',
    ],
    titles: [
      'CEO', 'Whale', 'Shark', 'Alpha', 'Sigma', 'OG', 'Degen', 'Maxi',
      'Bull', 'Baron',
    ],
    fullNames: [
      'Rug Pulled', 'Ape In', 'Moon Soon', 'HODL Gang', 'Bag Holder',
      'Send Nodes', 'In It 4 Tech', 'Ngmi Bro', 'XCH Maxi',
      '1 More Trade', 'Rekt Again', 'Paper Hands', 'Pump N Pray',
      'All In', 'Floor Price', 'Mojo Maxi', 'Plot Gang', 'Whale Alert',
      'Seed Phrase', 'Tang Maxi', 'Pulp Gang',
      'Citrus Peel', 'Bepe Maxi', 'Honk Bag', 'Airdrop SZN',
    ],
    hint: 'e.g. XCH Maxi',
  },

  chill: {
    adjectives: [
      'Comfy', 'Chill', 'Zen', 'Mellow', 'Cozy', 'Smooth', 'Sleepy',
      'Easy', 'Warm', 'Soft', 'Calm', 'Lazy', 'Quiet', 'Bliss',
      'Gentle', 'Slow', 'AFK', 'Peak',
    ],
    nouns: [
      'Fren', 'Vibes', 'Lurk', 'Zone', 'Life', 'Soul', 'Wave', 'Dream',
      'Cloud', 'Breeze', 'Flow', 'Mood', 'Sage', 'Brain', 'Nap',
      'Aura', 'Haven', 'Rest',
    ],
    titles: [
      'Master', 'Guru', 'Sensei', 'Elder', 'Sage', 'Chief', 'Captain',
      'Saint', 'Blessed', 'Pure',
    ],
    fullNames: [
      'Comfy Fren', 'Vibe Check', 'Feels Good', 'Easy Mode', 'No Stress',
      'All Good', 'Stay Comfy', 'Zen Mode', 'Chill Pill', 'No FUD',
      'Smooth Brain', 'Nap King', 'AFK Life', 'Peak Comfy', 'Low Effort',
      'Zero Rush', 'Just Vibin', 'Stay Cozy', 'Pillow Fort',
      'Snooze King', 'Tea Time', 'Slow Roll', 'Soft Hands',
      'Inner Peace', 'Cloud Nine',
    ],
    hint: 'e.g. Comfy Fren',
  },

  goofy: {
    adjectives: [
      'Honk', 'Turbo', 'Mega', 'Giga', 'Ultra', 'Wacky', 'Cursed',
      'Weird', 'Clown', 'Meme', 'Rare', 'Epic', 'Super', 'Cringe',
      'Bruh', 'Sussy', 'Smol', 'Chonk',
    ],
    nouns: [
      'Goblin', 'NPC', 'Clown', 'Brain', 'Hands', 'Gremlin', 'Fiend',
      'Maniac', 'Enjoyer', 'Kek', 'Copium', 'Gang', 'Unit', 'Legend',
      'Bot', 'Honk', 'Goon', 'Lad',
    ],
    titles: [
      'Don', 'Honk', 'Chief', 'Supreme', 'Grand', 'Mega', 'Ultra',
      'Emperor', 'Captain', 'Mayor',
    ],
    fullNames: [
      'Honk Pilled', 'Clown World', 'This Is Fine', 'Rare Pepe',
      'NPC Brain', 'Weird Flex', 'Skill Issue', 'Bruh Moment',
      'Copium Max', 'Sussy Baka', 'Giga Brain', 'Goose Loose',
      'Down Bad', 'Kek W', 'OK Boomer', 'Meme God', 'Turbo Honk',
      'Epic Fail', 'Big If True', 'No Cap', 'L + Ratio', 'Deez Nuts',
      '404 Brain', 'Trust Me Bro', 'Brain Rot',
    ],
    hint: 'e.g. Honk Pilled',
  },

  elite: {
    adjectives: [
      'Alpha', 'Sigma', 'Prime', 'Grand', 'Royal', 'Top', 'Big',
      'Whale', 'Shark', 'Bull', 'Boss', 'Chief', 'Gold', 'Lux', 'Rich',
      'Noble', 'High', 'Peak',
    ],
    nouns: [
      'Fund', 'Stack', 'Bags', 'Money', 'Class', 'Suite', 'Club',
      'Insider', 'Vault', 'Mogul', 'Throne', 'Empire', 'Crown', 'Power',
      'Maxi', 'Titan', 'Deal', 'LP',
    ],
    titles: [
      'CEO', 'CFO', 'Don', 'Duke', 'Baron', 'Lord', 'Prince', 'Count',
      'Mogul', 'Tycoon',
    ],
    fullNames: [
      'Wolf of Wall', 'CEO of Bags', 'Bull Chad', 'Whale Alert',
      'Big Money', 'Top Trader', 'Stack King', 'Sigma Male',
      'Alpha Gains', 'Old Money', 'New Money', 'Power Move', 'Early AF',
      'Royal Flush', 'Profit King', 'Market Cap', 'Blue Chip',
      'Smart Money', 'Tang Baron', 'Bepe Elite',
      'Pump King', 'Bag Secured', 'Net Worth', 'Rank One', 'Insider OG',
    ],
    hint: 'e.g. Smart Money',
  },

  dark: {
    adjectives: [
      'Dark', 'Shadow', 'Void', 'Grim', 'Doom', 'Dread', 'Fell',
      'Bleak', 'Ashen', 'Black', 'Hollow', 'Rugged', 'Ghost', 'Dead',
      'Lost', 'Faded', 'Numb', 'Cold',
    ],
    nouns: [
      'Lord', 'Knight', 'Walker', 'Abyss', 'Reaper', 'Shade', 'Wraith',
      'Bane', 'Soul', 'Edge', 'Doom', 'Night', 'Void', 'Crypt',
      'Husk', 'Echo', 'End', 'Pit',
    ],
    titles: [
      'Lord', 'Baron', 'Count', 'Overlord', 'Master', 'Regent',
      'Archon', 'Prince', 'Warden', 'Tyrant',
    ],
    fullNames: [
      'Void Walker', 'Dark Lord', 'Its Joever', 'Edge Lord', 'Down Only',
      'Dead Inside', 'Doomer Mode', 'No Hope', 'Its Over', 'Black Pill',
      'Final Form', 'Dark Soul', 'Game Over', 'You Died', 'Hollow Man',
      'Grim One', 'Night Shade', 'Fade Away', 'Gone Dark', 'Cold Hands',
      'Lost Cause', 'Soul Rekt', 'The End', 'No Return', 'Dark Wojak',
    ],
    hint: 'e.g. Its Joever',
  },

  mystical: {
    adjectives: [
      'Arcane', 'Mystic', 'Elder', 'Ancient', 'Rune', 'Crystal',
      'Frost', 'Flame', 'Storm', 'Shadow', 'Astral', 'Ether', 'Chaos',
      'Blood', 'Iron', 'Stone', 'Spell', 'Fey',
    ],
    nouns: [
      'Wizard', 'Mage', 'Sage', 'Seer', 'Monk', 'Oracle', 'Druid',
      'Shaman', 'Walker', 'Blade', 'Crit', 'Proc', 'Master', 'Guard',
      'Ward', 'Weaver', 'Cast', 'Buff',
    ],
    titles: [
      'Archmage', 'Elder', 'Sage', 'Oracle', 'High', 'Grand', 'Ancient',
      'Seer', 'Keeper', 'Lore',
    ],
    fullNames: [
      'Arcane Drip', 'Rune Master', 'Mana Burn', 'RNG God',
      'Spell Slap', 'Wizard Sage', 'Dark Magic', 'Ice Wizard', 'Fire Sage',
      'Moon Druid', 'Soul Reaver', 'Mind Blast', 'Potion Brew',
      'Crit Dmg', 'Chaos Mage', 'XP Farm', 'Loot Drop', 'Magic Find',
      'Buff Stack', 'Heal Bot', 'Nerf This', 'Mana Pool', 'Crit Hit',
      'Spell Book', 'Rune Carver',
    ],
    hint: 'e.g. RNG God',
  },

  warrior: {
    adjectives: [
      'Iron', 'Steel', 'Brave', 'True', 'Sworn', 'Battle', 'War',
      'Siege', 'Clutch', 'Recon', 'Delta', 'Bravo', 'Grunt', 'Heavy',
      'Sharp', 'Hard', 'Rough', 'Grit',
    ],
    nouns: [
      'Squad', 'Force', 'Guard', 'Arms', 'Chief', 'Six', 'Actual',
      'Dog', 'Shield', 'Blade', 'Sword', 'Helm', 'Spear', 'Wall',
      'Gate', 'Tower', 'Frag', 'Clutch',
    ],
    titles: [
      'Sgt', 'Cpt', 'Major', 'Colonel', 'General', 'Pvt', 'Cmdr', 'Lt',
      'Warlord', 'Marshal',
    ],
    fullNames: [
      'Sgt Degen', 'Iron Hands', 'Bravo Six', 'Tank Rush', 'Shell Shock',
      'Clutch God', 'Boot Camp', 'War Ape', 'Delta Force', 'Foxhound',
      'Hawk Eye', 'Dog Tag', 'Lead Rain', 'Stealth Ops', 'Honor Bound',
      'ACE Match', 'No Retreat', 'Hold Fast', 'War Paint', 'Battle Cry',
      'Spartan 300', 'Ronin Path', 'Viking Axe', 'Shield Wall',
      'Last Stand',
    ],
    hint: 'e.g. Clutch God',
  },

  cosmic: {
    adjectives: [
      'Astro', 'Cosmo', 'Lunar', 'Solar', 'Nebula', 'Orbit', 'Star',
      'Nova', 'Void', 'Plasma', 'Comet', 'Cosmic', 'Zero G', 'Mars',
      'Pulsar', 'Quasar', 'Warp', 'Hyper',
    ],
    nouns: [
      'Pilot', 'Cadet', 'Walker', 'Rider', 'Naut', 'Core', 'Sage',
      'Base', 'Force', 'Launch', 'Burn', 'Flare', 'Dust',
      'Wave', 'Rift', 'Gate', 'Jump', 'Orbit',
    ],
    titles: [
      'Astro', 'Cosmo', 'Star', 'Cmdr', 'Captain', 'Pilot', 'Admiral',
      'Chief', 'Zero', 'Cosmic',
    ],
    fullNames: [
      'Moon Boy', 'Space Cadet', 'Star Born', 'Dark Matter', 'Moon Soon',
      'Zero G Ape', 'Galaxy Brain', 'Solar Flare', 'Void Pilot',
      'Nova Burst', 'Moon Bag', 'Cosmic Ape', 'Light Speed',
      'Warp Drive', 'Mars Degen', 'Star Dust', 'To Valhalla', 'Deep Space',
      'Final Front', 'Hyper Jump', 'To The Moon', 'Rocket Man',
      'Pulsar Beam', 'Nebula Sage', 'Event Hrzn',
    ],
    hint: 'e.g. Moon Bag',
  },

  wholesome: {
    adjectives: [
      'Good', 'True', 'Noble', 'Brave', 'Kind', 'Pure', 'Honest',
      'Warm', 'Bright', 'Sweet', 'Fresh', 'Green', 'Rich', 'Full',
      'Ripe', 'Golden', 'Blessed', 'Sacred',
    ],
    nouns: [
      'Fren', 'Heart', 'Soul', 'Hand', 'Seed', 'Farm', 'Hope', 'Faith',
      'Plot', 'Guard', 'Crew', 'Guild', 'Sprout', 'Root', 'Bloom',
      'Grove', 'Harvest', 'Sow',
    ],
    titles: [
      'Farmer', 'Chief', 'Elder', 'Saint', 'Guard', 'Captain',
      'Steward', 'Keeper', 'Warden', 'Pastor',
    ],
    fullNames: [
      'Chia Farmer', 'Seed Sower', 'Tang Fren', 'Chia Chad',
      'Seed Zone', 'Kind Heart', 'Farm Life', 'Plot Gang', 'Green Thumb',
      'Grow Mode', 'Harvest Day', 'Honk Love', 'Orange Bud',
      'Pulp Heart', 'True Fren', 'Plot King', 'Block Bud',
      'Full Bloom', 'Fresh Seed', 'Pure Heart', 'Farm Gang',
      'Home Grown', 'Tang Heart', 'Grove Boss', 'Proof of Fk',
    ],
    hint: 'e.g. Chia Chad',
  },

  nerdy: {
    adjectives: [
      'Big', 'Mega', 'Giga', 'Nano', 'Hyper', 'Turbo', 'Pixel',
      'Cyber', 'Data', 'Code', 'Tech', 'Hash', 'Node', 'Stack', 'Debug',
      'Root', 'Core', 'Sync',
    ],
    nouns: [
      'Brain', 'Stack', 'Node', 'Bot', 'Byte', 'Chip', 'Core', 'Code',
      'Hash', 'Grid', 'Net', 'Link', 'LGTM', 'Commit', 'Cache', 'Loop',
      'Fork', 'Merge',
    ],
    titles: [
      'Admin', 'Root', 'Dev', 'Mod', 'Sys', 'Arch', 'Lead', 'Chief',
      'Master', 'Sudo',
    ],
    fullNames: [
      'Big Brain', 'Stack Nerd', 'Node Runner', 'Git Push', 'LGTM Boss',
      'Sudo Mode', 'Giga Brain', 'Debug God', 'Fork It', 'Merge Main',
      'Hash Rate', 'Dev Mode', 'Code Monk', 'Ship It', 'Based Node',
      'Loop Hero', 'Ctrl Alt', 'Full Stack', 'Root Admin', 'Core Dump',
      'Byte Size', 'Tech Debt', 'No Bugs', '10x Dev', 'Neuro Link',
    ],
    hint: 'e.g. Ship It',
  },

  chaotic: {
    adjectives: [
      'Cursed', 'Toxic', 'Manic', 'Wild', 'Feral', 'Chaos', 'Rogue',
      'Loose', 'Broke', 'Fried', 'Cooked', 'Scuffed', 'Janky', 'Raw',
      'Glitch', 'Gaslit', 'Lag', 'Warp',
    ],
    nouns: [
      'Goblin', 'Gremlin', 'Fiend', 'Hands', 'Brain', 'Logic',
      'Sense', 'Cope', 'Luck', 'Move', 'Play', 'Take', 'Shot', 'Bet',
      'Flip', 'Twist', 'Ratio', 'Rot',
    ],
    titles: [
      'Freak', 'Demon', 'Chief', 'Captain', 'Master', 'Agent', 'Chaos',
      'Mad', 'Wild', 'Dr',
    ],
    fullNames: [
      'This Is Fine', 'Chaos Mode', 'Im Cooked', 'Totally Fine',
      'Not Great', 'Down Horrid', 'Brain Rot', 'Fried Brain',
      'Wild Card', 'Bad Idea', 'Yolo Mode', 'Oops Mode', 'My Bad',
      'Scuffed Run', 'Glitch Art', 'Lag Spike', 'Skill Issue',
      'Down Bad', 'Cope Mode', 'Trust Me', 'Just Mint', 'Why Not',
      'Full Send', 'No Plan', 'Its Fine',
    ],
    hint: 'e.g. Im Cooked',
  },

  spooky: {
    adjectives: [
      'Ghost', 'Dead', 'Pale', 'Hollow', 'Grim', 'Dread', 'Wicked',
      'Haunted', 'Cursed', 'Shadow', 'Bone', 'Skull', 'Dark', 'Eerie',
      'Fell', 'Creep', 'Night', 'Rot',
    ],
    nouns: [
      'Reaper', 'Wraith', 'Shade', 'Ghoul', 'Bane', 'Fang', 'Crypt',
      'Tomb', 'Husk', 'Haunt', 'Dread', 'Fiend', 'Lurker', 'Creep',
      'Howl', 'Phantom', 'Specter', 'Hex',
    ],
    titles: [
      'Fiend', 'Baron', 'Count', 'Ghast', 'Master', 'Warden',
      'Keeper', 'Dr', 'Grave', 'Bone',
    ],
    fullNames: [
      'Dead Inside', 'Ghost Town', 'Skull Face', 'No Pulse', 'Game Over',
      'You Died', 'Rug Ghost', 'Crypt Fiend', 'Bone Zone', 'Grim Vibes',
      'Haunted AF', 'Night Shift', 'Sleep Tight', 'RIP Bozo',
      'Cold Body', 'Fade Black', 'Soul Gone', 'Void Born', 'Tomb Raider',
      'Pale Husk', 'Phantom X', 'Rest In Rip', 'Dead Mint',
      'Specter X', 'Bone Broth',
    ],
    hint: 'e.g. Rug Ghost',
  },

  party: {
    adjectives: [
      'Turbo', 'Hyper', 'Lit', 'Hype', 'Wild', 'Loud', 'Mad', 'Hot',
      'Live', 'Fizzy', 'Fresh', 'Juicy', 'Tangy', 'Zesty', 'Crispy',
      'Spicy', 'Wagmi', 'Bullish',
    ],
    nouns: [
      'Rave', 'Star', 'Gang', 'Squad', 'Crew', 'Dawg', 'Lad', 'Bro',
      'Vibes', 'Life', 'Zone', 'Juice', 'Night', 'SZN', 'Bash', 'Fest',
      'Pump', 'Wave',
    ],
    titles: [
      'DJ', 'MC', 'Prince', 'Chief', 'Captain', 'Mayor', 'Boss', 'Don',
      'Host', 'Legend',
    ],
    fullNames: [
      'LFG Vibes', 'Wagmi Gang', 'Party Animal', 'Up Only', 'Pump It',
      'Wagmi SZN', 'Moon Juice', 'Tang Party', 'OJ Gang', 'Zest Fest',
      'Citrus Pop', 'Juice Box', 'LFG Bro', 'Tangy Boi', 'Honk Party',
      'Hold My Beer', 'Full Send', 'Lets Go', 'Good Times',
      'Hot Streak', 'Night Owl', 'Hype Beast', 'Lit AF', 'Bullish AF',
      'LFG!',
    ],
    hint: 'e.g. Wagmi SZN',
  },

  grinder: {
    adjectives: [
      'Hard', 'Fast', 'True', 'Grit', 'Hustle', 'Sigma', 'Sharp',
      'Keen', 'Driven', 'Steady', 'Core', 'Deep', 'Dense', 'Locked',
      'Solid', 'Raw', 'Non Stop', 'Full',
    ],
    nouns: [
      'Grind', 'Hustle', 'Hours', 'Sweat', 'Work', 'Push',
      'Focus', 'Drive', 'Edge', 'Lock', 'Set', 'Sprint',
      'Climb', 'Stack', 'Gain', 'Rep', 'Bags', 'Diff',
    ],
    titles: [
      'Master', 'Pro', 'Veteran', 'Sweat', 'Ace', 'Captain', 'Chief',
      'Lead', 'Boss', 'Coach',
    ],
    fullNames: [
      'No Sleep', 'Grind Mode', 'Speed Run', 'Sweat God', 'Pro Gamer',
      'Locked In', 'One More Run', 'Max Level', 'Farm Life', 'Loot Grind',
      'XP Boost', 'Boss Rush', 'Hard Core', 'No Days Off', 'On God',
      'Late Night', 'First Clear', 'World First', 'Rank Grind',
      'Rep Max', 'The Hustle', 'Non Stop', 'Eyes Open', 'Time Attack',
      'AFK? Never',
    ],
    hint: 'e.g. Locked In',
  },
};

/**
 * Bonus name pools for mood combinations.
 * When primary + secondary moods match a combo, these names are added to the pool.
 *
 * v2 — added Chia-specific combos and enriched existing pairs.
 */
export const MOOD_COMBOS: Partial<
  Record<MoodTag, Partial<Record<MoodTag, string[]>>>
> = {
  rebellious: {
    aggressive: ['F This', 'No Cap OG', 'Flip Table', 'Mad Online', 'Stay Toxic'],
    party: ['Hold My Beer', 'Bad Choices', 'YOLO King', 'Party Foul', 'No Regrets'],
    degen: ['Exit Scam', 'Rug Rebel', 'Pump Pirate', 'Rogue Trade', 'Tang Bandit'],
    chill: ['Dont Care', 'Zero Fks', 'Laid Back', 'Stay Based', 'Muted Chat'],
  },
  aggressive: {
    degen: ['Ape Rage', 'Rekt Fury', 'Margin Call', 'Liquidated', 'Panic Sell'],
    warrior: ['War Machine', 'Iron Storm', 'Brute Squad', 'Total War', 'No Quarter'],
    chaotic: ['War Crime', 'Scorched', 'No Chill', 'Tilt God', 'Rage Quit'],
    dark: ['Grim Reaper', 'Death Wish', 'Soul Crush', 'Doom Fist', 'Kill Shot'],
    cosmic: ['Star Wars', 'Nova Bomb', 'Solar Flare', 'Meteor OG', 'Death Star'],
    rebellious: ['Fk Around', 'Rekt Em', 'Raw Fury', 'Break Stuff', 'No Mercy'],
  },
  degen: {
    chill: ['Zen Trader', 'HODL Zen', 'Numb Bags', 'Comfy Degen', 'AFK Gains'],
    party: ['Casino Ape', 'Lucky Degen', 'Jackpot OG', 'All In', 'Pump N Dump'],
    goofy: ['Ape Brain', 'Smooth Ape', 'Meme Coin', 'Degen Honk', 'Rare Honk'],
    elite: ['Whale Mode', 'Smart Money', 'Alpha Leak', 'Insider OG', 'Stack Chad'],
    dark: ['Bag Rekt', 'Rug Victim', 'Bear Fren', 'Down Only', 'Cope Bag'],
    wholesome: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'XCH Farmer', 'Plot Ape', 'Green Degen'],
  },
  elite: {
    dark: ['Dark Baron', 'Shadow CEO', 'Void Mogul', 'Night Fund', 'Grim Stack'],
    warrior: ['King Slayer', 'Iron Duke', 'War Baron', 'Crown Chad', 'Throne Room'],
    chill: ['Old Money', 'Smooth Boss', 'Zen CEO', 'Easy Stack', 'Chill Duke'],
    wholesome: ['Tang King', 'Bepe Baron', 'Kind Duke', 'Green Baron', 'Noble Heart'],
    degen: ['Whale Mode', 'Tang Baron', 'Bepe Mogul', 'Bag Lord', 'XCH Baron', 'Mojo Lord', 'Stack Lord'],
  },
  goofy: {
    chaotic: ['Honk Chaos', 'NPC Moment', 'Clown Fiesta', 'Brain Worm', 'Spaghetti'],
    degen: ['Ape Brain', 'Smooth Ape', 'Meme Coin', 'Degen Honk', 'Rare Honk'],
    chill: ['Vibes Only', 'Goofy Ahh', 'Silly Goose', 'Honk Chill', 'Soft Honk'],
    nerdy: ['Bug Report', '404 Brain', 'Stack Over', 'Copy Paste', 'Sudo Honk'],
    party: ['Honk Fest', 'Meme Party', 'Clown Hour', 'Goose Gang', 'Fun Mode'],
  },
  dark: {
    mystical: ['Void Mage', 'Death Magic', 'Soul Drain', 'Dark Ritual', 'Fell Sage'],
    spooky: ['Dead Mall', 'Bone Lord', 'Night Lurk', 'Pale Rider', 'Ghost Walk'],
    degen: ['Bear Market', 'Rug Night', 'Dark Pool', 'Dump Lord', 'Grave Bag'],
    chaotic: ['Asylum Run', 'Mad World', 'Chaos Void', 'Cursed Luck', 'Broke Brain'],
  },
  mystical: {
    warrior: ['Spell Blade', 'Rune Knight', 'War Mage', 'Battle Sage', 'Mana Tank'],
    dark: ['Shadow Mage', 'Void Cast', 'Necro Sage', 'Death Rune', 'Fell Magic'],
    elite: ['Grand Mage', 'Arch Sage', 'Lore Baron', 'Spell King', 'Mana Lord'],
    goofy: ['Honk Magic', 'Meme Spell', 'Goose Mage', 'Silly Sage', 'Bonk Wand'],
  },
  wholesome: {
    grinder: ['Farm Run', 'Seed Gang', 'Plot Work', 'Grow Stack', 'XCH Grind', 'Mojo Farm', 'Field Day'],
    degen: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'Green Degen'],
    party: ['Tang Party', 'OJ Fest', 'Grove Bash', 'Chia Fest', 'Harvest Ale'],
    warrior: ['Shield Bro', 'Guard Duty', 'Brave Soul', 'Tank Bro', 'Iron Guard'],
    mystical: ['Seed Prayer', 'Soul Farm', 'Sacred Plot', 'Green Light', 'Bless Soul'],
  },
  cosmic: {
    degen: ['Moon Ape', 'Astro Degen', 'Space Bag', 'Star Mint', 'Launch Pad'],
    aggressive: ['Star Wars', 'Nova Bomb', 'Solar Flare', 'Meteor OG', 'Death Star'],
    chill: ['Star Gazer', 'Float Mode', 'Orbit Zen', 'Space Chill', 'Void Calm'],
    mystical: ['Star Sage', 'Moon Druid', 'Astral Mage', 'Ether Sage', 'Cosmo Sage'],
  },
  nerdy: {
    degen: ['Hash Nerd', 'Node Degen', 'Stack Maxi', 'Git Rekt', 'CLVM Nerd', 'Dev Ape'],
    goofy: ['Bug Report', '404 Brain', 'Stack Over', 'Copy Paste', 'Sudo Honk'],
    grinder: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
    dark: ['Dark Code', 'Void Stack', 'Dead Code', 'Null Ptr', 'Ghost Bug'],
  },
  party: {
    chill: ['Juice Bar', 'Tang Chill', 'Smooth OJ', 'Sunset Bro', 'Easy Night'],
    degen: ['Casino Night', 'Lucky Mint', 'Moon Juice', 'Pump Fest', 'Wagmi Bash'],
    rebellious: ['Riot Fest', 'Punk Show', 'Wild Night', 'Mosh Pit', 'Stage Dive'],
    goofy: ['Honk Fest', 'Meme Party', 'Clown Hour', 'Goose Rave', 'Fun Bomb'],
    elite: ['VIP Night', 'Gold Party', 'Yacht Bash', 'Rooftop', 'Champagne'],
    wholesome: ['Tang Fest', 'OJ Social', 'Grove Bash', 'Juice Jam', 'Fruit Punch'],
  },
  chaotic: {
    dark: ['Asylum Run', 'Mad World', 'Chaos Void', 'Cursed Luck', 'Broke Brain'],
    goofy: ['Honk Chaos', 'Brain Rot', 'Spaghetti', 'Glitch Art', 'Bug Feature'],
    aggressive: ['War Crime', 'Scorched', 'Tilt God', 'Rage Quit', 'No Chill'],
    degen: ['Rug Roulette', 'Scam Likely', 'Chaos Mint', 'Bad Trade', 'Yolo Flip'],
    party: ['Chaos Bash', 'Wild Rave', 'Mad Party', 'Cursed DJ', 'Glitch Fest'],
    spooky: ['Cursed Tomb', 'Mad Ghost', 'Chaos Skull', 'Glitch Dead', 'Broke Soul'],
  },
  grinder: {
    warrior: ['Iron Grind', 'War Sweat', 'Battle Rep', 'Hard March', 'Siege Mode'],
    degen: ['Farm Stack', 'Mine Mode', 'Yield Grind', 'Pool Sweat', 'DCA Robot', 'Plot Grind'],
    nerdy: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
    elite: ['CEO Grind', 'Money Sweat', 'Stack Hours', 'Bag Sprint', 'Whale Work'],
    aggressive: ['Rage Grind', 'War Hours', 'Fury Sprint', 'Beast Mode', 'Pain Gain'],
    wholesome: ['Farm Grind', 'Seed Hours', 'Plot Sweat', 'Grow Daily', 'Harvest Run'],
    chill: ['Slow Grind', 'Zen Hustle', 'Calm Stack', 'Calm Sweat', 'Flow State'],
  },
  warrior: {
    dark: ['Dark Knight', 'Shadow Ops', 'Night Raid', 'Grim March', 'Fell Blade'],
    wholesome: ['Shield Bro', 'Guard Duty', 'Brave Soul', 'Tank Bro', 'Iron Guard'],
    aggressive: ['War Machine', 'Iron Storm', 'Total War', 'No Quarter', 'Brute Squad'],
  },
  spooky: {
    dark: ['Grave Lord', 'Death King', 'Bone Baron', 'Night Shade', 'Fell Haunt'],
    goofy: ['Boo Honk', 'Spooky Honk', 'Ghost Honk', 'Skull Meme', 'Dead Meme'],
    chaotic: ['Poltergeist', 'Cursed Tomb', 'Mad Ghost', 'Chaos Crypt', 'Wild Haunt'],
    degen: ['Dead Bag', 'Ghost Mint', 'Rug Reaper', 'Bone Bag', 'Skull Coin'],
    party: ['Boo Bash', 'Ghost Rave', 'Dead Dance', 'Skull Fest', 'Haunted DJ'],
    chill: ['Chill Bones', 'Cozy Crypt', 'Calm Ghost', 'Nap Tomb', 'Zen Reaper'],
  },
  chill: {
    degen: ['AFK Degen', 'Comfy Bag', 'Zen Trade', 'Numb Hands', 'Lazy Mint'],
    goofy: ['Chill Clown', 'Zen Goblin', 'Cozy Meme', 'Soft Brain', 'Calm Honk'],
    dark: ['Numb Doom', 'Calm Void', 'Chill End', 'Quiet Dark', 'Soft Fade'],
    wholesome: ['Cozy Farm', 'Warm Seed', 'Soft Heart', 'Calm Plot', 'Zen Bloom'],
  },
};

/**
 * Trait-specific name overrides.
 * When an iconic trait is equipped, there's a chance (see nameGenerator.ts)
 * to pull directly from this pool instead of the mood system.
 * Keys are trait `value` strings from the metadata (same as TRAIT_MOODS keys).
 *
 * All names <= 15 chars.
 */
export const TRAIT_NAME_OVERRIDES: Record<string, string[]> = {
  // ── Clothes (tier weight 3x) ──
  Astronaut: ['Space Degen', 'Moon Bound', 'Astro Ape', 'Launch Pad', 'To The Moon', 'Orbit Chad', 'Zero G Fren', 'Houston'],
  'SWAT Gear': ['Breach Chad', 'Flash Bang', 'Stack Up', 'Room Clear', 'SWAT Fren', 'Hard Entry', 'Go Go Go'],
  'Wizard Drip': ['Spell Slap', 'Mana Burn', 'Grand Mage', 'Arcane OG', 'Cast Deez', "Yer a Wizard", 'Rune Lord'],
  Ronin: ['Blade Oath', 'Honor Code', 'Ronin Path', 'Steel Rain', 'No Master', 'Lone Blade', 'Bushido'],
  'Viking Armor': ['Valhalla', 'Shield Wall', 'Skol Mode', 'Odin Son', 'Axe Gang', 'Ragnarok', 'Berserker'],
  'Chia Farmer': ['Plot King', 'XCH Maxi', 'Farm Life', 'Seed Lord', 'Harvest OG', 'Proof of Fk', 'Green Thumb'],
  'Pepe Suit': ['Rare Pepe', 'Kek Lord', 'Feels Good', 'Pepe Hands', 'Sadge King', 'Based Pepe', 'Kek Mode'],
  'Goose Suit': ['Honk Gang', 'Goose Loose', 'Honk Honk', 'Peace Was', 'Untitled', 'Rake Lake', 'Chaos Honk'],
  Drac: ['Nosferatu', 'Blood Thirst', 'Night Fang', 'Count Rekt', 'Vamp Mode', 'Bite Fren'],
  Straitjacket: ['Asylum OG', 'Padded Cell', 'Im Fine', 'Unhinged', 'Ward Fren', 'Mad Mode', 'Off Meds'],
  "God's Robe": ['God Mode', 'Divine Fren', 'Holy Degen', 'Ascended', 'Deity OG', 'Grace Mode'],
  Topless: ['Chad Mode', 'Built Diff', 'No Shirt', 'Gym Bro', 'Sun King', 'Beach Chad'],
  'El Presidente': ['El Jefe', 'Dictator OG', 'Power Grab', 'Regime Chad', 'Coup King'],
  'Born to Ride': ['Road King', 'Full Throttle', 'Ride or Die', 'Chrome Chad', 'Asphalt OG'],
  'Leather Jacket': ['Punk OG', 'Rebel Drip', 'Biker Fren', 'Greaser', 'Cool Kid'],
  Suit: ['Wolf of Wall', 'Suit Chad', 'Blue Chip', 'Corner Office', 'Deal Closer'],
  'Super Saiyan Uniform': ['Over 9000', 'Ultra Inst', 'SSJ Chad', 'Power Up', 'Final Form'],
  'Roman Drip': ['Ave Caesar', 'SPQR Chad', 'Legion OG', 'Gladiator', 'Forum King'],
  'Proof of Prayer': ['Blessed OG', 'Faith Mode', 'Holy Grind', 'Amen Fren', 'Grace Gang'],
  Bathrobe: ['Comfy King', 'Robe Life', 'Bath Time', 'Cozy Degen', 'Chill Pill', 'Lounge God'],
  'Bepe Army': ['Bepe Squad', 'Tang Troop', 'Honk Platoon', 'Bepe Grunt', 'OJ Corps'],
  'Bepe Suit': ['Bepe Boss', 'Bepe Drip', 'Suited Bepe', 'Tang Mogul', 'Bepe Elite'],
  'Firefighter Uniform': ['Hose Hero', 'Blaze It', 'Fire Bro', 'Flame On', 'Rescue OG', 'Ladder Man'],
  'Gopher Suit': ['Gopher It', 'Go Gopher', 'Dig Deep', 'Hole Digger', 'Tunnel Rat'],
  'Ninja Turtle Fit': ['Cowabunga', 'Half Shell', 'Turtle Pwr', 'Sewer OG', 'Pizza Time'],
  'Pickle Suit': ['Pickle Rick', 'Dill Chad', 'Brine Time', 'Big Dill', 'Sour Pwr'],
  'Sonic Suit': ['Gotta Go', 'Ring Dash', 'Zoom Zoom', 'Fast AF', 'Sonic Boom'],
  'Sports Jacket': ['Courtside', 'Box Seat', 'VIP Lounge', 'Club Level', 'Press Box'],
  'Tank Top': ['Gains Bro', 'Gun Show', 'Flex Mode', 'Swole Dude', 'Beach Bum'],
  Tee: ['Basic Bro', 'Casual OG', 'Street Wear', 'Graphic Tee', 'Keep It 100'],

  // ── Head (tier weight 2x) ──
  Crown: ['King Shit', 'Crown Jewel', 'Royal OG', 'Heir Fren', 'Long Reign'],
  'Wizard Hat': ['Wizard OG', 'Big Hat', 'Magic Find', 'Spell Lord'],
  'Viking Helmet': ['Skol King', 'Norse OG', 'Thor Mode', 'Raid Boss'],
  'Super Saiyan': ['Over 9000', 'Ultra Inst', 'SSJ Mode', 'Power Up'],
  'Tin Foil Hat': ['Schizo Mode', 'Wake Up', 'They Know', 'Glowie'],
  'Devil Horns': ['Hail Satan', 'Imp Lord', 'Hell Mode', 'Sin Chad'],
  'Military Beret': ['Bravo Six', 'Spec Ops', 'Delta OG', 'Covert OG'],
  Clown: ['Honk Pilled', 'Clown World', 'Circus OG', 'Big Shoes'],
  'Pirate Hat': ['Ye Olde Degen', 'Plunder OG', 'Sea Dog', 'Booty Gang'],
  'Cowboy Hat': ['Yeehaw', 'Range Rider', 'Rodeo Chad', 'Saddle Up'],
  'Piccolo Turban': ['Green Giant', 'Namek OG', 'Beam Cannon', 'Piccolo W'],
  'Beer Hat': ['Hold My Beer', 'Chug Life', 'Keg Stand', 'Brew Dawg', 'Tap That'],
  'SWAT Helmet': ['Visor Down', 'Breach OG', 'Go Loud', 'Gear Up', 'Tactical'],
  Centurion: ['Glory Rome', 'SPQR Fren', 'Ave True', 'Legion OG', 'Gladiator'],
  Fedora: ['Tips Fedora', 'M Lady', 'Nice Guy', 'Classy Lad', 'Neck Beard'],
  'Construction Helmet': ['Hard Hat', 'Site Boss', 'Build Diff', 'Crane Op'],
  Headphones: ['Lo Fi Chill', 'Bass Drop', 'AFK Beats', 'Ear Worm', 'Tune In'],

  // ── Face Wear (tier weight 2x) ──
  'Laser Eyes': ['Laser Mode', 'Beam Me', 'Eyes On', 'Bull Mode', 'Zap Em'],
  'Alpha Shades': ['Alpha Mode', 'Sigma Stare', 'Drip Check', 'Ice Cold'],
  'Eye Patch': ['One Eye', 'Depth OG', 'Pirate Fren', 'Squint Chad'],
  'Matrix Lenses': ['Red Pill', 'Neo Mode', 'Matrix OG', 'Spoon Lie'],
  'Tyson Tattoo': ['Face Ink', 'Tyson Mode', 'Iron Mike', 'KO King'],
  'Night Vision': ['Dark Ops', 'Night Owl', 'Green Light', 'Recon OG'],
  'VR Headset': ['Sim Chad', 'VR World', 'Meta Fren', 'Pixel Life'],
  'MOG Glasses': ['MOG Mode', 'Mog Pilled', 'Mogging', 'Mog Diff', 'Out Mogged'],
  'Ninja Turtle Mask': ['Shell Life', 'Sewer Rat', 'Turtle Bro', 'Raph Mode'],
  '3D Glasses': ['3D Pilled', 'Retro View', 'Pop Out', 'Anaglyph'],

  // ── Extras (tier weight 3x) ──
  Handgun: ['Strapped', 'Blicky OG', 'Bang Bang', 'No Lacking', 'On Sight'],
  Diamond: ['Ice Wrist', 'Diamond OG', 'Bling Fren', 'Carat Chad'],
  Wings: ['Ascended', 'Angel Fren', 'Sky King', 'Wing Gang'],
  'GFY Right': ['GFY King', 'Middle Up', 'F Off', 'Not Sorry'],
  'GFY Left': ['GFY Lord', 'Stay Mad', 'Cope More', 'Stay Rekt'],
  Coffee: ['Caffeine OG', 'Java Chad', 'Espresso', 'Bean Fren'],
  Orange: ['Tang King', 'Citrus OG', 'OJ Chad', 'Vitamin C'],
  Goose: ['Honk King', 'Goose God', 'Untitled', 'Chaos Honk'],
  TangTalk: ['Tang Nerd', 'Radio OG', 'Comms Chad', 'Copy That'],
  Seedling: ['Seed Sower', 'Sprout OG', 'Plant Dad', 'Grow Gang'],
};
