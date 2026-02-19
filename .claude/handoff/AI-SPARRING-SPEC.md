# AI Sparring — Empty Queue Fallback

---

## Overview

When no real opponent joins the battle queue within 2 minutes, offer the user an AI sparring match. AI battles give reduced Power rewards.

---

## Task 1: Queue Timeout Detection

**File:** `src/pages/FightClub.tsx` or Battle tab component

When user joins the queue:
1. Start a 2-minute timer
2. Show: "Searching for opponent... (2:00)"
3. Countdown visible
4. If matched before timeout → normal battle
5. If timeout → show prompt: "No opponents found. Fight an AI sparring partner?"
   - Button A: "Fight AI" → starts AI battle
   - Button B: "Keep waiting" → resets timer for another 2 minutes

---

## Task 2: AI Battle API

**File:** `functions/api/combat/ai-battle.ts` (NEW)

**POST /api/combat/ai-battle**

Body: `{ fighterNftId: string, ownerDid: string }`

Logic:
1. Verify fighter exists and is owned by this DID
2. Check battle limit (same subscription limits apply — AI battles count toward daily limit)
3. Generate an AI opponent:
   - Pick a random combat type
   - Set level = user's fighter level (fair match)
   - Use the existing AI strategist (`ai-strategist.ts`) for move selection
4. Run the full battle using `battle-runner.ts`
5. Store result in combat_battles with `fighter_b_mode = 'ai_sparring'`
6. Award REDUCED Power:
   - Win: +15 Power (instead of +30)
   - Loss: -5 Power (instead of -10)
   - Draw: +3 Power (instead of +5)
7. Award normal XP (XP is progression, not ranking — no need to reduce)
8. Do NOT affect ELO (AI matches don't count for matchmaking)

Response: full battle result with turn log for replay.

---

## Task 3: AI Battle UI

The battle view for AI sparring should look identical to a normal battle, but with:
- Opponent shown as "AI Sparring Partner" with a bot icon
- Small label: "Sparring match — reduced Power rewards"
- Same HP bars, moves, animations as real battles

Reuse the existing BattleView component. Just pass a flag `isSparring: true`.

---

## Task 4: AI Opponent Generation

**File:** `functions/api/combat/ai-battle.ts` (inside the endpoint)

Generate a fair AI fighter:
```typescript
function generateAiOpponent(playerFighter: CombatFighter) {
  // Pick a random type that's not the same as the player
  const types = ['FIRE', 'WATER', 'ELECTRIC', 'GRASS', ...all 18 types];
  const aiType = types[Math.floor(Math.random() * types.length)];

  // Match player's level for fairness
  const aiLevel = playerFighter.level;

  // Use base stats for the chosen type
  // Pick 4 random moves for that type
  // Nature: random

  return aiOpponent;
}
```

Use existing type base stats from the combat data files.

---

## Constants

| Constant | Value |
|----------|-------|
| QUEUE_TIMEOUT_MS | 120000 (2 minutes) |
| AI_WIN_POWER | 15 (half of normal) |
| AI_LOSS_POWER | -5 (half of normal) |
| AI_DRAW_POWER | 3 (half of normal) |
| AI battles count toward daily limit | YES |
| AI battles affect ELO | NO |

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main`
- Reuse existing battle-runner.ts and ai-strategist.ts — don't rewrite battle logic
- AI opponent is generated server-side, not stored in combat_fighters
