import type { CombatType, CombatMove } from '../types';

// 174 moves ported from ClawCombat pokeapi-moves.json
// Organized by type, 8-12 moves per type

const ALL_MOVES: CombatMove[] = [
  // NEUTRAL (9 moves)
  { id: "poke_normal_pound", name: "Ratio", type: "NEUTRAL" as CombatType, power: 40, accuracy: 100, pp: 35, category: "physical" as const, description: "Delivers a basic beatdown. Nothing fancy, just numbers." },
  { id: "poke_normal_pay-day", name: "Coin Flip", type: "NEUTRAL" as CombatType, power: 40, accuracy: 100, pp: 20, category: "physical" as const, description: "Flips a coin and strikes. Pure degen energy." },
  { id: "poke_normal_quick-attack", name: "First Reply", type: "NEUTRAL" as CombatType, power: 40, accuracy: 100, pp: 30, category: "physical" as const, description: "Gets in first — always. The early reply wins.", effects: [{ type: "priority" }] },
  { id: "poke_normal_sing", name: "Cope Song", type: "NEUTRAL" as CombatType, power: 0, accuracy: 55, pp: 15, category: "status" as const, description: "Sings a soothing cope melody. May put the foe to sleep.", effects: [{ type: "status", chance: 100, status: "sleep" }] },
  { id: "poke_normal_supersonic", name: "Soyjak Screech", type: "NEUTRAL" as CombatType, power: 0, accuracy: 55, pp: 20, category: "status" as const, description: "Emits a confused shriek that scrambles the opponent's brain.", effects: [{ type: "status", chance: 100, status: "confusion" }] },
  { id: "poke_normal_recover", name: "Hopium Dose", type: "NEUTRAL" as CombatType, power: 0, accuracy: 100, pp: 5, category: "status" as const, description: "Takes a deep hit of hopium. Restores up to half HP.", effects: [{ type: "heal", percent: 50 }] },
  { id: "poke_normal_swords-dance", name: "Gigachad Stance", type: "NEUTRAL" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Strikes the iconic pose. Sharply raises Attack.", effects: [{ type: "stat_boost", stat: "attack", stages: 2, target: "self" }] },
  { id: "poke_normal_tail-whip", name: "Blank Stare", type: "NEUTRAL" as CombatType, power: 0, accuracy: 100, pp: 30, category: "status" as const, description: "Stares blankly with zero expression. Lowers the foe's Defense.", effects: [{ type: "stat_drop", chance: 100, stat: "defense", stages: 1, target: "opponent" }] },
  { id: "poke_normal_double-edge", name: "Full Degen", type: "NEUTRAL" as CombatType, power: 110, accuracy: 100, pp: 15, category: "physical" as const, description: "Goes absolutely all-in. Massive damage but hurts yourself too.", effects: [{ type: "recoil", percent: 33 }] },
  // FIRE (10 moves)
  { id: "poke_fire_flare-blitz", name: "Rug Pull Rush", type: "FIRE" as CombatType, power: 120, accuracy: 100, pp: 15, category: "physical" as const, description: "Charges in hot and burns everything down. Recoil hurts.", effects: [{ type: "recoil", percent: 33 }] },
  { id: "poke_fire_fire-punch", name: "Liquidation Punch", type: "FIRE" as CombatType, power: 75, accuracy: 100, pp: 15, category: "physical" as const, description: "A fiery punch that liquidates on contact. May burn.", effects: [{ type: "status", chance: 10, status: "burn" }] },
  { id: "poke_fire_ember", name: "FUD Spark", type: "FIRE" as CombatType, power: 40, accuracy: 100, pp: 25, category: "special" as const, description: "Throws a small spark of fear and doubt. May burn the foe.", effects: [{ type: "status", chance: 10, status: "burn" }] },
  { id: "poke_fire_burning-bulwark", name: "Firewall", type: "FIRE" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Wraps in protective flames. Burns attackers on contact." },
  { id: "poke_fire_will-o-wisp", name: "Spite Flame", type: "FIRE" as CombatType, power: 0, accuracy: 85, pp: 15, category: "status" as const, description: "Lights the opponent on fire out of pure spite.", effects: [{ type: "status", chance: 100, status: "burn" }] },
  { id: "poke_fire_overheat", name: "Meltdown", type: "FIRE" as CombatType, power: 110, accuracy: 90, pp: 5, category: "special" as const, description: "Goes into full meltdown mode. Devastating but tanks your own power.", effects: [{ type: "stat_drop", chance: 100, stat: "sp_atk", stages: 2, target: "self" }] },
  { id: "poke_fire_flamethrower", name: "Flamethrower", type: "FIRE" as CombatType, power: 90, accuracy: 100, pp: 15, category: "special" as const, description: "A classic stream of fire. Needs no rename. May burn.", effects: [{ type: "status", chance: 10, status: "burn" }] },
  { id: "poke_fire_flame-charge", name: "FOMO Rush", type: "FIRE" as CombatType, power: 50, accuracy: 100, pp: 20, category: "physical" as const, description: "Rushes in driven by fear of missing out. Boosts Speed.", effects: [{ type: "stat_boost", stat: "speed", stages: 1, target: "self" }] },
  { id: "poke_fire_lava-plume", name: "Market Crash", type: "FIRE" as CombatType, power: 80, accuracy: 100, pp: 15, category: "special" as const, description: "Everything burns. The whole market is on fire. High burn chance.", effects: [{ type: "status", chance: 30, status: "burn" }] },
  { id: "poke_fire_fire-spin", name: "Dumpster Fire", type: "FIRE" as CombatType, power: 40, accuracy: 85, pp: 15, category: "special" as const, description: "Traps the foe in a swirling dumpster fire. May burn.", effects: [{ type: "status", chance: 10, status: "burn" }] },
  // WATER (8 moves)
  { id: "poke_water_wave-crash", name: "Whale Splash", type: "WATER" as CombatType, power: 110, accuracy: 100, pp: 10, category: "physical" as const, description: "A massive whale splash that drenches the foe. Recoil damage.", effects: [{ type: "recoil", percent: 33 }] },
  { id: "poke_water_water-gun", name: "Tears of Joy", type: "WATER" as CombatType, power: 40, accuracy: 100, pp: 25, category: "special" as const, description: "Fires tears of pure joy at the opponent." },
  { id: "poke_water_bubble-beam", name: "Bubble Pop", type: "WATER" as CombatType, power: 65, accuracy: 100, pp: 20, category: "special" as const, description: "Pops a market bubble. Drops the foe's speed.", effects: [{ type: "stat_drop", chance: 10, stat: "speed", stages: 1, target: "opponent" }] },
  { id: "poke_water_aqua-jet", name: "Buy The Dip", type: "WATER" as CombatType, power: 40, accuracy: 100, pp: 20, category: "physical" as const, description: "Buys the dip and strikes first — priority move.", effects: [{ type: "priority" }] },
  { id: "poke_water_bouncy-bubble", name: "Liquidity Drain", type: "WATER" as CombatType, power: 60, accuracy: 100, pp: 20, category: "special" as const, description: "Drains the foe's liquidity and absorbs it as HP.", effects: [{ type: "drain", percent: 100 }] },
  { id: "poke_water_withdraw", name: "HODL", type: "WATER" as CombatType, power: 0, accuracy: 100, pp: 40, category: "status" as const, description: "Holds the line. Raises Defense.", effects: [{ type: "stat_boost", stat: "defense", stages: 1, target: "self" }] },
  { id: "poke_water_waterfall", name: "Pump It", type: "WATER" as CombatType, power: 80, accuracy: 100, pp: 15, category: "physical" as const, description: "Pumps the tide and slams the opponent. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  { id: "poke_water_crabhammer", name: "Diamond Hands", type: "WATER" as CombatType, power: 100, accuracy: 90, pp: 10, category: "physical" as const, description: "Crushes with diamond-hard conviction. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // ELECTRIC (11 moves)
  { id: "poke_electric_bolt-strike", name: "Short Squeeze", type: "ELECTRIC" as CombatType, power: 110, accuracy: 85, pp: 5, category: "physical" as const, description: "Squeezes with shocking force. May paralyze.", effects: [{ type: "status", chance: 20, status: "paralysis" }] },
  { id: "poke_electric_electro-shot", name: "Lightning Sell", type: "ELECTRIC" as CombatType, power: 110, accuracy: 100, pp: 10, category: "special" as const, description: "Dumps a lightning bolt of selling pressure." },
  { id: "poke_electric_zap-cannon", name: "Zeus Strike", type: "ELECTRIC" as CombatType, power: 120, accuracy: 50, pp: 5, category: "special" as const, description: "Calls down Zeus himself. Guaranteed paralyze but low accuracy.", effects: [{ type: "status", chance: 100, status: "paralysis" }] },
  { id: "poke_electric_thunder-punch", name: "Static Shock", type: "ELECTRIC" as CombatType, power: 75, accuracy: 100, pp: 15, category: "physical" as const, description: "A shocking physical jolt. May paralyze.", effects: [{ type: "status", chance: 10, status: "paralysis" }] },
  { id: "poke_electric_thunder-shock", name: "Zap", type: "ELECTRIC" as CombatType, power: 40, accuracy: 100, pp: 30, category: "special" as const, description: "Quick zap of static. May paralyze.", effects: [{ type: "status", chance: 10, status: "paralysis" }] },
  { id: "poke_electric_zippy-zap", name: "Flash Crash", type: "ELECTRIC" as CombatType, power: 80, accuracy: 100, pp: 10, category: "physical" as const, description: "Crashes through defenses — always crits, priority move.", effects: [{ type: "priority" }] },
  { id: "poke_electric_thunder-wave", name: "Thunder FUD", type: "ELECTRIC" as CombatType, power: 0, accuracy: 90, pp: 20, category: "status" as const, description: "Spreads fear, uncertainty, and paralysis.", effects: [{ type: "status", chance: 100, status: "paralysis" }] },
  { id: "poke_electric_charge", name: "Charge Up", type: "ELECTRIC" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Stores energy for later. Raises Sp.Def.", effects: [{ type: "stat_boost", stat: "sp_def", stages: 1, target: "self" }] },
  { id: "poke_electric_eerie-impulse", name: "Signal Jam", type: "ELECTRIC" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Jams the foe's signals. Drops their Sp.Atk sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "sp_atk", stages: 2, target: "opponent" }] },
  { id: "poke_electric_volt-tackle", name: "YOLO Charge", type: "ELECTRIC" as CombatType, power: 120, accuracy: 100, pp: 15, category: "physical" as const, description: "Full YOLO electric charge. Massive recoil.", effects: [{ type: "recoil", percent: 33 }] },
  { id: "poke_electric_zing-zap", name: "Power Surge", type: "ELECTRIC" as CombatType, power: 80, accuracy: 100, pp: 10, category: "physical" as const, description: "A surge of raw power. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  // GRASS (10 moves)
  { id: "poke_grass_solar-blade", name: "Solar Cope", type: "GRASS" as CombatType, power: 110, accuracy: 100, pp: 10, category: "physical" as const, description: "Channels solar copium into a devastating blade." },
  { id: "poke_grass_vine-whip", name: "Touch Grass", type: "GRASS" as CombatType, power: 45, accuracy: 100, pp: 25, category: "physical" as const, description: "Basic grass strike. Sometimes you just need to touch grass." },
  { id: "poke_grass_mega-drain", name: "Siphon Green", type: "GRASS" as CombatType, power: 40, accuracy: 100, pp: 15, category: "special" as const, description: "Siphons green energy from the foe. Drains HP.", effects: [{ type: "drain", percent: 50 }] },
  { id: "poke_grass_spiky-shield", name: "Hedge Fund", type: "GRASS" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Priority thorns protect your investment.", effects: [{ type: "priority" }] },
  { id: "poke_grass_stun-spore", name: "Grass Roots", type: "GRASS" as CombatType, power: 0, accuracy: 75, pp: 30, category: "status" as const, description: "Paralyzes from the roots up.", effects: [{ type: "status", chance: 100, status: "paralysis" }] },
  { id: "poke_grass_sleep-powder", name: "Touch Grass Nap", type: "GRASS" as CombatType, power: 0, accuracy: 75, pp: 15, category: "status" as const, description: "Pollen so calming it puts the foe to sleep.", effects: [{ type: "status", chance: 100, status: "sleep" }] },
  { id: "poke_grass_absorb", name: "Tax Farm", type: "GRASS" as CombatType, power: 20, accuracy: 100, pp: 25, category: "special" as const, description: "Taxes the foe's energy. Low power but drains HP.", effects: [{ type: "drain", percent: 50 }] },
  { id: "poke_grass_cotton-guard", name: "Bubble Wrap", type: "GRASS" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Wraps in protective fiber. Massively raises Defense.", effects: [{ type: "stat_boost", stat: "defense", stages: 3, target: "self" }] },
  { id: "poke_grass_cotton-spore", name: "Slow Meme", type: "GRASS" as CombatType, power: 0, accuracy: 100, pp: 40, category: "status" as const, description: "A cloud of slow-burning meme energy. Drops foe speed sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "speed", stages: 2, target: "opponent" }] },
  { id: "poke_grass_wood-hammer", name: "Timber Yeet", type: "GRASS" as CombatType, power: 120, accuracy: 100, pp: 15, category: "physical" as const, description: "Yeets a whole tree at the foe. Recoil damage.", effects: [{ type: "recoil", percent: 33 }] },
  // ICE (8 moves)
  { id: "poke_ice_glacial-lance", name: "Brain Freeze", type: "ICE" as CombatType, power: 110, accuracy: 100, pp: 5, category: "physical" as const, description: "Pierces with pure brain freeze." },
  { id: "poke_ice_ice-punch", name: "Cold Punch", type: "ICE" as CombatType, power: 75, accuracy: 100, pp: 15, category: "physical" as const, description: "An ice-cold punch. May freeze the foe.", effects: [{ type: "status", chance: 10, status: "freeze" }] },
  { id: "poke_ice_aurora-beam", name: "Aurora Cope", type: "ICE" as CombatType, power: 65, accuracy: 100, pp: 20, category: "special" as const, description: "Coping so hard it creates auroras. Drops foe ATK.", effects: [{ type: "stat_drop", chance: 10, stat: "attack", stages: 1, target: "opponent" }] },
  { id: "poke_ice_ice-shard", name: "Ice Cold Take", type: "ICE" as CombatType, power: 40, accuracy: 100, pp: 30, category: "physical" as const, description: "A take so cold it hits first — priority move.", effects: [{ type: "priority" }] },
  { id: "poke_ice_sheer-cold", name: "Absolute Zero", type: "ICE" as CombatType, power: 200, accuracy: 30, pp: 5, category: "special" as const, description: "The coldest take possible. Mega nuke but almost never hits." },
  { id: "poke_ice_icicle-crash", name: "Avalanche Drop", type: "ICE" as CombatType, power: 85, accuracy: 90, pp: 10, category: "physical" as const, description: "Drops an avalanche. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_ice_frost-breath", name: "Cold Read", type: "ICE" as CombatType, power: 60, accuracy: 90, pp: 10, category: "special" as const, description: "Reads the foe cold. Always crits.", effects: [{ type: "high_crit", chance: 87.5 }] },
  { id: "poke_ice_blizzard", name: "Blizzard", type: "ICE" as CombatType, power: 110, accuracy: 70, pp: 5, category: "special" as const, description: "A massive blizzard. May freeze. Low accuracy.", effects: [{ type: "status", chance: 10, status: "freeze" }] },
  // MARTIAL (8 moves)
  { id: "poke_fighting_focus-blast", name: "Spirit Bomb", type: "MARTIAL" as CombatType, power: 120, accuracy: 70, pp: 5, category: "special" as const, description: "Channels fighting spirit into a devastating burst. May drop Sp.Def.", effects: [{ type: "stat_drop", chance: 10, stat: "sp_def", stages: 1, target: "opponent" }] },
  { id: "poke_fighting_karate-chop", name: "Karate Chop", type: "MARTIAL" as CombatType, power: 50, accuracy: 100, pp: 25, category: "physical" as const, description: "A focused chop. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  { id: "poke_fighting_mach-punch", name: "Quick Hands", type: "MARTIAL" as CombatType, power: 40, accuracy: 100, pp: 30, category: "physical" as const, description: "Fast hands strike first — priority move.", effects: [{ type: "priority" }] },
  { id: "poke_fighting_detect", name: "Read The Room", type: "MARTIAL" as CombatType, power: 0, accuracy: 100, pp: 5, category: "status" as const, description: "Reads the room and dodges — priority protect.", effects: [{ type: "priority" }] },
  { id: "poke_fighting_drain-punch", name: "Gym Bro Punch", type: "MARTIAL" as CombatType, power: 75, accuracy: 100, pp: 10, category: "physical" as const, description: "Punches like a gym bro. Drains HP.", effects: [{ type: "drain", percent: 50 }] },
  { id: "poke_fighting_bulk-up", name: "Bulk Up", type: "MARTIAL" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Gets swole. Raises Attack.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }] },
  { id: "poke_fighting_rolling-kick", name: "Roundhouse Cope", type: "MARTIAL" as CombatType, power: 60, accuracy: 85, pp: 15, category: "physical" as const, description: "A spinning cope kick. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_fighting_cross-chop", name: "Cross Counter", type: "MARTIAL" as CombatType, power: 100, accuracy: 80, pp: 5, category: "physical" as const, description: "A devastating cross counter. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // VENOM (11 moves)
  { id: "poke_poison_gunk-shot", name: "Toxic Dump", type: "VENOM" as CombatType, power: 120, accuracy: 80, pp: 5, category: "physical" as const, description: "Dumps toxic waste. High poison chance.", effects: [{ type: "status", chance: 30, status: "poison" }] },
  { id: "poke_poison_belch", name: "Gas Leak", type: "VENOM" as CombatType, power: 120, accuracy: 90, pp: 10, category: "special" as const, description: "A noxious gas leak. Devastating special attack." },
  { id: "poke_poison_noxious-torque", name: "Toxic Grind", type: "VENOM" as CombatType, power: 100, accuracy: 100, pp: 10, category: "physical" as const, description: "Grinds through with toxic energy." },
  { id: "poke_poison_acid", name: "Acid Take", type: "VENOM" as CombatType, power: 40, accuracy: 100, pp: 30, category: "special" as const, description: "An acidic hot take that melts Sp.Def.", effects: [{ type: "stat_drop", chance: 10, stat: "sp_def", stages: 1, target: "opponent" }] },
  { id: "poke_poison_sludge", name: "Sewer Water", type: "VENOM" as CombatType, power: 65, accuracy: 100, pp: 20, category: "special" as const, description: "Fires literal sewer water. May poison.", effects: [{ type: "status", chance: 30, status: "poison" }] },
  { id: "poke_poison_baneful-bunker", name: "Hazmat Suit", type: "VENOM" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Priority shield that poisons on contact.", effects: [{ type: "priority" }] },
  { id: "poke_poison_poison-powder", name: "Bad Vibes", type: "VENOM" as CombatType, power: 0, accuracy: 75, pp: 35, category: "status" as const, description: "Spreads bad vibes. Guaranteed poison.", effects: [{ type: "status", chance: 100, status: "poison" }] },
  { id: "poke_poison_toxic", name: "Lethal Dose", type: "VENOM" as CombatType, power: 0, accuracy: 90, pp: 10, category: "status" as const, description: "A lethal dose of toxin. Guaranteed heavy poison.", effects: [{ type: "status", chance: 100, status: "poison" }] },
  { id: "poke_poison_purify", name: "Touch Grass Cure", type: "VENOM" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Touches grass to heal. Restores 50% HP.", effects: [{ type: "heal", percent: 50 }] },
  { id: "poke_poison_acid-armor", name: "Thick Skin", type: "VENOM" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Develops thick skin. Sharply raises Defense.", effects: [{ type: "stat_boost", stat: "defense", stages: 2, target: "self" }] },
  { id: "poke_poison_venom-drench", name: "Cope Spray", type: "VENOM" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Sprays copium mist. Drops foe ATK.", effects: [{ type: "stat_drop", chance: 100, stat: "attack", stages: 1, target: "opponent" }] },
  // EARTH (10 moves)
  { id: "poke_ground_precipice-blades", name: "Tectonic Cope", type: "EARTH" as CombatType, power: 120, accuracy: 85, pp: 10, category: "physical" as const, description: "Cleaves the earth with pure copium force." },
  { id: "poke_ground_sandsear-storm", name: "Sandstorm Rage", type: "EARTH" as CombatType, power: 100, accuracy: 80, pp: 10, category: "special" as const, description: "A desert sandstorm of rage. May burn.", effects: [{ type: "status", chance: 30, status: "burn" }] },
  { id: "poke_ground_headlong-rush", name: "Face Plant", type: "EARTH" as CombatType, power: 110, accuracy: 100, pp: 5, category: "physical" as const, description: "Slams the ground face-first. Lowers own DEF.", effects: [{ type: "stat_drop", stat: "defense", stages: 1, target: "self" }] },
  { id: "poke_ground_stomping-tantrum", name: "Tantrum Stomp", type: "EARTH" as CombatType, power: 75, accuracy: 100, pp: 10, category: "physical" as const, description: "Stomps in a tantrum. Doubles power if prev move missed." },
  { id: "poke_ground_scorching-sands", name: "Hot Sand", type: "EARTH" as CombatType, power: 70, accuracy: 100, pp: 10, category: "special" as const, description: "The sand is literally on fire. May burn.", effects: [{ type: "status", chance: 30, status: "burn" }] },
  { id: "poke_ground_shore-up", name: "Grounded", type: "EARTH" as CombatType, power: 0, accuracy: 100, pp: 5, category: "status" as const, description: "Stays grounded and heals. Restores 50% HP.", effects: [{ type: "heal", percent: 50 }] },
  { id: "poke_ground_sand-attack", name: "Pocket Sand", type: "EARTH" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Throws pocket sand. Drops foe accuracy.", effects: [{ type: "stat_drop", chance: 100, stat: "accuracy", stages: 1, target: "opponent" }] },
  { id: "poke_ground_fissure", name: "Earthquake", type: "EARTH" as CombatType, power: 200, accuracy: 30, pp: 5, category: "physical" as const, description: "Splits the earth open. Mega nuke, rarely hits." },
  { id: "poke_ground_bone-club", name: "Bonk", type: "EARTH" as CombatType, power: 65, accuracy: 85, pp: 20, category: "physical" as const, description: "Bonks the foe on the head. May flinch.", effects: [{ type: "flinch", chance: 10 }] },
  { id: "poke_ground_drill-run", name: "Drill Down", type: "EARTH" as CombatType, power: 80, accuracy: 95, pp: 10, category: "physical" as const, description: "Drills down deep then strikes. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // AIR (9 moves)
  { id: "poke_flying_hurricane", name: "Brain Storm", type: "AIR" as CombatType, power: 110, accuracy: 70, pp: 10, category: "special" as const, description: "A brainstorm so intense it confuses the foe.", effects: [{ type: "status", chance: 30, status: "confusion" }] },
  { id: "poke_flying_brave-bird", name: "Dive Bomb", type: "AIR" as CombatType, power: 120, accuracy: 100, pp: 15, category: "physical" as const, description: "Dive bombs with reckless abandon. Recoil damage.", effects: [{ type: "recoil", percent: 33 }] },
  { id: "poke_flying_gust", name: "Hot Air", type: "AIR" as CombatType, power: 40, accuracy: 100, pp: 35, category: "special" as const, description: "Blows hot air at the foe. Basic special attack." },
  { id: "poke_flying_wing-attack", name: "Wing Slap", type: "AIR" as CombatType, power: 60, accuracy: 100, pp: 35, category: "physical" as const, description: "Slaps with wings. Basic physical air attack." },
  { id: "poke_flying_roost", name: "Grass Landing", type: "AIR" as CombatType, power: 0, accuracy: 100, pp: 5, category: "status" as const, description: "Lands on grass to rest. Heals 50% HP.", effects: [{ type: "heal", percent: 50 }] },
  { id: "poke_flying_feather-dance", name: "Debunk", type: "AIR" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Debunks with a powerful downdraft. Drops foe ATK sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "attack", stages: 2, target: "opponent" }] },
  { id: "poke_flying_air-slash", name: "Air Cutter", type: "AIR" as CombatType, power: 75, accuracy: 95, pp: 15, category: "special" as const, description: "Cuts through the air. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_flying_aeroblast", name: "Pressure Cannon", type: "AIR" as CombatType, power: 100, accuracy: 95, pp: 5, category: "special" as const, description: "Fires a high-pressure blast. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  { id: "poke_flying_dragon-ascent", name: "Sent To Heaven", type: "AIR" as CombatType, power: 110, accuracy: 100, pp: 5, category: "physical" as const, description: "Sends the foe heavenward. Lowers own DEF from the effort.", effects: [{ type: "stat_drop", stat: "defense", stages: 1, target: "self" }] },
  // PSYCHE (11 moves)
  { id: "poke_psychic_psychic-fangs", name: "Brain Rot", type: "PSYCHE" as CombatType, power: 85, accuracy: 100, pp: 10, category: "physical" as const, description: "Inflicts pure brain rot." },
  { id: "poke_psychic_future-sight", name: "I Called It", type: "PSYCHE" as CombatType, power: 110, accuracy: 100, pp: 10, category: "special" as const, description: "A delayed psychic strike. Called it before it happened." },
  { id: "poke_psychic_psybeam", name: "Brain Beam", type: "PSYCHE" as CombatType, power: 65, accuracy: 100, pp: 20, category: "special" as const, description: "Fires a beam of pure brain energy. May confuse.", effects: [{ type: "status", chance: 10, status: "confusion" }] },
  { id: "poke_psychic_confusion", name: "Confusion Posting", type: "PSYCHE" as CombatType, power: 50, accuracy: 100, pp: 25, category: "special" as const, description: "Posts something so confusing it bewilders the foe.", effects: [{ type: "status", chance: 10, status: "confusion" }] },
  { id: "poke_psychic_magic-coat", name: "Reverse Uno", type: "PSYCHE" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Reflects attacks back. Priority protect.", effects: [{ type: "priority" }] },
  { id: "poke_psychic_hypnosis", name: "Doom Scroll", type: "PSYCHE" as CombatType, power: 0, accuracy: 60, pp: 20, category: "status" as const, description: "The foe doom scrolls into sleep.", effects: [{ type: "status", chance: 100, status: "sleep" }] },
  { id: "poke_psychic_dream-eater", name: "Nightmare Farm", type: "PSYCHE" as CombatType, power: 100, accuracy: 100, pp: 15, category: "special" as const, description: "Farms the foe's nightmares for HP.", effects: [{ type: "drain", percent: 50 }] },
  { id: "poke_psychic_meditate", name: "Focus Mode", type: "PSYCHE" as CombatType, power: 0, accuracy: 100, pp: 40, category: "status" as const, description: "Enters focus mode. Raises Attack.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }] },
  { id: "poke_psychic_kinesis", name: "Gaslight", type: "PSYCHE" as CombatType, power: 0, accuracy: 80, pp: 15, category: "status" as const, description: "Gaslights the foe. Drops their accuracy.", effects: [{ type: "stat_drop", chance: 100, stat: "accuracy", stages: 1, target: "opponent" }] },
  { id: "poke_psychic_extrasensory", name: "Gut Feeling", type: "PSYCHE" as CombatType, power: 80, accuracy: 100, pp: 20, category: "special" as const, description: "A gut feeling strike. May flinch.", effects: [{ type: "flinch", chance: 10 }] },
  { id: "poke_psychic_psycho-cut", name: "Mind Blade", type: "PSYCHE" as CombatType, power: 70, accuracy: 100, pp: 20, category: "physical" as const, description: "A blade of pure thought. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // INSECT (10 moves)
  { id: "poke_bug_megahorn", name: "Hive Mind Lance", type: "INSECT" as CombatType, power: 120, accuracy: 85, pp: 10, category: "physical" as const, description: "The hive mind strikes as one." },
  { id: "poke_bug_bug-buzz", name: "Bug Report", type: "INSECT" as CombatType, power: 90, accuracy: 100, pp: 10, category: "special" as const, description: "Files a devastating bug report. Drops Sp.Def.", effects: [{ type: "stat_drop", chance: 10, stat: "sp_def", stages: 1, target: "opponent" }] },
  { id: "poke_bug_attack-order", name: "Mob Attack", type: "INSECT" as CombatType, power: 90, accuracy: 100, pp: 15, category: "physical" as const, description: "The mob attacks. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  { id: "poke_bug_silver-wind", name: "Butterfly Effect", type: "INSECT" as CombatType, power: 60, accuracy: 100, pp: 5, category: "special" as const, description: "A small flutter creates a big effect. Boosts ATK.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }] },
  { id: "poke_bug_signal-beam", name: "Signal Boost", type: "INSECT" as CombatType, power: 75, accuracy: 100, pp: 15, category: "special" as const, description: "Boosts the signal. May confuse.", effects: [{ type: "status", chance: 10, status: "confusion" }] },
  { id: "poke_bug_rage-powder", name: "Rage Bait", type: "INSECT" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Priority rage bait that draws all attacks.", effects: [{ type: "priority" }] },
  { id: "poke_bug_leech-life", name: "Leech", type: "INSECT" as CombatType, power: 80, accuracy: 100, pp: 10, category: "physical" as const, description: "Leeches HP from the foe.", effects: [{ type: "drain", percent: 50 }] },
  { id: "poke_bug_tail-glow", name: "Glow Up", type: "INSECT" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "The ultimate glow up. Massively raises Sp.Atk.", effects: [{ type: "stat_boost", stat: "sp_atk", stages: 3, target: "self" }] },
  { id: "poke_bug_string-shot", name: "Sticky Thread", type: "INSECT" as CombatType, power: 0, accuracy: 95, pp: 40, category: "status" as const, description: "A sticky thread that sharply drops foe speed.", effects: [{ type: "stat_drop", chance: 100, stat: "speed", stages: 2, target: "opponent" }] },
  { id: "poke_bug_steamroller", name: "Bug Squash", type: "INSECT" as CombatType, power: 65, accuracy: 100, pp: 20, category: "physical" as const, description: "Squashes the foe like a bug. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  // STONE (8 moves)
  { id: "poke_rock_meteor-beam", name: "Meteor Strike", type: "STONE" as CombatType, power: 120, accuracy: 90, pp: 10, category: "special" as const, description: "Hurls a meteor at the foe." },
  { id: "poke_rock_ancient-power", name: "Boomer Power", type: "STONE" as CombatType, power: 60, accuracy: 100, pp: 5, category: "special" as const, description: "Channel boomer energy. Boosts ATK.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }] },
  { id: "poke_rock_smack-down", name: "Throw Rock", type: "STONE" as CombatType, power: 50, accuracy: 100, pp: 15, category: "physical" as const, description: "Throws a rock. Simple as." },
  { id: "poke_rock_wide-guard", name: "Stone Wall", type: "STONE" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Raises a stone wall. Priority protect.", effects: [{ type: "priority" }] },
  { id: "poke_rock_rock-polish", name: "Polish Grind", type: "STONE" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Grinds and polishes. Sharply raises Speed.", effects: [{ type: "stat_boost", stat: "speed", stages: 2, target: "self" }] },
  { id: "poke_rock_tar-shot", name: "Tar Pit", type: "STONE" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Coats the foe in tar. Drops their speed.", effects: [{ type: "stat_drop", chance: 100, stat: "speed", stages: 1, target: "opponent" }] },
  { id: "poke_rock_rock-slide", name: "Rockslide", type: "STONE" as CombatType, power: 75, accuracy: 90, pp: 10, category: "physical" as const, description: "Slides rocks down on the foe. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_rock_stone-edge", name: "Stone Edge", type: "STONE" as CombatType, power: 100, accuracy: 80, pp: 5, category: "physical" as const, description: "A sharpened stone blade. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // GHOST (10 moves)
  { id: "poke_ghost_shadow-force", name: "Ghost Post", type: "GHOST" as CombatType, power: 110, accuracy: 100, pp: 5, category: "physical" as const, description: "Posts from beyond the grave. Hits through protect." },
  { id: "poke_ghost_astral-barrage", name: "Doomer Barrage", type: "GHOST" as CombatType, power: 110, accuracy: 100, pp: 5, category: "special" as const, description: "A barrage of doomer energy." },
  { id: "poke_ghost_poltergeist", name: "Cursed NFT", type: "GHOST" as CombatType, power: 110, accuracy: 90, pp: 5, category: "physical" as const, description: "Throws a cursed NFT." },
  { id: "poke_ghost_shadow-punch", name: "Ghost Punch", type: "GHOST" as CombatType, power: 60, accuracy: 100, pp: 20, category: "physical" as const, description: "A ghostly punch that never misses." },
  { id: "poke_ghost_shadow-claw", name: "Spectral Cut", type: "GHOST" as CombatType, power: 70, accuracy: 100, pp: 15, category: "physical" as const, description: "A spectral slash. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  { id: "poke_ghost_shadow-sneak", name: "Spooky Quick", type: "GHOST" as CombatType, power: 40, accuracy: 100, pp: 30, category: "physical" as const, description: "Spooky fast — priority move.", effects: [{ type: "priority" }] },
  { id: "poke_ghost_confuse-ray", name: "Doomer Spiral", type: "GHOST" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Spirals the foe into doomer confusion.", effects: [{ type: "status", chance: 100, status: "confusion" }] },
  { id: "poke_ghost_shadow-ball", name: "Shadow Ball", type: "GHOST" as CombatType, power: 80, accuracy: 100, pp: 15, category: "special" as const, description: "A classic shadow ball. May drop Sp.Def.", effects: [{ type: "stat_drop", chance: 20, stat: "sp_def", stages: 1, target: "opponent" }] },
  { id: "poke_ghost_hex", name: "Bad Omen", type: "GHOST" as CombatType, power: 65, accuracy: 100, pp: 10, category: "special" as const, description: "An omen of bad luck. Extra damage vs status'd foes." },
  { id: "poke_ghost_curse", name: "Blood Pact", type: "GHOST" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Sacrifices HP to burn the foe.", effects: [{ type: "status", chance: 100, status: "burn" }] },
  // DRAGON (10 moves)
  { id: "poke_dragon_outrage", name: "Rage Mode", type: "DRAGON" as CombatType, power: 110, accuracy: 100, pp: 10, category: "physical" as const, description: "Goes into rage mode. Multi-turn but causes confusion." },
  { id: "poke_dragon_dragon-breath", name: "Dragon Breath", type: "DRAGON" as CombatType, power: 60, accuracy: 100, pp: 20, category: "special" as const, description: "Breathes dragon fumes. May paralyze.", effects: [{ type: "status", chance: 30, status: "paralysis" }] },
  { id: "poke_dragon_twister", name: "Whirlwind Cope", type: "DRAGON" as CombatType, power: 40, accuracy: 100, pp: 20, category: "special" as const, description: "A whirlwind of cope. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  { id: "poke_dragon_dragon-dance", name: "Dragon Dance", type: "DRAGON" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "The legendary dragon dance. Raises ATK and Speed.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }, { type: "stat_boost", stat: "speed", stages: 1, target: "self" }] },
  { id: "poke_dragon_dragon-rush", name: "Dragon Rush", type: "DRAGON" as CombatType, power: 100, accuracy: 75, pp: 10, category: "physical" as const, description: "Rushes with dragon force. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  { id: "poke_dragon_spacial-rend", name: "Reality Check", type: "DRAGON" as CombatType, power: 100, accuracy: 95, pp: 5, category: "special" as const, description: "A reality check so brutal it always crits.", effects: [{ type: "high_crit", chance: 25 }] },
  { id: "poke_dragon_dragon-claw", name: "Dragon Claw", type: "DRAGON" as CombatType, power: 80, accuracy: 100, pp: 15, category: "physical" as const, description: "Classic dragon claw. Reliable physical dragon." },
  { id: "poke_dragon_dragon-pulse", name: "Dragon Pulse", type: "DRAGON" as CombatType, power: 85, accuracy: 100, pp: 10, category: "special" as const, description: "Classic dragon pulse. Reliable special dragon." },
  { id: "poke_dragon_draco-meteor", name: "Draco Meteor", type: "DRAGON" as CombatType, power: 110, accuracy: 90, pp: 5, category: "special" as const, description: "The ultimate dragon nuke. Drops own Sp.Atk sharply.", effects: [{ type: "stat_drop", stat: "sp_atk", stages: 2, target: "self" }] },
  { id: "poke_dragon_dragon-tail", name: "Dragon Tail", type: "DRAGON" as CombatType, power: 60, accuracy: 90, pp: 10, category: "physical" as const, description: "Swipes with the tail. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  // SHADOW (12 moves)
  { id: "poke_dark_hyperspace-fury", name: "Shadow Raid", type: "SHADOW" as CombatType, power: 100, accuracy: 100, pp: 5, category: "physical" as const, description: "A shadow raid that ignores protect.", effects: [{ type: "stat_drop", chance: 100, stat: "defense", stages: 1, target: "opponent" }] },
  { id: "poke_dark_fiery-wrath", name: "Seethe Flame", type: "SHADOW" as CombatType, power: 90, accuracy: 100, pp: 10, category: "special" as const, description: "Burns with pure seethe energy. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  { id: "poke_dark_foul-play", name: "Dirty Play", type: "SHADOW" as CombatType, power: 95, accuracy: 100, pp: 15, category: "physical" as const, description: "Uses the foe's own ATK against them." },
  { id: "poke_dark_bite", name: "Dark Bite", type: "SHADOW" as CombatType, power: 60, accuracy: 100, pp: 25, category: "physical" as const, description: "A dark bite. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_dark_thief", name: "Rug Pull", type: "SHADOW" as CombatType, power: 60, accuracy: 100, pp: 25, category: "physical" as const, description: "Pulls the rug. Steal-themed attack." },
  { id: "poke_dark_snatch", name: "Account Hack", type: "SHADOW" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Hacks the foe's next move. Priority steal.", effects: [{ type: "priority" }] },
  { id: "poke_dark_flatter", name: "Bait Post", type: "SHADOW" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Baits the foe. Confuses them but raises their Sp.Atk.", effects: [{ type: "status", chance: 100, status: "confusion" }] },
  { id: "poke_dark_dark-void", name: "Doomer Sleep", type: "SHADOW" as CombatType, power: 0, accuracy: 50, pp: 10, category: "status" as const, description: "Doomer energy puts the foe to sleep.", effects: [{ type: "status", chance: 100, status: "sleep" }] },
  { id: "poke_dark_nasty-plot", name: "Evil Plan", type: "SHADOW" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "Hatches an evil plan. Sharply raises Sp.Atk.", effects: [{ type: "stat_boost", stat: "sp_atk", stages: 2, target: "self" }] },
  { id: "poke_dark_memento", name: "Last Words", type: "SHADOW" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Final words before fainting. Drops foe ATK sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "attack", stages: 2, target: "opponent" }] },
  { id: "poke_dark_dark-pulse", name: "Dark Pulse", type: "SHADOW" as CombatType, power: 80, accuracy: 100, pp: 15, category: "special" as const, description: "A pulse of dark energy. May flinch.", effects: [{ type: "flinch", chance: 20 }] },
  { id: "poke_dark_night-slash", name: "Night Slash", type: "SHADOW" as CombatType, power: 70, accuracy: 100, pp: 15, category: "physical" as const, description: "Slashes in the dark. High crit ratio.", effects: [{ type: "high_crit", chance: 25 }] },
  // METAL (10 moves)
  { id: "poke_steel_steel-roller", name: "Steel Roller", type: "METAL" as CombatType, power: 110, accuracy: 100, pp: 5, category: "physical" as const, description: "Rolls over the foe with steel." },
  { id: "poke_steel_bullet-punch", name: "Bullet Punch", type: "METAL" as CombatType, power: 40, accuracy: 100, pp: 30, category: "physical" as const, description: "A bullet-speed metal punch — priority move.", effects: [{ type: "priority" }] },
  { id: "poke_steel_magnet-bomb", name: "Chrome Ball", type: "METAL" as CombatType, power: 60, accuracy: 100, pp: 20, category: "physical" as const, description: "A chrome ball that never misses." },
  { id: "poke_steel_kings-shield", name: "Diamond Guard", type: "METAL" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "Priority shield that drops attacker's ATK.", effects: [{ type: "priority" }] },
  { id: "poke_steel_iron-defense", name: "Titanium Hide", type: "METAL" as CombatType, power: 0, accuracy: 100, pp: 15, category: "status" as const, description: "Develops titanium-hard skin. Sharply raises DEF.", effects: [{ type: "stat_boost", stat: "defense", stages: 2, target: "self" }] },
  { id: "poke_steel_metal-sound", name: "Metal Screech", type: "METAL" as CombatType, power: 0, accuracy: 85, pp: 40, category: "status" as const, description: "A metallic screech that drops foe Sp.Def sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "sp_def", stages: 2, target: "opponent" }] },
  { id: "poke_steel_iron-head", name: "Headbutt", type: "METAL" as CombatType, power: 80, accuracy: 100, pp: 15, category: "physical" as const, description: "A steel headbutt. May flinch.", effects: [{ type: "flinch", chance: 30 }] },
  { id: "poke_steel_flash-cannon", name: "Flash Cannon", type: "METAL" as CombatType, power: 80, accuracy: 100, pp: 10, category: "special" as const, description: "A flash of metal energy. May drop Sp.Def.", effects: [{ type: "stat_drop", chance: 10, stat: "sp_def", stages: 1, target: "opponent" }] },
  { id: "poke_steel_metal-claw", name: "Steel Scratch", type: "METAL" as CombatType, power: 50, accuracy: 95, pp: 35, category: "physical" as const, description: "Scratches with steel claws. May boost ATK.", effects: [{ type: "stat_boost", stat: "attack", stages: 1, target: "self" }] },
  { id: "poke_steel_steel-wing", name: "Steel Wing", type: "METAL" as CombatType, power: 70, accuracy: 90, pp: 25, category: "physical" as const, description: "Strikes with steel wings. May boost DEF.", effects: [{ type: "stat_boost", stat: "defense", stages: 1, target: "self" }] },
  // MYSTIC (9 moves)
  { id: "poke_fairy_magical-torque", name: "Fairy Ring", type: "MYSTIC" as CombatType, power: 100, accuracy: 100, pp: 10, category: "physical" as const, description: "A mystical fairy ring strikes the foe." },
  { id: "poke_fairy_fleur-cannon", name: "Sparkle Bomb", type: "MYSTIC" as CombatType, power: 110, accuracy: 90, pp: 5, category: "special" as const, description: "A sparkling bomb so bright it drains your own power.", effects: [{ type: "stat_drop", stat: "sp_atk", stages: 2, target: "self" }] },
  { id: "poke_fairy_disarming-voice", name: "Soft Uwu", type: "MYSTIC" as CombatType, power: 40, accuracy: 100, pp: 15, category: "special" as const, description: "A soft uwu that never misses." },
  { id: "poke_fairy_draining-kiss", name: "Healing Kiss", type: "MYSTIC" as CombatType, power: 50, accuracy: 100, pp: 10, category: "special" as const, description: "A healing kiss that drains 75% of damage as HP.", effects: [{ type: "drain", percent: 75 }] },
  { id: "poke_fairy_crafty-shield", name: "Magic Shield", type: "MYSTIC" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "A magical shield — priority status-move block.", effects: [{ type: "priority" }] },
  { id: "poke_fairy_sweet-kiss", name: "Confusion Kiss", type: "MYSTIC" as CombatType, power: 0, accuracy: 75, pp: 10, category: "status" as const, description: "A confusing kiss. May confuse.", effects: [{ type: "status", chance: 100, status: "confusion" }] },
  { id: "poke_fairy_moonlight", name: "Moonlight Heal", type: "MYSTIC" as CombatType, power: 0, accuracy: 100, pp: 5, category: "status" as const, description: "Heals under moonlight. Restores 50% HP.", effects: [{ type: "heal", percent: 50 }] },
  { id: "poke_fairy_geomancy", name: "Ancient Ritual", type: "MYSTIC" as CombatType, power: 0, accuracy: 100, pp: 10, category: "status" as const, description: "An ancient ritual. Massively raises Sp.Atk.", effects: [{ type: "stat_boost", stat: "sp_atk", stages: 2, target: "self" }] },
  { id: "poke_fairy_charm", name: "Charm Offensive", type: "MYSTIC" as CombatType, power: 0, accuracy: 100, pp: 20, category: "status" as const, description: "A charming offensive that drops foe ATK sharply.", effects: [{ type: "stat_drop", chance: 100, stat: "attack", stages: 2, target: "opponent" }] },
];

export const MOVES: CombatMove[] = ALL_MOVES;

export const MOVES_BY_TYPE: Record<CombatType, CombatMove[]> = {} as Record<CombatType, CombatMove[]>;
for (const m of ALL_MOVES) {
  if (!MOVES_BY_TYPE[m.type]) MOVES_BY_TYPE[m.type] = [];
  MOVES_BY_TYPE[m.type].push(m);
}

export function getMovePoolForType(type: CombatType): CombatMove[] {
  return MOVES_BY_TYPE[type] ?? [];
}

export function getMoveById(id: string): CombatMove | undefined {
  return ALL_MOVES.find(m => m.id === id);
}

export function validateMoveSelection(moveIds: string[], type: CombatType): { valid: boolean; error?: string } {
  if (moveIds.length !== 4) {
    return { valid: false, error: 'Must select exactly 4 moves' };
  }
  const pool = getMovePoolForType(type);
  const poolIds = new Set(pool.map(m => m.id));
  const invalid = moveIds.filter(id => !poolIds.has(id));
  if (invalid.length > 0) {
    return { valid: false, error: `Invalid moves for type ${type}: ${invalid.join(", ")}` };
  }
  const unique = new Set(moveIds);
  if (unique.size !== 4) {
    return { valid: false, error: 'All 4 moves must be different' };
  }
  const hasDamaging = moveIds.some(id => {
    const m = getMoveById(id);
    return m !== undefined && m.power > 0;
  });
  if (!hasDamaging) {
    return { valid: false, error: 'Must have at least 1 damaging move' };
  }
  return { valid: true };
}
