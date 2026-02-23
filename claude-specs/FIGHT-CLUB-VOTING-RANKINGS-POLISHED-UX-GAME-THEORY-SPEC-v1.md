# SPEC: Fight Club Voting + Rankings (Polished UX + Simple Game Theory) — v1

> **Status:** Product + UX + gameplay scoring spec (implementation-ready)
>
> **Repo:** `/Users/abit_hex/wojak-ink`
>
> **Primary goal:** Make Fight Club voting feel polished, immersive, and reliable first, while making rankings (Wojaks + Players) simple and easy to understand.

---

## 0. Why This Spec (What went wrong / what we are fixing)

Based on current behavior and screenshots, the system took a step backward in user experience despite backend improvements.

### Current pain points (observed)
1. **Voting appears broken / empty**
- User expects a big Wojak image + Fade/Glaze flow, but instead sees `No Wojaks to vote on yet`
- This kills engagement immediately

2. **Rankings feel confusing**
- `Provisional · X more` badges are not intuitive
- Grid view single-letter `P` badge is especially confusing
- Players tab looks empty (`No ranked players yet`) which makes the game feel dead

3. **Too much “system language,” not enough game feel**
- Users want a clear action loop: `see Wojak -> vote -> next Wojak -> feel impact`
- The interface should be immersive but not cluttered

### Product direction for this phase
- **Voting is the main game**
- **Battle is demo-only / teaser**
- Rankings should support voting, not confuse or overshadow it

---

## 1. Product Principles (must guide all implementation)

## 1.1 Functional first, then polish
Before visual redesign, the `Vote` tab must reliably show a votable Wojak card whenever votable content exists.

## 1.2 Simple rules beat clever math (for now)
Scoring must be understandable by normal users without reading docs.

## 1.3 The UI must teach the system
Users should understand the rules from the Vote and Rankings screens themselves.

## 1.4 Immersive, but not busy
- Big artwork
- strong interactions
- clear progress
- minimal noise

---

## 2. Final Product Decision (Voting-First Phase)

### Active feature
- `Vote` is the main feature and should feel premium and game-like

### Support feature
- `Rankings` supports the vote loop (Wojaks + Players)

### Not active yet
- `Battle` is demo-only and **does not affect rankings**

---

## 3. Game Theory (Simple, Strong, and Explainable)

## 3.1 Public voting rule (keep this simple)

### Vote actions
- `Glaze = +1`
- `Fade = -1`

### Wojak score
- `Wojak Score = Glazes - Fades`

This should be the only formula users need to understand for Wojaks.

## 3.2 Player leaderboard rule (DID-based)

### Player definition (keep current concept)
A `Player` is a DID that:
- has at least one `Wojak Farmers Plot` NFT (verified)
- holds `Your Wojak` NFTs in that DID

### Player score (recommended)
- `Player Score = sum of top 10 ranked Wojak Scores in that DID`

This remains a good model because it:
- rewards quality, not just quantity
- fits your DID-based game identity
- stays easy to explain

## 3.3 Replace “Provisional” with a more intuitive status name

### Problem
`Provisional` is technically correct but feels abstract and bureaucratic.

### Replace with:
- `Rising`

### Rule (same behavior, simpler language)
A Wojak is `Rising` until it reaches a minimum number of votes.

### Recommended threshold (updated for current launch conditions)
**Use `3` votes for now** (bootstrap phase), not `5`.

#### Why change from 5 -> 3 right now
- Your current Players leaderboard is empty because too few Wojaks cross the threshold
- A lower threshold creates earlier momentum and visible progress
- This makes the game feel alive faster while still preventing single-vote noise

### Launch config recommendation
Make this configurable:
- `FIGHT_CLUB_RANKED_MIN_VOTES = 3` (now)
- Raise to `5` later when vote volume is healthy

### User-facing language
- `Rising · 1 more vote to rank`
- `Ranked` (once threshold reached)

## 3.4 Ranking status model (clear and simple)

### Wojaks leaderboard states
- `Ranked` (counts toward Player Score)
- `Rising` (not counted yet)

### Players leaderboard behavior
- Players leaderboard should rank based on `Ranked` Wojaks only
- If a user has no ranked Wojaks yet, they are not ranked yet (but the UI must explain why)

### UX note
Do **not** use single-letter badges like `P`.
They are too cryptic.

---

## 4. Core UX Flow (What the user should experience)

## 4.1 Vote flow (the main loop)

### Desired experience
1. User opens `Vote`
2. Sees a **big Wojak image card** immediately
3. Sees clear `Fade` and `Glaze` buttons
4. Clicks one
5. Card exits with a satisfying animation
6. Next Wojak appears smoothly
7. User can keep voting fast and enjoyably

### Absolute requirement
The `Vote` tab must not feel empty unless there are truly no votable Wojaks available.

## 4.2 Rankings flow

### Wojaks tab
- See top individual Wojaks by community votes
- Understand `Rising` vs `Ranked`

### Players tab
- See top DID players by combined Wojak performance
- Understand why it may be empty early on and what action unlocks ranking

---

## 5. Functional Reliability Spec (Vote must work)

This section is **high priority** and should be treated as a product requirement, not just a bugfix.

## 5.1 Vote feed behavior (required)

### Requirement
If there are mintable/minted votable Wojaks from others, the user should get a card.

### If the vote feed is empty, the UI must show the exact reason
Possible empty reasons:
- `No other minted Wojaks available yet`
- `All currently minted Wojaks belong to you`
- `Temporary feed issue (retry)`

Do not use one generic message for all empty states if the backend can distinguish them.

## 5.2 Vote action reliability (required)

### Button click behavior
When user clicks `Fade` or `Glaze`:
- vote is submitted
- UI immediately begins exit animation (optimistic)
- next card loads in
- if request fails, show clear retry toast and optionally restore card state

### No dead UI
Buttons must not leave the interface stuck in a disabled state after an error.

## 5.3 Fallback behavior (required)

If personalized feed returns empty, fallback behavior should attempt a broader pool (if product rules allow), so users can still vote and the game remains alive.

This should be invisible to the user except for a subtle note if needed.

## 5.4 Post-deploy smoke checks (required)
Before/after deploy, verify:
- `Vote` tab returns cards
- click `Fade` shows next card
- click `Glaze` shows next card
- rankings update after refresh within expected time

---

## 6. Vote Screen UX Redesign (Primary Focus)

## 6.1 Layout goals (desktop)

### Current problem
Too much empty space and weak feedback loop.

### Target layout (desktop)

#### Center column (primary)
- Large Wojak card (hero focus)
- Enhanced card footer/status band
- Fade/Glaze action row
- Session feedback strip (small)

#### Right panel (secondary, compact but meaningful)
- `Your Game`
- `Player Score`
- `Rank` / `Unranked`
- `Rising/Ranked Wojaks count`
- `Top 10 in DID` helper text
- `View Rankings` CTA

### Design principle
The vote card should occupy most of the emotional attention.
The side panel should support progress, not compete visually.

## 6.2 Vote card (required design behavior)

### Content shown on the card/footer
- Wojak image (large)
- `Name / Edition`
- `Wojak Score`
- `Glazes` and `Fades`
- `Rising` or `Ranked` status
- If Rising: `X more vote(s) to rank`
- Owner name (optional, if available)

### Visual hierarchy
1. Artwork
2. Name / Edition
3. Score + status
4. Counts + owner metadata

## 6.3 Fade / Glaze interactions (required)

### Direction mapping (standardize and keep consistent)
- `Fade` -> card exits **left**
- `Glaze` -> card exits **right**

### Button click should trigger same motion as swipe
If user clicks buttons (not swipes), the card should animate in the corresponding direction.

### Next card animation (polished but simple)
- outgoing card: slide + slight rotate + fade
- incoming card: subtle scale-up + fade-in
- duration: fast/snappy (roughly 180–260ms total feel)

### Reduced motion
- disable rotate/parallax
- keep simple fade/slide transition

## 6.4 Session feedback strip (recommended)

Place under vote buttons:
- `Votes this session: N`
- `Glazed: X`
- `Faded: Y`

Optional later:
- `Ranked this session: +1` (if a Rising Wojak crosses threshold)

This adds immersion without making the screen busy.

## 6.5 Vote result feedback (micro UX)

### After each click
Show one subtle confirmation:
- `Glaze recorded`
- `Fade recorded`

Keep it short and fast (toast or inline status), not intrusive.

---

## 7. Rankings UX Redesign (Players + Wojaks)

## 7.1 Rankings page should be easy to read, not overloaded

### Page header block (recommended)
Add a compact header inside rankings content:
- `Fight Club Rankings`
- subtitle: `Vote on Wojaks. Climb with your DID.`
- helper action: `How Ranking Works`

Keep it compact and elegant.

## 7.2 Wojaks leaderboard (individual NFTs)

### Primary metric label
- `Wojak Score`

### Status labels (replace provisional)
- `Rising` (not enough votes yet)
- `Ranked`

### Replace confusing badges
- Remove single-letter `P`
- Do not use cryptic corner badges
- If grid view needs a badge, use a tiny readable tag: `Rising`

### Sort chips (simple and explicit)
Keep:
- `Score`
- `Most Glazed`
- `Ratio`
- `Newest`

### Grid card design (clean)
Each card should show:
- image
- edition
- score (`+4`, `+3`, etc.)
- `Rising` tag if applicable (readable, not just `P`)

Keep owner/details minimal in grid view to avoid clutter.

## 7.3 Players leaderboard (DID leaderboard)

### Empty state (important)
Current “No ranked players yet” is technically correct but emotionally flat.

### Improved empty state copy (recommended)
- Title: `No ranked players yet`
- Subtitle: `Get a Wojak to Ranked status to appear here.`
- small explainer: `Rising Wojaks need 3 votes to count toward Player Score.`
- CTA: `Go Vote`

This makes the empty state instructional, not dead.

### Player row/card content (when populated)
- rank
- display name / DID fallback
- `Player Score`
- `Ranked Wojaks` count
- `Total Wojaks` count (optional)
- best Wojak image (optional)

## 7.4 How Ranking Works (required, but lightweight)

### Must be visible from Rankings screen
Use a dropdown or modal.

### Exact user-facing copy (simple version)
- `Glaze = +1`
- `Fade = -1`
- `Wojak Score = Glazes - Fades`
- `Wojaks start as Rising`
- `A Wojak becomes Ranked after 3 votes` (or current configured threshold)
- `Player Score = sum of your top 10 Ranked Wojak Scores in your DID`
- `Battle is demo-only and does not affect rankings yet`

---

## 8. “Best Game Theory” for This Phase (Practical, not over-engineered)

## 8.1 Keep score math obvious
Do not use hidden multipliers or confidence weights yet.

### Why
- You need player trust and habit formation first
- Complex weighting is harder to explain and debug
- You can always add sophistication later

## 8.2 Use a launch-friendly threshold
Use `3` votes for `Ranked` (bootstrap phase).

### Why this is best right now
- Prevents empty-feeling Players leaderboard
- Gets the game loop moving quickly
- Still filters one-off noise

## 8.3 Use top-10 DID aggregation (keep)
This is a good anti-whale / pro-curation mechanic.

### Why it works
- A player can’t dominate just by owning many weak Wojaks
- Encourages collecting strong Wojaks in DID
- Preserves your DID identity concept

## 8.4 All users can vote (community-first)
As requested:
- all website users can vote
- every vote is captured

### UX consequence
Make it visible that this is a **community score**, not a private club score.

Recommended label on Wojaks tab subtitle:
- `Community voting determines Wojak Scores`

---

## 9. Immersive Experience Guidelines (without clutter)

## 9.1 What makes it feel immersive
- Big art-first card
- smooth directional vote transitions
- immediate response to clicks
- visible progress (score/rank)
- subtle motion and sound (optional)

## 9.2 What makes it feel cluttered (avoid)
- too many badges
- too many numbers on every row
- battle metrics while battle is inactive
- long explanatory blocks always visible
- cryptic one-letter indicators (`P`)

## 9.3 Visual rule of thumb
Every screen should answer one question immediately:
- `Vote`: “What do I vote on next?”
- `Wojaks`: “Which Wojaks are winning?”
- `Players`: “Which DIDs are winning?”

---

## 10. Implementation Plan (Phased, practical)

## Phase 0 — Stabilization Hotfix (functional first)

### Objective
Restore the core vote loop so users always see votable Wojaks when they should.

### Tasks
1. Audit vote feed logic and empty-state reasons
2. Fix any regression causing false empty feed
3. Add clearer empty-state messaging (with specific reasons if possible)
4. Validate Fade/Glaze action returns next card correctly
5. Smoke-test in production/staging

### Acceptance criteria
- Vote page shows a Wojak card when votable items exist
- Fade/Glaze advances to next card reliably
- Empty state is only shown when truly appropriate

## Phase 1 — Simplicity pass (language + status clarity)

### Objective
Make the system easy to understand.

### Tasks
1. Rename `Provisional` -> `Rising` in UI
2. Remove `P` single-letter badge from grid
3. Add readable `Rising` status treatment
4. Improve Players empty-state copy with guidance
5. Update `How Ranking Works` copy to match simplified language
6. Lower threshold config to `3` (if approved and backend configurable)

### Acceptance criteria
- No confusing `P` badges remain
- Status language is intuitive (`Rising` / `Ranked`)
- Players empty state feels instructional and alive

## Phase 2 — Vote experience polish (hero interaction)

### Objective
Make voting feel premium and addictive.

### Tasks
1. Polish vote card layout/footer information hierarchy
2. Implement directional button-triggered animations:
   - Fade = exit left
   - Glaze = exit right
3. Add session feedback strip
4. Improve vote result confirmation microcopy/feedback
5. Tune timing/easing for snappy feel
6. Preserve reduced-motion support

### Acceptance criteria
- Voting feels smooth and responsive
- Button clicks visually move cards in correct direction
- Next card appears with clean effect, no jank

## Phase 3 — Rankings polish (clean + competitive)

### Objective
Make Rankings feel premium and easy to scan.

### Tasks
1. Add rankings header block
2. Polish Wojaks list and grid card readability
3. Improve Players row/card layout
4. Add clear “Go Vote” CTA from empty Players state
5. Ensure page looks good on desktop and mobile without feeling busy

### Acceptance criteria
- Rankings are easy to understand at a glance
- Visual hierarchy is strong
- Empty states are motivating, not dead

---

## 11. Files to Read / Likely Modify

### Vote flow
- `/Users/abit_hex/wojak-ink/src/pages/GameVoting.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VotingFeed.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/VoteButtons.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/SwipeCard.tsx` (or active vote card component)
- `/Users/abit_hex/wojak-ink/src/components/game/VotingStatsPanel.tsx`
- `/Users/abit_hex/wojak-ink/src/components/game/MobileStatsBar.tsx`

### Rankings
- `/Users/abit_hex/wojak-ink/src/components/combat/FightClubRankings.tsx`
- `/Users/abit_hex/wojak-ink/src/components/combat/FightClubGuideModal.tsx` or equivalent helper component
- optional new component: `RankingRulesModal.tsx`

### Shell / copy
- `/Users/abit_hex/wojak-ink/src/pages/FightClub.tsx`

### Backend (if threshold/status wording is adjusted)
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/vote-leaderboard.ts`
- `/Users/abit_hex/wojak-ink/functions/api/fight-club/my-score.ts`
- config/constants file if you externalize ranked threshold

---

## 12. QA / Review Checklist (for this spec)

## Functional (must pass first)
- [ ] Vote page shows a card when votable Wojaks exist
- [ ] Fade button submits and advances to next card
- [ ] Glaze button submits and advances to next card
- [ ] Card exits left/right correctly based on action
- [ ] Empty state only appears when truly no votable Wojaks

## Clarity (must pass)
- [ ] No `P` badge remains in grid/list UI
- [ ] `Rising` / `Ranked` language is used consistently
- [ ] “How Ranking Works” is easy to find and read
- [ ] Players empty state explains how to get ranked

## UX quality (must pass)
- [ ] Vote screen feels focused and not sparse
- [ ] Rankings are readable and not too busy
- [ ] Motion is smooth and not distracting
- [ ] Mobile layout remains clear and tappable

---

## 13. Final Recommendation (for implementation order)

If the other agent is already working on UX, tell them to do this in order:

1. **Fix vote functionality first (empty vote issue)**
2. **Simplify ranking status language (`Provisional` -> `Rising`, remove `P`)**
3. **Polish vote interaction animations (Fade left / Glaze right)**
4. **Polish rankings visuals and empty states**

Do not spend time on deep visual polish until the vote loop is reliable again.

---

## 14. Future (not now)

Once voting feels polished and alive, the next step is:
- introduce battle scoring carefully as a separate visible metric
- avoid mixing it into the same score label until users clearly understand both systems

