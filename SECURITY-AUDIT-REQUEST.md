# Co-Audit: Mint Pipeline — End-to-End Flow Tracing

## Context

You are working alongside another Claude agent (the "primary engineer") who built and audited this minting pipeline. The primary engineer has already completed:

- Full security audit across multiple sessions
- Fixed wallet bypass, credit race conditions, upload auth, rate limiting, input validation
- Deployed all fixes to production
- Code builds clean with zero TypeScript errors

**Your job is NOT to repeat the security audit.** The primary engineer needs you to do things it's harder to do from the inside — trace flows as if you're a user, find logic gaps that emerge from how multiple files interact, and verify the system handles edge cases at the boundaries between components.

## Ground Rules

1. **Read every file you reference.** Paste the actual code you're discussing. No guessing line numbers or file contents.
2. **Do not generate patch files or fix instructions.** Report findings only. The primary engineer will decide what to fix.
3. **Do not re-report these already-fixed issues:**
   - Upload endpoint auth (INTERNAL_MINT_SECRET) — done
   - Wallet validation (bech32m regex) — done
   - confirm.ts wallet bypass — done (walletAddress required)
   - Credit race condition — done (atomic INSERT...SELECT)
   - Null offer file handling — done (returns 500)
   - Rate limiting on mint endpoints — done
   - API key/JWT client exposure — not an issue (server-only)
   - Pinata body format — done ({pinataContent} wrapper)
   - mint-admin.html XSS — deleted the file

---

## Task 1: Trace the Free Mint Flow

Read these files in order, then trace what happens step by step when a user with 100 credits clicks "Free Mint":

1. `src/components/generator/ActionBar.tsx` — What happens on click?
2. `src/contexts/MintContext.tsx` — What does `startMint` do?
3. `functions/api/mint/prepare.ts` — Walk through the free mint path line by line
4. `functions/api/mint/upload.ts` — What does the IPFS upload do?
5. `functions/api/mint/request.ts` — How does the MintGarden API call work?
6. `functions/migrations/030_credit_system.sql` — What tables are involved?

**Questions to answer:**
- If the MintGarden API succeeds but the DB insert fails, what happens? Are credits deducted? Is the mint number consumed?
- If the IPFS upload succeeds but MintGarden fails, is there an orphaned IPFS pin?
- After a successful free mint, does the credit balance correctly reflect the deduction on the next request?
- Can a user start a free mint, then before it completes, start another? What prevents this?

## Task 2: Trace the Paid Mint Flow

Same files, but follow the paid path:

1. `functions/api/mint/prepare.ts` — Walk through the paid mint path
2. `functions/api/mint/request.ts` — How does the offer creation differ from free?
3. `src/contexts/MintContext.tsx` — What happens after the user gets the offer file?
4. `src/components/generator/MintFlowModal.tsx` — How does the countdown/expiry work?
5. `functions/api/mint/confirm.ts` — What happens when the user confirms?

**Questions to answer:**
- What happens if the user closes the browser after `prepare` but before `confirm`? Is the mint stuck as 'pending' forever?
- What happens if `confirm` is called after the 15-minute expiry window?
- The offer file is sent to the client — can a malicious client modify it before passing it to their wallet?
- If `confirm` succeeds but the trait_usage update fails partway through the loop, what's the state?
- Can a user call `confirm` twice for the same mintId? What prevents double-confirmation?

## Task 3: Trace the Resume Flow

When a user reloads the page with a pending paid mint:

1. `functions/api/mint/status.ts` — How does it find pending mints?
2. `src/contexts/MintContext.tsx` — How does `checkPendingMint` work?
3. `src/components/generator/MintFlowModal.tsx` — Does the countdown resume correctly?

**Questions to answer:**
- If the pending mint has expired (>15 min old), does status.ts still return it? Does the frontend handle an already-expired pending mint?
- If there are multiple pending mints for the same wallet (shouldn't happen, but...), what does status.ts return?

## Task 4: State Machine Verification

Map every possible state a mint record (`phase2_mints`) can be in and every transition:

```
States: pending, minted, expired, failed
```

For each state transition, identify:
- What triggers it?
- What file/line does it?
- Can it happen more than once? (Is the transition idempotent?)
- Are there any states that can't be reached? Any states you can't leave?

## Task 5: Database Consistency Check

Read ALL three migration files:
- `functions/migrations/030_credit_system.sql`
- `functions/migrations/031_mint_counter.sql`
- `functions/migrations/032_mint_audit_trail.sql`

**Questions to answer:**
- Is `mint_number` guaranteed unique? What constraint enforces it?
- Can `credit_spends.mint_id` reference a mint that was later marked 'failed'? Is that a problem?
- Is there a foreign key between `credit_spends.mint_id` and `phase2_mints.id`? Should there be?
- What happens to `trait_usage` if the same trait is minted by two concurrent requests?
- The `mint_counter` table — what happens if row id=1 doesn't exist? Does `getNextMintNumber` handle this?

## Output Format

Organize your report by task number. For each finding:

```
## Task N

### [SEVERITY] — [Title]

**File(s):** [exact paths]
**Code:**
[paste relevant snippets]

**Issue:** [what you found]
**Impact:** [what could go wrong]
**Question for primary engineer:** [if you need clarification]
```

If a task has no findings, say "No issues found — flow verified." That's valuable confirmation.

## Files List (read all of these)

```
functions/api/mint/_shared.ts
functions/api/mint/mintNumberHelper.ts
functions/api/mint/auditHelper.ts
functions/api/mint/prepare.ts
functions/api/mint/confirm.ts
functions/api/mint/upload.ts
functions/api/mint/request.ts
functions/api/mint/status.ts
functions/api/mint/pricing.ts
functions/lib/rateLimit.ts
functions/migrations/030_credit_system.sql
functions/migrations/031_mint_counter.sql
functions/migrations/032_mint_audit_trail.sql
src/contexts/MintContext.tsx
src/components/generator/MintFlowModal.tsx
src/components/generator/ActionBar.tsx
```
