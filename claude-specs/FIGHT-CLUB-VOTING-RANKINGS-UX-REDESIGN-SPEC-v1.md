# SPEC: Fight Club Voting + Rankings UX Redesign (Voting-Only Phase)

> **Status:** UX/Product implementation spec (v1)
>
> **Audience:** Frontend implementation agent working in `/Users/abit_hex/wojak-ink`
>
> **Purpose:** Redesign the Fight Club `Vote` and `Rankings` experience so it feels premium, understandable, and competitive while **Battle remains demo-only**.

---

## 0. Dependencies and Sequence (Read First)

This UX spec depends on the scoring/ranking cleanup from:

- `/Users/abit_hex/wojak-ink/claude-specs/VOTING-ONLY-FIGHT-CLUB-LEADERBOARD-SPEC-v2.md`

### Required assumption
The app will have a consistent voting-only score model:
- `Wojak Vote Score` (per NFT)
- `Player Score` (per DID, top 10 eligible Wojaks)
- `Provisional` threshold at 5 votes

If backend scoring is not finished yet, implement this UX spec in a way that can gracefully use mock/fallback fields and enable full behavior once the new endpoints are available.

---

## 1. Goals (What this redesign must accomplish)

## 1.1 Product goals

1. Make the voting system understandable in under 10 seconds
2. Make each vote feel meaningful and satisfying
3. Make progression visible (Player Score, rank, next milestone)
4. Make Rankings feel like a destination (not just a table)
5. Keep Battle present as a teaser, but clearly non-scoring

## 1.2 UX goals

- Reduce empty/dead space on desktop Vote page
- Improve information hierarchy
- Connect `Vote` and `Rankings` emotionally and visually
- Increase trust in scoring (clear labels + explanations)
- Support both desktop and mobile cleanly

## 1.3 Engineering goals

- Reuse existing components where practical
- Avoid backend coupling beyond the new voting-only endpoints
- Implement in phases (quick wins first, then full polish)
- Preserve accessibility and reduced-motion support

---

## 2. Non-Goals (for this spec)

- Battle UI redesign (beyond demo messaging polish)
- New battle gameplay mechanics
- Full site visual redesign outside Fight Club
- Reworking mint/generator/gallery screens
- Overhauling design system tokens globally

---

## 3. Current UX Problems (Observed)

### 3.1 Vote page feels minimal / unfinished (desktop)
- Large empty space around the vote card
- “Your Game” panel is too small and vague
- Too little visible progress context (rank, next milestone, eligible count)
- Voting card gives little community context before the vote

### 3.2 Rankings and Vote feel disconnected
- Users vote on one screen but don’t immediately see how it impacts their standing
- Score naming has historically been inconsistent (`Power`, `Power Level`, `Vote/Battle`) causing confusion

### 3.3 Motivation loop is weak
- No session progress indicator
- No next-goal/next-rank feedback
- No “this Wojak is provisional / now eligible” feedback moment

### 3.4 Battle tab competes with active feature
- Battle is in nav but not live, and this can distract from the voting loop if not framed correctly

---

## 4. UX Strategy (Voting-Only Phase)

## 4.1 Core mental model (must be reinforced everywhere)

### Wojaks tab
“These are the individual Your Wojaks the community is voting on.”

### Players tab
“These are DIDs ranked by the combined score of the top Wojaks in that DID.”

### Vote screen
“You’re improving the score and visibility of Wojaks, and that can improve Player Score in the Rankings.”

## 4.2 Primary interaction loop

1. User lands on `Vote`
2. Sees current `Player Score`, rank, and progress to next rank
3. Votes on Wojaks (Fade / Glaze)
4. Gets clear feedback that vote was recorded
5. Understands whether the Wojak is provisional / eligible
6. Can jump to Rankings to see impact and standings

---

## 5. Information Architecture (Fight Club voting-only)

## 5.1 Top-level tabs (keep)
- `Vote` (primary active feature)
- `Battle` (demo preview)
- `Rankings`
- `Burn` (coming soon, if retained)

### Labeling tweaks (optional but recommended)
- `Battle` -> `Battle (Demo)` or a small `Demo` pill in tab

## 5.2 Rankings sub-tabs (keep)
- `Players`
- `Wojaks`

### Add a persistent helper affordance
- small `(i)` or `How Ranking Works` link in rankings header area

---

## 6. Vote Screen Redesign (Desktop + Mobile)

## 6.1 Desktop layout redesign (high priority)

### Current issue
Desktop composition is too sparse and the side panel is underpowered.

### Proposed desktop layout (3-zone)

#### Zone A: Vote card (center, primary)
- Large card remains primary focus
- Card footer upgraded with score/provisional context
- Buttons remain directly below card

#### Zone B: Player progress panel (right, stronger)
Replace current tiny “Your Game” card with a richer progress panel showing:
- `Your Game` title (keep branding)
- `Player Score` (large)
- `Rank #X` (or `Unranked`)
- Tier label (voting-only thresholds)
- `Points to next rank` (if ranked and available)
- `Eligible Wojaks / Total Wojaks`
- CTA: `View Rankings`
- small helper text: `Top 10 eligible Wojaks in your DID`

#### Zone C (optional, desktop only): “Vote Context” strip or panel
Choose one lightweight option:
- `Live voting tips` / `How it works`
- `Session stats` (votes this session, glazes/fades)
- `Recent milestones` / `This Wojak just became eligible!`

**Recommendation for phase 1:** put session stats directly below the card instead of a third panel.

## 6.2 Vote card content redesign

### Current card footer (too minimal)
Currently shows only NFT name/edition.

### New card footer content (required)
For the active Wojak card, show:
- Name / edition (existing)
- `Vote Score` (net)
- `Glazes` and `Fades`
- `Provisional` badge if `< 5 votes`
- `Counts toward Player Score` / `Needs X more votes`
- Owner name (optional, if available)

### Why
This teaches the game while the user is playing and makes each vote feel contextual.

## 6.3 Vote button redesign (interaction quality)

### Keep
- Two-button layout (`Fade` / `Glaze`)
- keyboard shortcuts (`←`, `→`) on desktop

### Improve
- Stronger visual distinction between actions
- Clear hover/press/tap feedback
- Inline status flash after vote (`Fade recorded`, `Glaze recorded`)
- Reduced-motion fallback respected

### Microcopy recommendations
- `Fade` button subtitle (small, optional): `-1 Vote Score`
- `Glaze` button subtitle (small, optional): `+1 Vote Score`

## 6.4 Session feedback (high impact, low complexity)

Add a compact session row under the vote buttons/card:
- `Votes this session: N`
- `Glazes: X`
- `Fades: Y`
- optional `Current streak` (session only, not daily streak)

This increases engagement without backend changes.

## 6.5 Mobile redesign priorities

### Mobile top stats bar (must improve)
Replace current `Power Level` + `votes left` with:
- `Player Score`
- `Rank` (preferred) or `Eligible Wojaks`

### Mobile card footer
Same informational improvements as desktop, but compact:
- `Vote Score`
- `Glaze / Fade counts`
- provisional indicator

### Mobile affordances
- Keep swipe gestures + buttons
- Ensure labels remain visible without crowding
- Tap target sizes remain large

---

## 7. Rankings Screen Redesign (Players + Wojaks)

## 7.1 Overall ranking page UX goals
- Make it feel like a competitive game screen, not a data dump
- Clarify `Wojaks` vs `Players` instantly
- Highlight the current user’s position prominently
- Surface provisional logic clearly

## 7.2 Rankings page header block (new)

Add a compact header/hero inside Rankings content with:
- Title: `Fight Club Rankings`
- Subtitle: `Voting-only season` (or `Battle not live yet`)
- Helper link/button: `How Ranking Works`
- Optional CTA chip: `Go Vote`

This sets context before users see rows/cards.

## 7.3 Players tab redesign

### Top section (podium / featured cards)
Keep the podium concept, but improve clarity:
- Label metric as `Player Score`
- Show `Eligible Wojaks`
- Optional tooltip on score label

### “You” visibility (required)
Even if not in top 3:
- show a persistent `Your Position` card/row near the top
- include:
  - rank / unranked
  - Player Score
  - points to next rank (if available)
  - eligible / total Wojaks

This is more motivating than a small “Your rank: #X” line.

### Player row design (list)
Each row should include:
- rank badge
- avatar/best Wojak image
- display name / DID fallback
- `Player Score` (main metric)
- `Eligible Wojaks` + `Total Wojaks`
- optional `Best Wojak: +X`

## 7.4 Wojaks tab redesign

### Default list mode (recommended primary)
Optimize for fast scanning:
- edition + image
- owner
- `Vote Score` (main metric)
- Glazes/Fades counts
- provisional state

### Grid mode (keep, but clarify)
Grid mode should be visual and celebratory, but must still show:
- `Vote Score`
- provisional indicator if needed

### Provisional handling (must be obvious)
Visually separate provisional Wojaks by one of these patterns:
- section divider: `Provisional (need 5 votes to count)`
- muted card treatment + badge

**Recommendation:** section divider is clearer than just a badge.

## 7.5 Sorting UX (voting-only)

Simplify and clarify sort chips to match the spec:
- `Score`
- `Most Glazed`
- `Ratio`
- `Newest`

Add short tooltips:
- `Score`: `Glazes - Fades`
- `Ratio`: `Glaze ratio (best after enough votes)`

Remove battle-oriented sorts in voting-only mode.

---

## 8. “How Ranking Works” UX (Required)

## 8.1 Placement
Add in Rankings screen header and optionally a smaller link on Vote screen (`How scoring works`).

## 8.2 Format
Use a lightweight modal or popover (modal preferred on mobile).

## 8.3 Content (must match backend rules exactly)

### Recommended copy
- `Glaze = +1`
- `Fade = -1`
- `Wojak Vote Score = Glazes - Fades`
- `Wojaks need 5 votes before they count toward Player Score`
- `Player Score = sum of your top 10 eligible Wojak scores in your DID`
- `Only verified Players (Farmers Plot + DID) appear on the Players leaderboard`
- `Battle is demo-only and does not affect rankings yet`

## 8.4 Trust cue (optional, nice)
Add one line:
- `Scores update automatically as votes come in.`

---

## 9. States and Edge UX (Must Design Explicitly)

## 9.1 Vote screen states

### Loading feed
- skeleton card + button placeholders
- no layout shift if possible

### Feed error
- clear retry CTA (existing pattern is okay)
- preserve visual hierarchy

### Empty feed
- friendly message + CTA to Rankings + CTA to Generator/Mint
- explain why there may be no eligible items yet

### Unregistered / no DID linked
- allow browsing/voting behavior if intended by current product
- but clearly explain that leaderboard Player ranking requires DID + Farmers Plot verification

## 9.2 Rankings states

### Loading
- skeleton rows/cards for Players and Wojaks views

### Empty (Wojaks)
- explain `No Wojak rankings yet`
- CTA: `Go Vote` / `Mint a Wojak`

### Empty (Players)
- explain `No ranked players yet`
- mention requirements (Farmers Plot + DID + eligible Wojaks)

### Error
- retry CTA + helpful text

## 9.3 Provisional state

Must be visually distinct and explanatory in:
- Wojaks leaderboard rows/cards
- Active vote card footer (if current NFT is provisional)
- optional “Your Wojaks” panel later

---

## 10. Motion / Feedback (Meaningful, not noisy)

## 10.1 Vote feedback

### On vote submit (success)
- quick button press response
- card exit animation (existing)
- subtle toast or inline status (`Glaze recorded` / `Fade recorded`)
- optional tiny score icon pulse near footer (only if score is visible and not distracting)

### On provisional threshold crossing (future-friendly)
If response can indicate threshold crossing:
- celebratory micro-toast: `This Wojak is now eligible for Player Rankings`

If backend doesn’t provide this yet, keep as future enhancement.

## 10.2 Rankings reveal
- staggered row fade/slide is okay (existing pattern already present)
- avoid excessive motion on sort changes
- preserve reduced-motion behavior

---

## 11. Visual Direction (Within Existing Site Style)

## 11.1 Keep existing brand language
- Dark arcade / neon orange style
- Existing tab/navigation system
- Existing button styles as base

## 11.2 Upgrade with better hierarchy (not a total redesign)

### Recommendations
- Increase contrast and scale for primary score values
- Use secondary text for explanations and counts
- Add subtle panel headers and helper text
- Use badges consistently (`Provisional`, `Demo`)
- Add section dividers to reduce “flatness”

### Avoid
- Overloading with too many badges/icons
- Hiding important rules in tooltip-only copy
- Making battle visuals dominate the vote/rank loop

---

## 12. Component-Level Implementation Plan (Frontend)

## 12.1 Files likely to modify

### Vote flow
- `/Users/abit_hex/wojak-ink/src/pages/GameVoting.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VotingFeed.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VoteButtons.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/MobileStatsBar.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/SwipeCard.tsx` (or equivalent card component used by `VotingFeed`)

### Rankings
- `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`
- optional new helper modal component (recommended):
  - `/Users/abit_hex/wojak-ink/src/components/combat/RankingRulesModal.tsx`

### Fight Club page shell / battle messaging
- `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`
- battle teaser component if needed (`BattleTeaser` / demo components)

### Styles
Depending on current architecture:
- existing CSS modules/files used by above components
- or shared theme utility classes in `src/styles/*`

## 12.2 Recommended new shared hooks/components (small)

### `useFightClubMyScore` hook (recommended)
A shared query hook used by:
- `VotingStatsPanel`
- `MobileStatsBar`
- optional `Your Position` card in Rankings

This prevents duplicated fetch logic and keeps UI surfaces consistent.

### `RankingRulesModal` component (recommended)
Reusable “How Ranking Works” modal used on Rankings (and optionally Vote page).

### `ProvisionalBadge` component (optional)
Small reusable badge with optional tooltip text.

---

## 13. Implementation Phases (UX agent-friendly)

## Phase 1 — Quick Win Polish (ship fast, high impact)

### Objective
Make the system understandable and consistent with minimal layout churn.

### Tasks
1. Update labels (`Vote Score`, `Player Score`) in Vote + Rankings
2. Improve `VotingStatsPanel` with Player Score, rank, eligible counts, tier
3. Improve `MobileStatsBar` (remove misleading votes-left display)
4. Add provisional badge/text in Wojak rows and vote card footer
5. Add `How Ranking Works` helper/modal
6. Add battle demo messaging clarity

### Acceptance criteria
- Users can understand scoring without reading docs
- Vote and Rankings surfaces use same terminology
- No battle scoring labels visible in rankings

## Phase 2 — Layout and Visual Upgrade (desktop + mobile)

### Objective
Make Fight Club feel premium and competitive.

### Tasks
1. Redesign desktop Vote layout composition (stronger side panel, less empty space)
2. Add session stats strip under vote card/buttons
3. Improve Rankings header block and “Your Position” visibility
4. Improve row/card hierarchy and spacing in Players/Wojaks tabs
5. Refine motion/feedback and microcopy

### Acceptance criteria
- Desktop Vote page no longer feels sparse
- Rankings page looks like a destination feature
- “Your position” is easy to find and motivating

## Phase 3 — Nice-to-Have Enhancements (optional)

- threshold crossing toast (if backend supports signal)
- richer trends/trending UI (only with clear formula)
- small celebratory visuals for rank-up moments

---

## 14. Copy Spec (User-Facing Text)

## 14.1 Vote screen (`Your Game` panel)

### Header
- `Your Game`

### Primary metric label (small text)
- `Player Score`

### Helper line
- `Top 10 eligible Wojaks in your DID`

### Link CTA
- `View Rankings →`

## 14.2 Rankings header block

### Title
- `Fight Club Rankings`

### Subtitle (voting-only phase)
- `Voting-only season. Battle is demo-only for now.`

### Helper action
- `How Ranking Works`

## 14.3 Provisional badge + text

### Badge
- `Provisional`

### Explanatory text
- `Needs {X} more vote(s) to count toward Player Score`

## 14.4 Battle demo messaging

- `Battle is a demo preview`
- `Battles do not affect rankings yet`

---

## 15. Accessibility and Usability Requirements

## 15.1 Accessibility
- Buttons and tabs must remain keyboard accessible
- Modal/tooltip helper must be keyboard accessible and focus-managed
- Color is not the only indicator for provisional state (use text/badge)
- Reduced-motion preference respected for vote and ranking animations

## 15.2 Usability
- Important ranking rules visible without hunting
- Avoid dense jargon in labels
- Mobile text remains legible without truncating essential score labels

---

## 16. QA / Review Checklist for This UX Spec

## 16.1 UX correctness
- [ ] Vote screen uses `Player Score` terminology and aligns with backend scoring model
- [ ] Rankings page uses `Vote Score` and `Player Score` labels consistently
- [ ] Provisional logic is visible and explained
- [ ] Battle demo message is explicit and non-confusing

## 16.2 UI quality
- [ ] Desktop Vote page no longer looks empty/minimalistic
- [ ] Side panel carries meaningful progress information
- [ ] Rankings have strong hierarchy and readability
- [ ] Mobile stats bar is useful and not misleading

## 16.3 Interaction quality
- [ ] Vote feedback feels responsive
- [ ] Errors/loading/empty states are polished
- [ ] Animations are tasteful and not excessive

---

## 17. Deliverables (What the UX implementation agent should hand back)

1. Summary of UX changes (by phase)
2. Changed file list
3. Screenshots / recordings:
   - Vote (desktop)
   - Vote (mobile)
   - Rankings > Players
   - Rankings > Wojaks
   - Battle tab demo messaging
4. Test/QA notes
5. Any deferred items for Phase 2/3

---

## 18. Suggested Next Spec After This (Future)

Once this UX redesign ships and scores are stable, the next spec should be:

- `Fight Club Battle Launch Scoring + UX Integration Spec`

That future spec should define how (and whether) battle score blends into rankings without breaking the clear voting mental model established here.

