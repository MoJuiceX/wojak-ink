# Combat Polish Phase 5: Wojak Lore Move Renaming

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename all 174 combat moves from the intermediate generic names ("Pummel", "Lucky Strike", "Blazing Charge") to the user-approved Wojak-meme-culture names ("Ratio", "Coin Flip", "Rug Pull Rush"). Update descriptions to match. This is a data-only change — no logic, no UI, no CSS.

**Architecture:** Pure find-and-replace in `src/lib/combat/data/moves.ts`. Each move's `name` field changes, `description` field gets a Wojak-flavored rewrite. Move IDs stay the same (they're internal keys). All tests should still pass since tests reference IDs not display names.

**Tech Stack:** TypeScript, Vitest

**Reference:** User-approved name mapping in `docs/MOVE-RENAME-OPTIONS.csv` (Option A column = final name)

**Test Commands:**
- Unit: `npx vitest run src/lib/combat/`
- TypeScript: `npx tsc --noEmit`

---

## IMPORTANT: Read Before Starting

1. The file `src/lib/combat/data/moves.ts` contains all 174 moves as an array of objects
2. You are ONLY changing the `name` field and `description` field of each move
3. Do NOT change: `id`, `type`, `power`, `accuracy`, `pp`, `category`, `effects`
4. After ALL renames, run tests to verify nothing broke
5. Commit after each type block (18 commits total)
6. READ `docs/MOVE-RENAME-OPTIONS.csv` first — the "Option A" column has the approved final names

---

### Task 1: Rename NEUTRAL moves (9 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each NEUTRAL move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Pummel | Ratio | Delivers a basic beatdown. Nothing fancy, just numbers. |
| Lucky Strike | Coin Flip | Flips a coin and strikes. Pure degen energy. |
| Rapid Jab | First Reply | Gets in first — always. The early reply wins. |
| Lullaby | Cope Song | Sings a soothing cope melody. May put the foe to sleep. |
| Dissonance | Soyjak Screech | Emits a confused shriek that scrambles the opponent's brain. |
| Regenerate | Hopium Dose | Takes a deep hit of hopium. Restores up to half HP. |
| War Posture | Gigachad Stance | Strikes the iconic pose. Sharply raises Attack. |
| Mock | Blank Stare | Stares blankly with zero expression. Lowers the foe's Defense. |
| Reckless Charge | Full Degen | Goes absolutely all-in. Massive damage but hurts yourself too. |

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename NEUTRAL moves to Wojak lore names"
```

---

### Task 2: Rename FIRE moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each FIRE move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Blazing Charge | Rug Pull Rush | Charges in hot and burns everything down. Recoil hurts. |
| Burning Strike | Liquidation Punch | A fiery punch that liquidates on contact. May burn. |
| Hot Coal | FUD Spark | Throws a small spark of fear and doubt. May burn the foe. |
| Ember Ward | Firewall | Wraps in protective flames. Burns attackers on contact. |
| Ghost Burn | Spite Flame | Lights the opponent on fire out of pure spite. |
| Thermal Overload | Meltdown | Goes into full meltdown mode. Devastating but tanks your own power. |
| Flamethrower | Flamethrower | A classic stream of fire. Needs no rename. May burn. |
| Flame Charge | FOMO Rush | Rushes in driven by fear of missing out. Boosts Speed. |
| Lava Plume | Market Crash | Everything burns. The whole market is on fire. High burn chance. |
| Fire Spin | Dumpster Fire | Traps the foe in a swirling dumpster fire. May burn. |

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename FIRE moves to Wojak lore names"
```

---

### Task 3: Rename WATER moves (8 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Tsunami Strike | Whale Splash | A massive whale splash that drenches the foe. Recoil damage. |
| Splash Shot | Tears of Joy | Fires tears of pure joy at the opponent. |
| Bubble Burst | Bubble Pop | Pops a market bubble. Drops the foe's speed. |
| Tide Rush | Buy The Dip | Buys the dip and strikes first — priority move. |
| Drain Bubble | Liquidity Drain | Drains the foe's liquidity and absorbs it as HP. |
| Fortify | HODL | Holds the line. Raises Defense. |
| Rapids Charge | Pump It | Pumps the tide and slams the opponent. May flinch. |
| Claw Crusher | Diamond Hands | Crushes with diamond-hard conviction. High crit ratio. |

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename WATER moves to Wojak lore names"
```

---

### Task 4: Rename ELECTRIC moves (11 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Storm Charge | Short Squeeze | Squeezes with shocking force. May paralyze. |
| Volt Cannon | Lightning Sell | Dumps a lightning bolt of selling pressure. |
| Arc Cannon | Zeus Strike | Calls down Zeus himself. Guaranteed paralyze but low accuracy. |
| Lightning Strike | Static Shock | A shocking physical jolt. May paralyze. |
| Spark | Zap | Quick zap of static. May paralyze. |
| Instant Jolt | Flash Crash | Crashes through defenses — always crits, priority move. |
| Shock Wave | Thunder FUD | Spreads fear, uncertainty, and paralysis. |
| Store Energy | Charge Up | Stores energy for later. Raises Sp.Def. |
| Static Field | Signal Jam | Jams the foe's signals. Drops their Sp.Atk sharply. |
| Thunder Rush | YOLO Charge | Full YOLO electric charge. Massive recoil. |
| Volt Strike | Power Surge | A surge of raw power. May flinch. |

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename ELECTRIC moves to Wojak lore names"
```

---

### Task 5: Rename GRASS moves (9 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Radiant Edge | Solar Cope | Channels solar copium into a devastating blade. |
| Stem Strike | Touch Grass | Basic grass strike. Sometimes you just need to touch grass. |
| Life Leech | Siphon Green | Siphons green energy from the foe. Drains HP. |
| Thorn Guard | Hedge Fund | Priority thorns protect your investment. |
| Spore Shock | Grass Roots | Paralyzes from the roots up. |
| Dream Pollen | Touch Grass Nap | Pollen so calming it puts the foe to sleep. |
| Drain Root | Tax Farm | Taxes the foe's energy. Low power but drains HP. |
| Fiber Shield | Bubble Wrap | Wraps in protective fiber. Massively raises Defense. |
| Fiber Cloud | Slow Meme | A cloud of slow-burning meme energy. Drops foe speed sharply. |
| Branch Breaker | Timber Yeet | Yeets a whole tree at the foe. Recoil damage. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename GRASS moves to Wojak lore names"
```

---

### Task 6: Rename ICE moves (7 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Frost Pike | Brain Freeze | Pierces with pure brain freeze. |
| Frozen Knuckle | Cold Punch | An ice-cold punch. May freeze the foe. |
| Northern Light | Aurora Cope | Coping so hard it creates auroras. Drops foe ATK. |
| Quick Freeze | Ice Cold Take | A take so cold it hits first — priority move. |
| Deep Freeze | Absolute Zero | The coldest take possible. Mega nuke but almost never hits. |
| Frozen Crush | Avalanche Drop | Drops an avalanche. May flinch. |
| Chill Blast | Cold Read | Reads the foe cold. Always crits. |
| Snowstorm | Blizzard | A massive blizzard. May freeze. Low accuracy. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename ICE moves to Wojak lore names"
```

---

### Task 7: Rename MARTIAL moves (8 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Chi Burst | Spirit Bomb | Channels fighting spirit into a devastating burst. May drop Sp.Def. |
| Edge Strike | Karate Chop | A focused chop. High crit ratio. |
| Blitz Punch | Quick Hands | Fast hands strike first — priority move. |
| Anticipate | Read The Room | Reads the room and dodges — priority protect. |
| Vitality Punch | Gym Bro Punch | Punches like a gym bro. Drains HP. |
| Power Stance | Bulk Up | Gets swole. Raises Attack. |
| Spin Kick | Roundhouse Cope | A spinning cope kick. May flinch. |
| Scissor Chop | Cross Counter | A devastating cross counter. High crit ratio. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename MARTIAL moves to Wojak lore names"
```

---

### Task 8: Rename VENOM moves (11 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Toxin Blast | Toxic Dump | Dumps toxic waste. High poison chance. |
| Noxious Burst | Gas Leak | A noxious gas leak. Devastating special attack. |
| Poison Wheel | Toxic Grind | Grinds through with toxic energy. |
| Corrosive | Acid Take | An acidic hot take that melts Sp.Def. |
| Sludge Shot | Sewer Water | Fires literal sewer water. May poison. |
| Toxic Shield | Hazmat Suit | Priority shield that poisons on contact. |
| Venom Dust | Bad Vibes | Spreads bad vibes. Guaranteed poison. |
| Deadly Dose | Lethal Dose | A lethal dose of toxin. Guaranteed heavy poison. |
| Detoxify | Touch Grass Cure | Touches grass to heal. Restores 50% HP. |
| Slime Coat | Thick Skin | Develops thick skin. Sharply raises Defense. |
| Toxin Spray | Cope Spray | Sprays copium mist. Drops foe ATK. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename VENOM moves to Wojak lore names"
```

---

### Task 9: Rename EARTH moves (10 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Earth Cleaver | Tectonic Cope | Cleaves the earth with pure copium force. |
| Desert Fury | Sandstorm Rage | A desert sandstorm of rage. May burn. |
| Ground Slam | Face Plant | Slams the ground face-first. Lowers own DEF. |
| Earth Stomp | Tantrum Stomp | Stomps in a tantrum. Doubles power if prev move missed. |
| Burning Dunes | Hot Sand | The sand is literally on fire. May burn. |
| Dust Recovery | Grounded | Stays grounded and heals. Restores 50% HP. |
| Dust Throw | Pocket Sand | Throws pocket sand. Drops foe accuracy. |
| Earth Splitter | Earthquake | Splits the earth open. Mega nuke, rarely hits. |
| Club Strike | Bonk | Bonks the foe on the head. May flinch. |
| Dig Attack | Drill Down | Drills down deep then strikes. High crit ratio. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename EARTH moves to Wojak lore names"
```

---

### Task 10: Rename AIR moves (8 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Cyclone | Brain Storm | A brainstorm so intense it confuses the foe. |
| Reckless Swoop | Dive Bomb | Dive bombs with reckless abandon. Recoil damage. |
| Wind Puff | Hot Air | Blows hot air at the foe. Basic special attack. |
| Sky Strike | Wing Slap | Slaps with wings. Basic physical air attack. |
| Perch | Grass Landing | Lands on grass to rest. Heals 50% HP. |
| Downdraft | Debunk | Debunks with a powerful downdraft. Drops foe ATK sharply. |
| Sky Razor | Air Cutter | Cuts through the air. May flinch. |
| Air Cannon | Pressure Cannon | Fires a high-pressure blast. High crit ratio. |
| Heaven Charge | Sent To Heaven | Sends the foe heavenward. Lowers their DEF. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename AIR moves to Wojak lore names"
```

---

### Task 11: Rename PSYCHE moves (11 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Mental Crush | Brain Rot | Inflicts pure brain rot. |
| Fate Strike | I Called It | A delayed psychic strike. Called it before it happened. |
| Mind Ray | Brain Beam | Fires a beam of pure brain energy. May confuse. |
| Perplex | Confusion Posting | Posts something so confusing it bewilders the foe. |
| Mirror Mind | Reverse Uno | Reflects attacks back. Priority protect. |
| Mesmerize | Doom Scroll | The foe doom scrolls into sleep. |
| Dream Drain | Nightmare Farm | Farms the foe's nightmares for HP. |
| Concentrate | Focus Mode | Enters focus mode. Raises Attack. |
| Mind Bend | Gaslight | Gaslights the foe. Drops their accuracy. |
| Sixth Sense | Gut Feeling | A gut feeling strike. May flinch. |
| Thought Edge | Mind Blade | A blade of pure thought. High crit ratio. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename PSYCHE moves to Wojak lore names"
```

---

### Task 12: Rename INSECT moves (10 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Exo Lance | Hive Mind Lance | The hive mind strikes as one. |
| Insect Wail | Bug Report | Files a devastating bug report. Drops Sp.Def. |
| Hive Strike | Mob Attack | The mob attacks. High crit ratio. |
| Glitter Breeze | Butterfly Effect | A small flutter creates a big effect. Boosts ATK. |
| Beacon Blast | Signal Boost | Boosts the signal. May confuse. |
| Aggro Dust | Rage Bait | Priority rage bait that draws all attacks. |
| Life Drain | Leech | Leeches HP from the foe. |
| Bioluminescence | Glow Up | The ultimate glow up. Massively raises Sp.Atk. |
| Web Trap | Sticky Thread | A sticky thread that sharply drops foe speed. |
| Exo Slam | Bug Squash | Squashes the foe like a bug. May flinch. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename INSECT moves to Wojak lore names"
```

---

### Task 13: Rename STONE moves (7 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Cosmic Stone | Meteor Strike | Hurls a meteor at the foe. |
| Primal Force | Boomer Power | Channel boomer energy. Boosts ATK. |
| Stone Throw | Throw Rock | Throws a rock. Simple as. |
| Geo Barrier | Stone Wall | Raises a stone wall. Priority protect. |
| Stone Sharpen | Polish Grind | Grinds and polishes. Sharply raises Speed. |
| Crude Coat | Tar Pit | Coats the foe in tar. Drops their speed. |
| Avalanche | Rockslide | Slides rocks down on the foe. May flinch. |
| Mineral Blade | Stone Edge | A sharpened stone blade. High crit ratio. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename STONE moves to Wojak lore names"
```

---

### Task 14: Rename GHOST moves (10 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Phantom Strike | Ghost Post | Posts from beyond the grave. Hits through protect. |
| Spirit Volley | Doomer Barrage | A barrage of doomer energy. |
| Curse Throw | Cursed NFT | Throws a cursed NFT. |
| Phantom Fist | Ghost Punch | A ghostly punch that never misses. |
| Phantom Slash | Spectral Cut | A spectral slash. High crit ratio. |
| Ghost Rush | Spooky Quick | Spooky fast — priority move. |
| Bewilderment | Doomer Spiral | Spirals the foe into doomer confusion. |
| Shadow Ball | Shadow Ball | A classic shadow ball. May drop Sp.Def. |
| Hex | Bad Omen | An omen of bad luck. Extra damage vs status'd foes. |
| Curse | Blood Pact | Sacrifices HP to burn the foe. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename GHOST moves to Wojak lore names"
```

---

### Task 15: Rename DRAGON moves (10 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Rampage | Rage Mode | Goes into rage mode. Multi-turn but causes confusion. |
| Serpent Fume | Dragon Breath | Breathes dragon fumes. May paralyze. |
| Vortex | Whirlwind Cope | A whirlwind of cope. May flinch. |
| Serpent Form | Dragon Dance | The legendary dragon dance. Raises ATK and Speed. |
| Serpent Tackle | Dragon Rush | Rushes with dragon force. May flinch. |
| Reality Rip | Reality Check | A reality check so brutal it always crits. |
| Dragon Claw | Dragon Claw | Classic dragon claw. Reliable physical dragon. |
| Dragon Pulse | Dragon Pulse | Classic dragon pulse. Reliable special dragon. |
| Draco Meteor | Draco Meteor | The ultimate dragon nuke. Drops own Sp.Atk sharply. |
| Dragon Tail | Dragon Tail | Swipes with the tail. May flinch. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename DRAGON moves to Wojak lore names"
```

---

### Task 16: Rename SHADOW moves (12 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Shadow Assault | Shadow Raid | A shadow raid that ignores protect. |
| Burning Rage | Seethe Flame | Burns with pure seethe energy. May flinch. |
| Dirty Trick | Dirty Play | Uses the foe's own ATK against them. |
| Gnash | Dark Bite | A dark bite. May flinch. |
| Swipe | Rug Pull | Pulls the rug. Steal-themed attack. |
| Hijack | Account Hack | Hacks the foe's next move. Priority steal. |
| Deceive | Bait Post | Baits the foe. Confuses them but raises their Sp.Atk. |
| Void Sleep | Doomer Sleep | Doomer energy puts the foe to sleep. |
| Malicious Intent | Evil Plan | Hatches an evil plan. Sharply raises Sp.Atk. |
| Final Curse | Last Words | Final words before fainting. Drops foe ATK sharply. |
| Shadow Wave | Dark Pulse | A pulse of dark energy. May flinch. |
| Shadow Blade | Night Slash | Slashes in the dark. High crit ratio. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename SHADOW moves to Wojak lore names"
```

---

### Task 17: Rename METAL moves (10 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Metal Grinder | Steel Roller | Rolls over the foe with steel. |
| Iron Fist | Bullet Punch | A bullet-speed metal punch — priority move. |
| Metal Sphere | Chrome Ball | A chrome ball that never misses. |
| Royal Guard | Diamond Guard | Priority shield that drops attacker's ATK. |
| Steel Skin | Titanium Hide | Develops titanium-hard skin. Sharply raises DEF. |
| Iron Wail | Metal Screech | A metallic screech that drops foe Sp.Def sharply. |
| Metal Skull | Headbutt | A steel headbutt. May flinch. |
| Flash Cannon | Flash Cannon | A flash of metal energy. May drop Sp.Def. |
| Metal Claw | Steel Scratch | Scratches with steel claws. May boost ATK. |
| Steel Wing | Steel Wing | Strikes with steel wings. May boost DEF. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename METAL moves to Wojak lore names"
```

---

### Task 18: Rename MYSTIC moves (9 moves)

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Mystic Wheel | Fairy Ring | A mystical fairy ring strikes the foe. |
| Bloom Blast | Sparkle Bomb | A sparkling bomb that drops foe Sp.Atk sharply. |
| Soothing Cry | Soft Uwu | A soft uwu that never misses. |
| Life Kiss | Healing Kiss | A healing kiss that drains 75% of damage as HP. |
| Trick Guard | Magic Shield | A magical shield — priority status-move block. |
| Addling Kiss | Confusion Kiss | A confusing kiss. May confuse. |
| Lunar Glow | Moonlight Heal | Heals under moonlight. Restores 50% HP. |
| Earth Magic | Ancient Ritual | An ancient ritual. Massively raises Sp.Atk. |
| Captivate | Charm Offensive | A charming offensive that drops foe ATK sharply. |

**Verify & Commit**

```bash
npx tsc --noEmit
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename MYSTIC moves to Wojak lore names"
```

---

### Task 19: Fix ability descriptions to use Wojak type names

**Files:**
- Modify: `src/lib/combat/data/abilities.ts`

**Step 1: Read the abilities file and find any descriptions using old type names**

Look for: "Psychic" (should be "Psyche"), "Fairy" (should be "Mystic"), "Dark" (should be "Shadow"), "Fighting" (should be "Martial"), "Bug" (should be "Insect"), "Rock" (should be "Stone"), "Ground" (should be "Earth"), "Flying" (should be "Air"), "Poison" (should be "Venom"), "Steel" (should be "Metal")

**Step 2: Replace all Pokemon-style type names with Wojak type names in descriptions**

**Step 3: Verify & Commit**

```bash
npx tsc --noEmit && npx vitest run src/lib/combat/
git add src/lib/combat/data/abilities.ts
git commit -m "feat(combat): fix ability descriptions to use Wojak type names"
```

---

### Task 20: Final Verification

**Step 1:** Run all combat tests

```bash
npx vitest run src/lib/combat/
```

**Step 2:** TypeScript check

```bash
npx tsc --noEmit
```

**Step 3:** Verify no Pokemon names remain in display text

```bash
grep -n "Psychic\|Fairy\|Fighting\|Bug \|Rock \|Ground\|Flying\|Poison\|Steel " src/lib/combat/data/moves.ts src/lib/combat/data/abilities.ts
```

Should return zero results (or only type-system code, not display text).

**Step 4:** Update the CSV

```bash
git add docs/MOVE-RENAME-OPTIONS.csv
git commit -m "docs(combat): mark all Wojak lore renames as completed in CSV"
```
