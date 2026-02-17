# Phase 6: TODO Cleanup — Quick Wins Before Launch

## What This Is

There are 9 TODO/FIXME comments in the codebase. Some are real features that are stubbed out, some are minor polish. You will triage them: fix the quick wins, and convert the rest into proper GitHub issues so they don't get lost.

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read each file listed below to understand the TODO in context

## The TODO List

### Fix These (Quick Wins)

**TODO 1: ChatRoom connection errors not displayed**
- File: `src/components/chat/ChatRoom.tsx` line 336
- Current: `// TODO: Display connection errors to user`
- Fix: Show a subtle error banner or toast when the WebSocket connection fails. Use existing theme classes: `<div className="badge badge-error">Connection lost. Retrying...</div>` or similar. Check how errors are displayed elsewhere in the app for consistency.
- Complexity: Low (5-10 lines)

**TODO 2: Profile edit modal not implemented**
- File: `src/pages/Profile.tsx` line 333
- Current: `// TODO: Open edit profile modal`
- Fix: If the edit button exists but does nothing, either wire it up to a modal or hide/disable the button with a tooltip "Coming soon". Don't leave a dead button.
- Complexity: Low if hiding, Medium if building the modal

**TODO 3: BigPulp attribute drill-down**
- File: `src/pages/BigPulp.tsx` line 252
- Current: `// TODO: Handle attribute drill-down on click`
- Fix: If clicking on an attribute cell does nothing, either add a click handler that shows a detail view or remove the cursor-pointer styling so it doesn't look clickable.
- Complexity: Low (remove misleading affordance) or Medium (add drill-down)

### Convert to GitHub Issues (Not Quick Wins)

**TODO 4: Live XCH price feed**
- File: `src/stores/walletStore.ts` line 91
- Already covered by Phase 3. Remove the TODO comment after Phase 3 is complete.

**TODO 5: Sage Wallet connection stub**
- File: `src/contexts/AuthContext.tsx` line 229
- Current: `// TODO: Implement Sage Wallet connection`
- This is a significant feature. Create a GitHub issue: "Implement Sage Wallet direct connection (WalletConnect alternative)"

**TODO 6: ArcadeFrame Phase 2 edge pieces**
- File: `src/components/ArcadeFrame.tsx` line 128
- Current: `// TODO: Implement Phase 2 edge pieces`
- This is cosmetic. Create a GitHub issue: "Add Phase 2 decorative edge pieces to ArcadeFrame"

**TODO 7: MarketTab cell detail modal**
- File: `src/components/bigpulp/MarketTab.tsx` line 82
- Current: `// TODO: Open cell detail modal`
- Create a GitHub issue: "Add cell detail modal to BigPulp MarketTab"

**TODO 8 & 9: FlappyOrange and ColorReaction game TODOs**
- Files: `src/pages/FlappyOrange.tsx`, `src/pages/ColorReaction.tsx`
- Multiple game-tuning TODOs. Create a single GitHub issue: "Game polish: resolve TODO items in FlappyOrange and ColorReaction"

## What to Do

Use `/brainstorm` to explore the approach for the quick wins, then `/write-plan`, then `/execute-plan`.

### For Quick Wins (TODOs 1-3):

1. Read the file and surrounding context
2. Implement the minimal fix
3. Remove the TODO comment
4. Write a test if the fix involves logic (not just UI)

### For GitHub Issues (TODOs 4-9):

Create the issues using the `gh` CLI:

```bash
gh issue create --title "Title" --body "Description" --label "enhancement"
```

Include:
- What the TODO says
- Where it is (file and line)
- What needs to happen
- Suggested approach (brief)

Then remove the TODO comments from the code and replace with:
```typescript
// See GitHub issue #XX
```

## What NOT to Do

- Do NOT implement the large features (Sage Wallet connection, live price feed, game polish) — just create issues for them
- Do NOT remove TODO comments without either fixing them or creating an issue
- Do NOT change functionality of existing working features while fixing TODOs
- Do NOT add new dependencies
- Do NOT use `!important` in CSS
- Do NOT create TODO comments in new code — either do it or create an issue

## Constraints

- Follow CSS conventions from CLAUDE.md
- Use theme.css classes for any UI fixes
- Keep quick win fixes minimal — don't scope-creep into full features
- Test any logic changes
- Each GitHub issue should be actionable by someone who hasn't seen the codebase
