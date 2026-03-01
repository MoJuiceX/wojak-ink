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
 */
export const MOOD_POOLS: Record<MoodTag, MoodPool> = {
  aggressive: {
    adjectives: [
      'Rekt', 'Savage', 'Brutal', 'Feral', 'Raw', 'Lethal', 'Wicked',
      'Rabid', 'Cruel', 'Mad', 'Primal', 'Bloody', 'Grim', 'Iron',
      'Nuclear', 'Crazed', 'Fierce', 'Vile',
    ],
    nouns: [
      'Rage', 'Fury', 'Hands', 'Beast', 'Mode', 'Fist', 'Storm',
      'Pain', 'Carnage', 'Strike', 'Havoc', 'Wreck', 'Doom', 'Rush',
      'Blitz', 'Force', 'Sweat', 'Push',
    ],
    titles: [
      'Warlord', 'General', 'Sgt', 'Cpt', 'Killer', 'Slayer', 'Boss',
      'Victor', 'Reaper', 'Brute',
    ],
    fullNames: [
      'Rekt Em All', 'Mad Lad', 'No Mercy', 'Rage Quit', 'Git Gud',
      '1v1 Me Bro', 'Salt Mine', 'Tryhard Andy', 'Double Kill',
      'Spawn Kill', 'Feral Mode', 'Zero Chill', 'Iron Fist', 'Raw Dawg',
      'Total Rekt', 'Overkill', 'Pain Train', 'GG No Re', 'Final Boss',
      'Wreck It', 'Tilt Mode', 'Blood Moon', 'Brute Force', 'Pure Rage',
      'Combo Break',
    ],
    hint: 'e.g. Rage Quit',
  },

  rebellious: {
    adjectives: [
      'Rogue', 'Based', 'Punk', 'Wild', 'Feral', 'Outlaw', 'Untamed',
      'Defiant', 'Rebel', 'Reckless', 'Bold', 'Brazen', 'Raw', 'Loose',
      'Free', 'Lone', 'Stray', 'Foul',
    ],
    nouns: [
      'Anon', 'Rebel', 'Wolf', 'Outlaw', 'Riot', 'Punk', 'Rogue',
      'Menace', 'Cannon', 'Exile', 'Pirate', 'Raider', 'Vandal',
      'Flame', 'Spirit', 'Fury', 'Storm', 'Fren',
    ],
    titles: [
      'Don', 'Capo', 'Chief', 'Baron', 'Kingpin', 'OG', 'Bandit',
      'Outlaw', 'Rogue', 'Pirate',
    ],
    fullNames: [
      'No Rules', 'Send It', 'Cope Harder', 'Anon Rage', 'Stay Mad',
      'Touch Grass', 'Honk Honk', 'Not Ur Fren', 'Cry More',
      'Seethe Cope', 'Flip Table', 'GFY King', 'Mad Online', 'Born Wild',
      'Lone Wolf', 'Exit Scam', 'Road Rage', 'Bail Out', 'On Sight',
      'Foul Play', 'Not Sorry', "Ratio'd", 'Talk Cheap', 'No Cap',
      'Rebel OG',
    ],
    hint: 'e.g. No Rules',
  },

  degen: {
    adjectives: [
      'Diamond', 'Paper', 'Rekt', 'HODL', 'Degen', 'Whale', 'Rug',
      'Pump', 'Based', 'Moon', 'Bull', 'Bear', 'Ape', 'Shrimp', 'Bag',
      'Toxic', 'Broke', 'Rich',
    ],
    nouns: [
      'Hands', 'Bags', 'Maxi', 'Trader', 'Ape', 'HODL', 'Whale',
      'Pump', 'Dump', 'Moon', 'Stack', 'Vault', 'Coin', 'Pool', 'Mine',
      'Yield', 'Farm', 'Sats',
    ],
    titles: [
      'CEO', 'Whale', 'Shark', 'Alpha', 'Sigma', 'OG', 'Degen', 'Maxi',
      'Bull', 'Baron',
    ],
    fullNames: [
      'Rug Pulled', 'Ape In', 'Moon Soon', 'HODL Gang', 'Bag Holder',
      'Send Nodes', 'In It 4 Tech', 'Ngmi Fren', 'Wagmi Mode',
      '1 More Trade', 'Rekt Again', 'Paper Hands', 'Pump N Pray',
      'All In', 'Floor Price', 'Mint Fren', 'Gas Fee', 'Whale Alert',
      'Seed Phrase', 'No Ragrets', 'Tang Maxi', 'Pulp Gang',
      'Citrus Peel', 'Bepe Maxi', 'Honk Bag',
    ],
    hint: 'e.g. Moon Soon',
  },

  chill: {
    adjectives: [
      'Comfy', 'Chill', 'Zen', 'Mellow', 'Cozy', 'Smooth', 'Sleepy',
      'Easy', 'Warm', 'Soft', 'Calm', 'Lazy', 'Quiet', 'Bliss',
      'Gentle', 'Slow', 'Still', 'Peace',
    ],
    nouns: [
      'Fren', 'Vibes', 'Mode', 'Zone', 'Life', 'Soul', 'Wave', 'Dream',
      'Cloud', 'Breeze', 'Flow', 'Mood', 'Sage', 'Brain', 'Spirit',
      'Aura', 'Haven', 'Rest',
    ],
    titles: [
      'Master', 'Guru', 'Sensei', 'Elder', 'Sage', 'Chief', 'Captain',
      'Saint', 'Blessed', 'Pure',
    ],
    fullNames: [
      'Comfy Fren', 'Vibe Check', 'Feels Good', 'Easy Mode', 'No Stress',
      'All Good', 'Stay Comfy', 'Zen Mode', 'Chill Pill', 'Good Vibes',
      'Smooth Brain', 'Nap King', 'AFK Life', 'Idle Mode', 'Low Effort',
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
      'Goblin', 'NPC', 'Clown', 'Brain', 'Hands', 'Lord', 'Fiend',
      'Maniac', 'Enjoyer', 'Moment', 'Vibes', 'Gang', 'Unit', 'Legend',
      'Bot', 'Honk', 'Fren', 'Lad',
    ],
    titles: [
      'King', 'Lord', 'Chief', 'Supreme', 'Grand', 'Mega', 'Ultra',
      'Emperor', 'Captain', 'Mayor',
    ],
    fullNames: [
      'Honk Pilled', 'Clown World', 'This Is Fine', 'Rare Pepe',
      'NPC Brain', 'Weird Flex', 'Skill Issue', 'Bruh Moment',
      'Copium Max', 'Sussy Baka', 'Giga Brain', 'Goose Loose',
      'Down Bad', 'Sneed Mode', 'OK Boomer', 'Meme Lord', 'Turbo Honk',
      'Epic Fail', 'Big If True', 'No Cap', 'L + Ratio', 'Deez Nuts',
      '404 Brain', 'Trust Me Bro', 'Smooth Move',
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
      'Gang', 'Mode', 'Mogul', 'Throne', 'Empire', 'Crown', 'Power',
      'Maxi', 'Titan', 'Chad', 'King',
    ],
    titles: [
      'CEO', 'CFO', 'Don', 'Duke', 'Baron', 'Lord', 'Prince', 'Count',
      'Mogul', 'Tycoon',
    ],
    fullNames: [
      'Wolf of Wall', 'CEO of Bags', 'Bull Chad', 'Whale Alert',
      'Big Money', 'Top Trader', 'Stack King', 'Sigma Male',
      'Alpha Gains', 'Old Money', 'New Money', 'Power Move', 'Boss Mode',
      'Royal Flush', 'Profit King', 'Market Cap', 'Blue Chip',
      'Early Bird', 'Smart Money', 'Tang Baron', 'Bepe Elite',
      'Pump King', 'Bag Secured', 'Net Worth', 'Rank One',
    ],
    hint: 'e.g. Boss Mode',
  },

  dark: {
    adjectives: [
      'Dark', 'Shadow', 'Void', 'Grim', 'Doom', 'Dread', 'Fell',
      'Bleak', 'Ashen', 'Black', 'Hollow', 'Pale', 'Ghost', 'Dead',
      'Lost', 'Faded', 'Numb', 'Cold',
    ],
    nouns: [
      'Lord', 'Knight', 'Walker', 'King', 'Reaper', 'Shade', 'Wraith',
      'Bane', 'Soul', 'Edge', 'Doom', 'Night', 'Abyss', 'Crypt',
      'Husk', 'Echo', 'End', 'Fren',
    ],
    titles: [
      'Lord', 'Baron', 'Count', 'Overlord', 'Master', 'Regent',
      'Archon', 'Prince', 'Warden', 'Tyrant',
    ],
    fullNames: [
      'Void Walker', 'Dark Lord', 'Doom Mode', 'Edge Lord', 'Shadow Fren',
      'Dead Inside', 'Doomer Mode', 'No Hope', 'Its Over', 'Black Pill',
      'Final Form', 'Dark Soul', 'Game Over', 'You Died', 'Hollow Man',
      'Grim Fren', 'Night King', 'Fade Away', 'Gone Dark', 'Cold Hands',
      'Lost Cause', 'Soul Rekt', 'The End', 'No Return', 'Dark Wojak',
    ],
    hint: 'e.g. Void Walker',
  },

  mystical: {
    adjectives: [
      'Arcane', 'Mystic', 'Elder', 'Ancient', 'Rune', 'Crystal',
      'Frost', 'Flame', 'Storm', 'Shadow', 'Astral', 'Ether', 'Chaos',
      'Blood', 'Iron', 'Stone', 'Spell', 'Fey',
    ],
    nouns: [
      'Wizard', 'Mage', 'Sage', 'Seer', 'Monk', 'Oracle', 'Druid',
      'Shaman', 'Walker', 'Blade', 'Eye', 'Born', 'Master', 'Guard',
      'Ward', 'Weaver', 'Cast', 'Fren',
    ],
    titles: [
      'Archmage', 'Elder', 'Sage', 'Oracle', 'High', 'Grand', 'Ancient',
      'Seer', 'Keeper', 'Lore',
    ],
    fullNames: [
      'Arcane Chad', 'Rune Master', 'Mana Burn', 'Cast Fren',
      'Spell Slap', 'Wizard OG', 'Dark Magic', 'Ice Wizard', 'Fire Sage',
      'Moon Druid', 'Soul Reaver', 'Mind Blast', 'Potion Lord',
      'Ether Fren', 'Chaos Mage', 'XP Farm', 'Loot Drop', 'Magic Find',
      'Buff Stack', 'Heal Bot', 'Nerf This', 'Mana Pool', 'Crit Hit',
      'Spell Book', 'Rune Chad',
    ],
    hint: 'e.g. Rune Master',
  },

  warrior: {
    adjectives: [
      'Iron', 'Steel', 'Brave', 'True', 'Sworn', 'Battle', 'War',
      'Siege', 'Field', 'Recon', 'Delta', 'Bravo', 'Grunt', 'Heavy',
      'Sharp', 'Hard', 'Rough', 'Grit',
    ],
    nouns: [
      'Squad', 'Force', 'Guard', 'Arms', 'Chief', 'Six', 'Actual',
      'Dog', 'Shield', 'Blade', 'Sword', 'Helm', 'Spear', 'Wall',
      'Gate', 'Tower', 'Front', 'March',
    ],
    titles: [
      'Sgt', 'Cpt', 'Major', 'Colonel', 'General', 'Pvt', 'Cmdr', 'Lt',
      'Warlord', 'Marshal',
    ],
    fullNames: [
      'Sgt Degen', 'Iron Hands', 'Bravo Six', 'Tank Chad', 'Shell Shock',
      'Trench Fren', 'Boot Camp', 'War Ape', 'Delta OG', 'Foxhound',
      'Hawk Eye', 'Dog Tag', 'Lead Rain', 'Stealth OG', 'Honor Bound',
      'Front Line', 'No Retreat', 'Hold Fast', 'War Paint', 'Battle Cry',
      'Spartan OG', 'Ronin Path', 'Viking OG', 'Shield Wall',
      'Last Stand',
    ],
    hint: 'e.g. Bravo Six',
  },

  cosmic: {
    adjectives: [
      'Astro', 'Cosmo', 'Lunar', 'Solar', 'Nebula', 'Orbit', 'Star',
      'Nova', 'Void', 'Plasma', 'Comet', 'Cosmic', 'Zero G', 'Mars',
      'Pulsar', 'Quasar', 'Dark', 'Hyper',
    ],
    nouns: [
      'Pilot', 'Cadet', 'Walker', 'Rider', 'Naut', 'Core', 'Sage',
      'Base', 'Force', 'Bound', 'Born', 'Light', 'Flare', 'Dust',
      'Wave', 'Rift', 'Gate', 'Jump',
    ],
    titles: [
      'Astro', 'Cosmo', 'Star', 'Cmdr', 'Captain', 'Pilot', 'Admiral',
      'Chief', 'Zero', 'Cosmic',
    ],
    fullNames: [
      'Moon Boy', 'Space Cadet', 'Star Born', 'Dark Matter', 'Moon Soon',
      'Zero G Chad', 'Galaxy Brain', 'Solar Flare', 'Void Pilot',
      'Nova Burst', 'Orbit Mode', 'Cosmic Fren', 'Light Speed',
      'Warp Drive', 'Mars Degen', 'Star Dust', 'Moon Fren', 'Deep Space',
      'Final Front', 'Hyper Jump', 'To The Moon', 'Rocket Fren',
      'Pulsar OG', 'Nebula King', 'Event Hrzn',
    ],
    hint: 'e.g. Moon Boy',
  },

  wholesome: {
    adjectives: [
      'Good', 'True', 'Noble', 'Brave', 'Kind', 'Pure', 'Honest',
      'Warm', 'Bright', 'Sweet', 'Fresh', 'Green', 'Rich', 'Full',
      'Ripe', 'Golden', 'Blessed', 'Sacred',
    ],
    nouns: [
      'Fren', 'Heart', 'Soul', 'Hand', 'Seed', 'Farm', 'Hope', 'Faith',
      'Light', 'Guard', 'Crew', 'Guild', 'Folk', 'Root', 'Bloom',
      'Grove', 'Field', 'Home',
    ],
    titles: [
      'Farmer', 'Chief', 'Elder', 'Saint', 'Guardian', 'Captain',
      'Steward', 'Keeper', 'Warden', 'Pastor',
    ],
    fullNames: [
      'Chia Farmer', 'Seed Sower', 'Tang Fren', 'Good Vibes',
      'Fren Zone', 'Kind Heart', 'Farm Life', 'Plot Gang', 'Green Thumb',
      'Grow Mode', 'Harvest OG', 'Honk Love', 'Orange Fren',
      'Pulp Heart', 'True Fren', 'Fren Chain', 'Block Fren',
      'Full Bloom', 'Fresh Seed', 'Pure Heart', 'Fren Gang',
      'Home Grown', 'Tang Heart', 'Grove King', 'Proof of Fk',
    ],
    hint: 'e.g. Tang Fren',
  },

  nerdy: {
    adjectives: [
      'Big', 'Mega', 'Giga', 'Nano', 'Hyper', 'Turbo', 'Pixel',
      'Cyber', 'Data', 'Code', 'Tech', 'Hash', 'Node', 'Stack', 'Debug',
      'Root', 'Core', 'Sync',
    ],
    nouns: [
      'Brain', 'Stack', 'Node', 'Bot', 'Byte', 'Chip', 'Core', 'Code',
      'Hash', 'Grid', 'Net', 'Link', 'Port', 'Drive', 'Cache', 'Loop',
      'Fork', 'Merge',
    ],
    titles: [
      'Admin', 'Root', 'Dev', 'Mod', 'Sys', 'Arch', 'Lead', 'Chief',
      'Master', 'Sudo',
    ],
    fullNames: [
      'Big Brain', 'Stack Fren', 'Node Runner', 'Git Push', '404 Fren',
      'Sudo Mode', 'Giga Brain', 'Debug King', 'Fork It', 'Merge Chad',
      'Hash Rate', 'Dev Mode', 'Code Monk', 'Pixel Fren', 'Based Node',
      'Loop King', 'Ctrl Alt', 'Full Stack', 'Root Admin', 'Core Dump',
      'Byte Size', 'Tech Debt', 'No Bugs', 'Ship It', 'Neuro Link',
    ],
    hint: 'e.g. Big Brain',
  },

  chaotic: {
    adjectives: [
      'Cursed', 'Toxic', 'Manic', 'Wild', 'Feral', 'Chaos', 'Rogue',
      'Loose', 'Broke', 'Fried', 'Cooked', 'Scuffed', 'Janky', 'Raw',
      'Glitch', 'Bug', 'Lag', 'Warp',
    ],
    nouns: [
      'Mode', 'Goblin', 'Gremlin', 'Fiend', 'Hands', 'Brain', 'Logic',
      'Sense', 'Plan', 'Luck', 'Move', 'Play', 'Take', 'Shot', 'Bet',
      'Call', 'Flip', 'Twist',
    ],
    titles: [
      'Lord', 'King', 'Chief', 'Captain', 'Master', 'Agent', 'Chaos',
      'Mad', 'Wild', 'Dr',
    ],
    fullNames: [
      'This Is Fine', 'Chaos Mode', 'Im Fine', 'Totally Fine',
      'Not Great', 'Just Vibin', 'Cooked Mode', 'Fried Brain',
      'Wild Card', 'Bad Idea', 'Yolo Mode', 'Oops Mode', 'My Bad',
      'Scuffed OG', 'Glitch Fren', 'Lag Spike', 'Skill Issue',
      'Down Bad', 'Cope Mode', 'Trust Me', 'Just Mint', 'Why Not',
      'Full Send', 'No Plan', 'Its Fine',
    ],
    hint: 'e.g. This Is Fine',
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
      'Howl', 'Fren', 'Mode', 'King',
    ],
    titles: [
      'Lord', 'Baron', 'Count', 'Overlord', 'Master', 'Warden',
      'Keeper', 'Dr', 'Grave', 'Bone',
    ],
    fullNames: [
      'Dead Inside', 'Ghost Fren', 'Skull Mode', 'No Pulse', 'Game Over',
      'You Died', 'Boo Fren', 'Crypt King', 'Bone Zone', 'Grim Vibes',
      'Haunted OG', 'Night Mode', 'Sleep Tight', 'RIP Fren',
      'Cold Body', 'Fade Black', 'Soul Gone', 'Void Born', 'Tomb Raider',
      'Pale King', 'Grave Yard', 'Rest In Rip', 'Dead Mint',
      'Specter OG', 'Bone Broth',
    ],
    hint: 'e.g. Ghost Fren',
  },

  party: {
    adjectives: [
      'Turbo', 'Hyper', 'Lit', 'Hype', 'Wild', 'Loud', 'Mad', 'Hot',
      'Live', 'Fizzy', 'Fresh', 'Juicy', 'Tangy', 'Zesty', 'Crispy',
      'Spicy', 'Drunk', 'Wasted',
    ],
    nouns: [
      'Mode', 'King', 'Gang', 'Squad', 'Crew', 'Fren', 'Chad', 'OG',
      'Vibes', 'Life', 'Zone', 'Hour', 'Night', 'Time', 'Bash', 'Rave',
      'Fest', 'Wave',
    ],
    titles: [
      'DJ', 'MC', 'King', 'Chief', 'Captain', 'Mayor', 'Boss', 'Don',
      'Host', 'Legend',
    ],
    fullNames: [
      'LFG Mode', 'Wagmi Fren', 'Party Fren', 'Up Only', 'Pump It',
      'Happy Hour', 'Moon Juice', 'Tang Party', 'OJ Gang', 'Zest Fest',
      'Citrus King', 'Juice Box', 'Pulp Mode', 'Tangy OG', 'Honk Party',
      'Hold My Beer', 'Full Send', 'Lets Go', 'Good Times',
      'Hot Streak', 'Night Owl', 'Hype Beast', 'Lit Mode', 'Dance Floor',
      'LFG!',
    ],
    hint: 'e.g. LFG Mode',
  },

  grinder: {
    adjectives: [
      'Hard', 'Fast', 'True', 'Grit', 'Hustle', 'Sweat', 'Sharp',
      'Keen', 'Driven', 'Steady', 'Core', 'Deep', 'Dense', 'Locked',
      'Solid', 'Raw', 'Non Stop', 'Full',
    ],
    nouns: [
      'Mode', 'Grind', 'Hustle', 'Hours', 'Sweat', 'Work', 'Push',
      'Focus', 'Drive', 'Edge', 'Lock', 'Pace', 'Run', 'Sprint',
      'Climb', 'Stack', 'Gain', 'Rep',
    ],
    titles: [
      'Master', 'Pro', 'Veteran', 'OG', 'Ace', 'Captain', 'Chief',
      'Lead', 'Boss', 'Coach',
    ],
    fullNames: [
      'No Sleep', 'Grind Mode', 'Speed Run', 'Sweat Lord', 'Pro Gamer',
      'Try Hard', 'One More Run', 'Max Level', 'Farm Life', 'Loot Grind',
      'XP Boost', 'Boss Rush', 'Hard Core', 'No Days Off', 'All Grind',
      'Late Night', 'First Clear', 'World First', 'Rank Grind',
      'Rep Max', 'The Hustle', 'Non Stop', 'Eyes Open', 'Time Attack',
      'AFK? Never',
    ],
    hint: 'e.g. Grind Mode',
  },
};

/**
 * Bonus name pools for mood combinations.
 * When primary + secondary moods match a combo, these names are added to the pool.
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
    party: ['Casino Fren', 'Lucky Degen', 'Jackpot OG', 'All In', 'Pump N Dump'],
    goofy: ['Ape Brain', 'Smooth Ape', 'Meme Coin', 'Degen Honk', 'Rare Honk'],
    elite: ['Whale Mode', 'Smart Money', 'Alpha Leak', 'Insider OG', 'Stack Chad'],
    dark: ['Bag Rekt', 'Rug Victim', 'Bear Fren', 'Down Only', 'Cope Bag'],
    wholesome: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'Green Degen'],
  },
  elite: {
    dark: ['Dark Baron', 'Shadow CEO', 'Void Mogul', 'Night Fund', 'Grim Stack'],
    warrior: ['King Slayer', 'Iron Duke', 'War Baron', 'Crown Chad', 'Throne Room'],
    chill: ['Old Money', 'Smooth Boss', 'Zen CEO', 'Easy Stack', 'Chill Duke'],
    wholesome: ['Tang King', 'Bepe Baron', 'Kind Duke', 'Green Baron', 'Noble Fren'],
    degen: ['Whale Mode', 'Tang Baron', 'Bepe Mogul', 'Bag Lord', 'Stack Lord'],
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
    spooky: ['Dead Mall', 'Bone Lord', 'Night Fren', 'Pale Rider', 'Ghost Walk'],
    degen: ['Bear Market', 'Rug Night', 'Dark Pool', 'Dump Lord', 'Grave Bag'],
    chaotic: ['Asylum OG', 'Mad World', 'Chaos Void', 'Cursed Fren', 'Broke Brain'],
  },
  mystical: {
    warrior: ['Spell Blade', 'Rune Knight', 'War Mage', 'Battle Sage', 'Mana Tank'],
    dark: ['Shadow Mage', 'Void Cast', 'Necro Fren', 'Death Rune', 'Fell Magic'],
    elite: ['Grand Mage', 'Arch Sage', 'Lore Baron', 'Spell King', 'Mana Lord'],
    goofy: ['Honk Magic', 'Meme Spell', 'Goose Mage', 'Silly Sage', 'Bonk Wand'],
  },
  wholesome: {
    grinder: ['Farm OG', 'Seed Gang', 'Plot Fren', 'Grow Stack', 'Field Day'],
    degen: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'Green Degen'],
    party: ['Tang Party', 'OJ Fest', 'Grove Bash', 'Fren Fest', 'Harvest Ale'],
    warrior: ['Shield Fren', 'Guard Duty', 'Brave Fren', 'Tank Fren', 'Iron Guard'],
    mystical: ['Seed Prayer', 'Soul Farm', 'Sacred Plot', 'Green Light', 'Bless Fren'],
  },
  cosmic: {
    degen: ['Moon Ape', 'Astro Degen', 'Space Bag', 'Star Mint', 'Launch Pad'],
    aggressive: ['Star Wars', 'Nova Bomb', 'Solar Flare', 'Meteor OG', 'Death Star'],
    chill: ['Star Gazer', 'Float Mode', 'Orbit Zen', 'Space Chill', 'Void Calm'],
    mystical: ['Star Sage', 'Moon Druid', 'Astral Mage', 'Ether Sage', 'Cosmo Sage'],
  },
  nerdy: {
    degen: ['Hash Fren', 'Node Degen', 'Stack Maxi', 'Git Rekt', 'Dev Ape'],
    goofy: ['Bug Report', '404 Brain', 'Stack Over', 'Copy Paste', 'Sudo Honk'],
    grinder: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
    dark: ['Dark Code', 'Void Stack', 'Dead Code', 'Null Fren', 'Ghost Bug'],
  },
  party: {
    chill: ['Juice Bar', 'Tang Chill', 'Smooth OJ', 'Sunset OG', 'Easy Night'],
    degen: ['Casino Fren', 'Lucky Mint', 'Moon Juice', 'Pump Fest', 'Wagmi Bash'],
    rebellious: ['Riot Fest', 'Punk Show', 'Wild Night', 'Mosh Pit', 'Stage Dive'],
  },
  chaotic: {
    dark: ['Asylum OG', 'Mad World', 'Chaos Void', 'Cursed Fren', 'Broke Brain'],
    goofy: ['Honk Chaos', 'Brain Rot', 'Spaghetti', 'Glitch Art', 'Bug Feature'],
    aggressive: ['War Crime', 'Scorched', 'Tilt God', 'Rage Quit', 'No Chill'],
  },
  grinder: {
    warrior: ['Iron Grind', 'War Sweat', 'Battle Rep', 'Hard March', 'Siege Mode'],
    degen: ['Farm Stack', 'Mine Mode', 'Yield Grind', 'Pool Sweat', 'DCA Robot'],
    nerdy: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
  },
  warrior: {
    dark: ['Dark Knight', 'Shadow Ops', 'Night Raid', 'Grim March', 'Fell Blade'],
    wholesome: ['Shield Fren', 'Guard Duty', 'Brave Fren', 'Tank Fren', 'Iron Guard'],
    aggressive: ['War Machine', 'Iron Storm', 'Total War', 'No Quarter', 'Brute Squad'],
  },
  spooky: {
    dark: ['Grave Lord', 'Death King', 'Bone Baron', 'Night Shade', 'Fell Haunt'],
    goofy: ['Boo Honk', 'Spooky Honk', 'Ghost Honk', 'Skull Meme', 'Dead Meme'],
  },
};
