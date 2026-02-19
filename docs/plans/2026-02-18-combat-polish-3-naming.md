# Combat Polish Phase 3: Move & Ability Naming — Wojak Lore

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename all 174 combat moves from generic/lobster-themed names to Wojak-meme-culture names. Update descriptions to match. This is a data-only change — no logic, no UI, no CSS.

**Architecture:** Pure find-and-replace in `src/lib/combat/data/moves.ts`. Each move's `name` field changes, `description` field gets a Wojak-flavored rewrite. Move IDs stay the same (they're internal keys). All tests should still pass since tests reference IDs not display names.

**Tech Stack:** TypeScript, Vitest

**Reference:** User-approved name mapping in `docs/MOVE-RENAME-OPTIONS.csv` (Option A column = final name)

**Test Commands:**
- Unit: `npx vitest run src/lib/combat/`
- TypeScript: `npx tsc --noEmit`
- Single file: `npx vitest run src/lib/combat/data/moves.test.ts`

---

## IMPORTANT: Read Before Starting

1. The file `src/lib/combat/data/moves.ts` contains all 174 moves as an array of objects
2. You are ONLY changing the `name` field and `description` field of each move
3. Do NOT change: `id`, `type`, `power`, `accuracy`, `pp`, `category`, `effects`
4. After ALL renames, run tests to verify nothing broke
5. Commit after each type block (18 commits total)

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
Expected: 0 errors

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
| Flamethrower | Flamethrower | A powerful stream of fire. A classic that needs no rename. |
| Flame Charge | FOMO Rush | Rushes in driven by fear of missing out. Boosts Speed. |
| Lava Plume | Market Crash | Everything burns. The whole market is on fire. High burn chance. |
| Fire Spin | Dumpster Fire | Traps the foe in a spinning dumpster fire. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename FIRE moves to Wojak lore names"
```

---

### Task 3: Rename WATER moves (8 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each WATER move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Tsunami Strike | Whale Splash | A massive whale enters the market. Devastating splash damage with recoil. |
| Splash Shot | Tears of Joy | Shoots a stream of happy tears at the opponent. |
| Bubble Burst | Bubble Pop | Pops the market bubble. May slow the foe down. |
| Tide Rush | Buy The Dip | Rushes in to buy at the bottom. Always moves first. |
| Drain Bubble | Liquidity Drain | Drains the opponent's liquidity to restore your own. |
| Fortify | HODL | Holds the line. Raises Defense by holding on tight. |
| Rapids Charge | Pump It | Pumps the momentum hard. May make the foe flinch. |
| Claw Crusher | Diamond Hands | Grips with unbreakable diamond hands. High critical hit ratio. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename WATER moves to Wojak lore names"
```

---

### Task 4: Rename ELECTRIC moves (11 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each ELECTRIC move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Storm Charge | Short Squeeze | Squeezes the opponent with a shocking charge. May paralyze. |
| Volt Cannon | Lightning Sell | Fires off a massive sell signal. Pure electric devastation. |
| Arc Cannon | Zeus Strike | Calls down divine thunder. Always paralyzes but hard to land. |
| Lightning Strike | Static Shock | A quick electric punch. May cause paralysis. |
| Spark | Zap | A small but effective zap. May paralyze. |
| Instant Jolt | Flash Crash | Strikes faster than anyone can react. Always crits. Priority move. |
| Shock Wave | Thunder FUD | Sends a wave of electric fear. Guaranteed paralysis. |
| Store Energy | Charge Up | Stores electrical energy for later. Boosts Sp. Defense. |
| Static Field | Signal Jam | Jams the opponent's signals. Harshly lowers their Sp. Attack. |
| Thunder Rush | YOLO Charge | Full YOLO electric charge. Massive damage, massive recoil. |
| Volt Strike | Power Surge | Surges with electrical power. May cause flinching. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename ELECTRIC moves to Wojak lore names"
```

---

### Task 5: Rename GRASS moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each GRASS move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Radiant Edge | Solar Cope | Channels the sun's copium into a radiant blade strike. |
| Stem Strike | Touch Grass | Literally touches the opponent with grass. Go outside. |
| Life Leech | Siphon Green | Siphons green energy from the foe. Steals half damage as HP. |
| Thorn Guard | Hedge Fund | Hedges behind thorny defenses. Damages attackers on contact. |
| Spore Shock | Grass Roots | Spreads paralysis through grassroots networks. |
| Dream Pollen | Touch Grass Nap | Sends the foe on a nature walk so peaceful they fall asleep. |
| Drain Root | Tax Farm | Farms a small tax from the opponent's HP. |
| Fiber Shield | Bubble Wrap | Wraps in layers of protective padding. Sharply raises Defense. |
| Fiber Cloud | Slow Meme | Drops a meme so stale it sharply slows the opponent. |
| Branch Breaker | Timber Yeet | Yeets a massive log at the foe. Powerful but hurts yourself. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename GRASS moves to Wojak lore names"
```

---

### Task 6: Rename ICE moves (8 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each ICE move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Frost Pike | Brain Freeze | Strikes with an icy lance that freezes the brain. |
| Frozen Knuckle | Cold Punch | A punch so cold it might freeze the foe solid. |
| Northern Light | Aurora Cope | Shoots a beam of arctic copium. May lower Attack. |
| Quick Freeze | Ice Cold Take | Delivers an ice cold take. Always moves first. |
| Deep Freeze | Absolute Zero | Drops the temperature to absolute zero. Devastating but rarely lands. |
| Frozen Crush | Avalanche Drop | Drops an avalanche on the foe. May cause flinching. |
| Chill Blast | Cold Read | Reads the opponent cold. Always lands a critical hit. |
| Snowstorm | Blizzard | Unleashes a full blizzard. May freeze the opponent. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename ICE moves to Wojak lore names"
```

---

### Task 7: Rename MARTIAL moves (8 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each MARTIAL move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Chi Burst | Spirit Bomb | Gathers inner energy and unleashes a devastating spirit blast. May lower Sp. Def. |
| Edge Strike | Karate Chop | A precise chop with a high critical hit ratio. |
| Blitz Punch | Quick Hands | Strikes with lightning-fast hands. Always moves first. |
| Anticipate | Read The Room | Reads the room perfectly and dodges the incoming attack. |
| Vitality Punch | Gym Bro Punch | Punches with gym-fueled protein energy. Drains HP to heal. |
| Power Stance | Bulk Up | Bulks up to boost Attack and Defense. |
| Spin Kick | Roundhouse Cope | A spinning roundhouse fueled by pure cope. May flinch. |
| Scissor Chop | Cross Counter | Crosses arms and counters with devastating force. High crit. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename MARTIAL moves to Wojak lore names"
```

---

### Task 8: Rename VENOM moves (11 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each VENOM move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Toxin Blast | Toxic Dump | Dumps a load of toxic waste at the foe. May poison. |
| Noxious Burst | Gas Leak | Releases a noxious gas leak. Pure toxic energy. |
| Poison Wheel | Toxic Grind | Grinds the opponent with a spinning toxic wheel. |
| Corrosive | Acid Take | Spits a corrosive acid take that melts defenses. |
| Sludge Shot | Sewer Water | Blasts the foe with raw sewer water. May poison. |
| Toxic Shield | Hazmat Suit | Dons a hazmat suit. Poisons anyone who makes contact. |
| Venom Dust | Bad Vibes | Spreads bad vibes that poison the atmosphere. |
| Deadly Dose | Lethal Dose | Administers a lethal dose of toxin. Guaranteed poison. |
| Detoxify | Touch Grass Cure | Goes outside and touches grass. Cures and heals. |
| Slime Coat | Thick Skin | Develops thick skin. Sharply raises Defense. |
| Toxin Spray | Cope Spray | Sprays the foe with concentrated cope. Lowers Attack. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename VENOM moves to Wojak lore names"
```

---

### Task 9: Rename EARTH moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each EARTH move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Earth Cleaver | Tectonic Cope | Channels tectonic cope to cleave the ground open. |
| Desert Fury | Sandstorm Rage | Unleashes a raging sandstorm. May burn. |
| Ground Slam | Face Plant | Face plants into the ground with full force. Lowers own defenses. |
| Earth Stomp | Tantrum Stomp | Throws a tantrum and stomps the ground. Doubles if previous move failed. |
| Burning Dunes | Hot Sand | Scorches the foe with burning hot sand. May burn. |
| Dust Recovery | Grounded | Gets grounded and reconnects with the earth. Heals 50% HP. |
| Dust Throw | Pocket Sand | Throws pocket sand in the foe's eyes. Lowers accuracy. |
| Earth Splitter | Earthquake | Opens the earth itself. Devastating but wildly inaccurate. |
| Club Strike | Bonk | Bonks the foe on the head. May cause flinching. |
| Dig Attack | Drill Down | Drills down into the earth and strikes from below. High crit. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename EARTH moves to Wojak lore names"
```

---

### Task 10: Rename AIR moves (9 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each AIR move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Cyclone | Brain Storm | Whips up a brainstorm so intense it confuses the foe. |
| Reckless Swoop | Dive Bomb | Dive bombs the opponent recklessly. Powerful but recoil. |
| Wind Puff | Hot Air | Blows hot air at the foe. Just hot air. |
| Sky Strike | Wing Slap | Slaps the foe with a wing. Simple, effective. |
| Perch | Grass Landing | Lands in the grass to rest. Restores HP. |
| Downdraft | Debunk | Debunks the foe's hype. Sharply lowers their Attack. |
| Sky Razor | Air Cutter | Cuts through the air with a razor-sharp blade. May flinch. |
| Air Cannon | Pressure Cannon | Fires a high-pressure air blast. High critical hit ratio. |
| Heaven Charge | Sent To Heaven | Sends the foe straight to heaven. Lowers their Defense. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename AIR moves to Wojak lore names"
```

---

### Task 11: Rename PSYCHE moves (11 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each PSYCHE move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Mental Crush | Brain Rot | Inflicts pure brain rot. Crushes the foe's mental defenses. |
| Fate Strike | I Called It | A delayed psychic attack that hits later. Called it. |
| Mind Ray | Brain Beam | Fires a beam of concentrated brain energy. May confuse. |
| Perplex | Confusion Posting | Posts something so confusing the foe can't think straight. |
| Mirror Mind | Reverse Uno | Pulls a reverse uno card. Reflects status effects back. |
| Mesmerize | Doom Scroll | Forces the foe to doom scroll until they fall asleep. |
| Dream Drain | Nightmare Farm | Farms nightmares from a sleeping foe. Drains HP. |
| Concentrate | Focus Mode | Enters deep focus mode. Raises Attack. |
| Mind Bend | Gaslight | Gaslights the foe into questioning reality. Lowers accuracy. |
| Sixth Sense | Gut Feeling | Acts on a gut feeling. May cause flinching. |
| Thought Edge | Mind Blade | Slashes with a blade of pure thought. High crit ratio. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename PSYCHE moves to Wojak lore names"
```

---

### Task 12: Rename INSECT moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each INSECT move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Exo Lance | Hive Mind Lance | The hive mind directs a coordinated lance charge. |
| Insect Wail | Bug Report | Files a devastating bug report. May lower Sp. Defense. |
| Hive Strike | Mob Attack | Mobilizes the mob for a coordinated attack. High crit. |
| Glitter Breeze | Butterfly Effect | A small flutter that causes unexpectedly large effects. Boosts Attack. |
| Beacon Blast | Signal Boost | Boosts the signal to confusing levels. May confuse. |
| Aggro Dust | Rage Bait | Drops irresistible rage bait. Draws all attacks to user. |
| Life Drain | Leech | Leeches life force from the foe. Drains half damage as HP. |
| Bioluminescence | Glow Up | Major glow up. Massively raises Sp. Attack. |
| Web Trap | Sticky Thread | Catches the foe in a sticky thread. Sharply lowers Speed. |
| Exo Slam | Bug Squash | Squashes the foe with an exoskeleton slam. May flinch. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename INSECT moves to Wojak lore names"
```

---

### Task 13: Rename STONE moves (8 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each STONE move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Cosmic Stone | Meteor Strike | Calls down a meteor from space. Pure cosmic destruction. |
| Primal Force | Boomer Power | Channels ancient boomer energy. May raise stats. |
| Stone Throw | Throw Rock | Throws a rock. Sometimes the simple approach works. |
| Geo Barrier | Stone Wall | Erects a stone wall. Priority protective shield. |
| Stone Sharpen | Polish Grind | Polishes and grinds to a sharp edge. Sharply raises Speed. |
| Crude Coat | Tar Pit | Coats the foe in tar. Lowers Speed and adds fire vulnerability. |
| Avalanche | Rockslide | Sends a rockslide crashing down. May cause flinching. |
| Mineral Blade | Stone Edge | Strikes with a sharpened mineral blade. High critical hit ratio. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename STONE moves to Wojak lore names"
```

---

### Task 14: Rename GHOST moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each GHOST move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Phantom Strike | Ghost Post | Posts from beyond the grave. Hits through any protection. |
| Spirit Volley | Doomer Barrage | Unleashes a barrage of doomer spirits at the foe. |
| Curse Throw | Cursed NFT | Hurls a cursed NFT at the opponent. Nobody wants it. |
| Phantom Fist | Ghost Punch | An unavoidable punch from the spirit realm. Never misses. |
| Phantom Slash | Spectral Cut | Cuts with a spectral blade. High critical hit ratio. |
| Ghost Rush | Spooky Quick | Spooks the foe with ghostly speed. Always moves first. |
| Bewilderment | Doomer Spiral | Sends the foe into a doomer spiral. Guaranteed confusion. |
| Shadow Ball | Shadow Ball | Hurls a shadowy orb. An iconic move. May lower Sp. Defense. |
| Hex | Bad Omen | Channels bad omens. Deals extra damage to statused foes. |
| Curse | Blood Pact | Sacrifices own HP to place a burning curse on the foe. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename GHOST moves to Wojak lore names"
```

---

### Task 15: Rename DRAGON moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each DRAGON move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Rampage | Rage Mode | Enters full rage mode. Multi-turn rampage, confuses self after. |
| Serpent Fume | Dragon Breath | Breathes a strong draconic fume. May paralyze. |
| Vortex | Whirlwind Cope | Whips up a vortex of cope. May cause flinching. |
| Serpent Form | Dragon Dance | Performs the ancient dragon dance. Raises Attack and Speed. |
| Serpent Tackle | Dragon Rush | Rushes the foe with draconic menace. May flinch. |
| Reality Rip | Reality Check | Rips a hole in reality. High critical hit ratio. |
| Dragon Claw | Dragon Claw | Slashes with sharp dragon claws. Reliable and consistent. |
| Dragon Pulse | Dragon Pulse | Fires a draconic shockwave. Reliable special attack. |
| Draco Meteor | Draco Meteor | Calls down devastating meteors. Harshly lowers own Sp. Atk. |
| Dragon Tail | Dragon Tail | Strikes with a heavy dragon tail. May cause flinching. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename DRAGON moves to Wojak lore names"
```

---

### Task 16: Rename SHADOW moves (12 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each SHADOW move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Shadow Assault | Shadow Raid | A dark raid that ignores all protection. Lowers foe's Defense. |
| Burning Rage | Seethe Flame | Seethes so hard it catches fire. May cause flinching. |
| Dirty Trick | Dirty Play | Plays dirty — uses the foe's own Attack power against them. |
| Gnash | Dark Bite | Bites with dark intent. May cause flinching. |
| Swipe | Rug Pull | Pulls the rug right out. Steals from the opponent. |
| Hijack | Account Hack | Hacks the opponent's account. Steals their next move's effect. |
| Deceive | Bait Post | Posts irresistible bait. Confuses the foe but boosts their Sp. Atk. |
| Void Sleep | Doomer Sleep | Drags the foe into a doomer void. May put them to sleep. |
| Malicious Intent | Evil Plan | Hatches an evil plan. Sharply raises Sp. Attack. |
| Final Curse | Last Words | Delivers devastating last words before going down. Sharply lowers foe's Attack. |
| Shadow Wave | Dark Pulse | Releases a wave of dark energy. May cause flinching. |
| Shadow Blade | Night Slash | Slashes from the shadows. High critical hit ratio. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename SHADOW moves to Wojak lore names"
```

---

### Task 17: Rename METAL moves (10 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each METAL move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Metal Grinder | Steel Roller | Rolls over the foe with a massive steel roller. |
| Iron Fist | Bullet Punch | Strikes with a bullet-fast iron fist. Always moves first. |
| Metal Sphere | Chrome Ball | Launches a chrome ball that never misses its target. |
| Royal Guard | Diamond Guard | Guards with diamond-hard resolve. Lowers attacker's Attack on contact. |
| Steel Skin | Titanium Hide | Hardens skin to titanium. Sharply raises Defense. |
| Iron Wail | Metal Screech | Emits a horrific metallic screech. Sharply lowers foe's Sp. Defense. |
| Metal Skull | Headbutt | Headbutts with a metal skull. May cause flinching. |
| Flash Cannon | Flash Cannon | Gathers light and fires a metallic beam. May lower Sp. Defense. |
| Metal Claw | Steel Scratch | Scratches with steel claws. May raise Attack. |
| Steel Wing | Steel Wing | Strikes with hardened steel wings. May raise Defense. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename METAL moves to Wojak lore names"
```

---

### Task 18: Rename MYSTIC moves (9 moves)

**Files:**
- Modify: `src/lib/combat/data/moves.ts`

**Step 1: Find and replace each MYSTIC move name and description**

| Old Name | New Name | New Description |
|----------|----------|-----------------|
| Mystic Wheel | Fairy Ring | Spins an enchanted fairy ring at the foe. |
| Bloom Blast | Sparkle Bomb | Detonates a sparkle bomb. Harshly lowers foe's Sp. Attack. |
| Soothing Cry | Soft Uwu | Lets out a soft uwu that does emotional damage. Never misses. |
| Life Kiss | Healing Kiss | Plants a healing kiss that drains the foe's energy. |
| Trick Guard | Magic Shield | Raises a magic shield that blocks status moves. |
| Addling Kiss | Confusion Kiss | A bewildering kiss that leaves the foe confused. |
| Lunar Glow | Moonlight Heal | Bathes in moonlight to restore HP. |
| Earth Magic | Ancient Ritual | Performs an ancient ritual. Sharply raises Sp. Attack. |
| Captivate | Charm Offensive | Launches a charm offensive. Sharply lowers foe's Attack. |

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/lib/combat/data/moves.ts
git commit -m "feat(combat): rename MYSTIC moves to Wojak lore names"
```

---

### Task 19: Run full test suite to verify no regressions

**Step 1: Run all combat tests**

Run: `npx vitest run src/lib/combat/`
Expected: ALL PASS (197+ tests)

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Check move count is still 174**

The test file `src/lib/combat/data/moves.test.ts` should verify the total move count. If it passes, we're good.

---

### Task 20: Update the move rename CSV to reflect completed renames

**Files:**
- Modify: `docs/MOVE-RENAME-OPTIONS.csv`

Replace the CSV contents with a simple 2-column reference showing the final mapping (Old → New) for documentation purposes. Or delete the options columns and keep just `Type, Old Name, New Name`.

**Step 1: Commit**

```bash
git add docs/MOVE-RENAME-OPTIONS.csv
git commit -m "docs: update move rename CSV to reflect final Wojak lore names"
```

---

## Summary

| Task | Type | Moves Renamed |
|------|------|---------------|
| 1 | NEUTRAL | 9 |
| 2 | FIRE | 10 |
| 3 | WATER | 8 |
| 4 | ELECTRIC | 11 |
| 5 | GRASS | 10 |
| 6 | ICE | 8 |
| 7 | MARTIAL | 8 |
| 8 | VENOM | 11 |
| 9 | EARTH | 10 |
| 10 | AIR | 9 |
| 11 | PSYCHE | 11 |
| 12 | INSECT | 10 |
| 13 | STONE | 8 |
| 14 | GHOST | 10 |
| 15 | DRAGON | 10 |
| 16 | SHADOW | 12 |
| 17 | METAL | 10 |
| 18 | MYSTIC | 9 |
| **Total** | **18 types** | **174 moves** |

**Total tasks:** 20
**Each task:** 2-5 minutes (find-replace name + description)
**Risk:** Zero logic changes — only `name` and `description` string fields
**Tests:** All existing tests reference move IDs, not display names, so all should pass
