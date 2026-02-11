# Documentation Process — How to Document a System Fully

This doc describes a **repeatable process** for producing full, maintainer-ready documentation (like the Credit Leaderboard system). Use it when you want “everything documented so someone else can fully understand and continue working on it.”

---

## 1. What “full documentation” should cover

For any feature or system, aim for:

| Section | Purpose |
|--------|--------|
| **Purpose & context** | Why it exists, how it fits the product, what problem it solves. |
| **User/product flow** | What the user sees and does; what happens end-to-end. |
| **Architecture overview** | Diagram or narrative: external sources → workers/services → storage → APIs → frontend. |
| **Data model** | Tables, key columns, units, identity (e.g. event_id). |
| **How we derive information** | Where data comes from (APIs, workers), how it’s computed (formulas, fallbacks). |
| **Workers / jobs** | What runs when, what it does, bindings, secrets, failure behavior. |
| **APIs** | Endpoints, methods, query params, response shape, who calls them. |
| **Frontend usage** | Which components/pages use which APIs and how. |
| **Scripts and ops** | Backfill, audit, reconcile; how to run them and when. |
| **File and doc index** | Where every relevant file and doc lives. |
| **Glossary** | Terms that have a specific meaning in this system. |
| **Runbooks** | Common ops tasks (e.g. “missing events”, “change formula”, “alerting not firing”). |
| **Related docs** | Links to deeper dives (formula, bulletproof, audit, go-live). |

---

## 2. Recommended process (including “spin up agents”)

### Step 1: Define the scope and audience

- **Scope:** One system or feature (e.g. “Credit Leaderboard”, “Generator mint flow”, “Games leaderboard”).
- **Audience:** “A new developer or future maintainer who has not built this.” Write so they can:
  - Understand why it exists and how it works.
  - Find the right files and docs quickly.
  - Perform common ops and fix common failures.

Add to your prompt:

- “Audience: new developer / future maintainer. They should be able to understand the system and continue working on it without prior context.”
- “Include exact file paths and, where helpful, code references (e.g. function names, key constants).”

### Step 2: Define exploration angles (per “agent” or pass)

Split the work into **focused exploration passes**. Each pass has a single question and produces one section (or a bullet list of findings):

| Pass | Question | Output |
|------|----------|--------|
| **Purpose & product** | Why does this exist? What does the user see and do? | Purpose, product flow. |
| **Data & storage** | What is stored, where, in what units? What is the unique key? | Data model, units, glossary. |
| **Data derivation** | Where do we get raw data? How do we compute derived values? | “How we derive information”, formula/source of truth. |
| **Workers / cron** | What runs on a schedule? What does it read/write? What are bindings and secrets? | Workers section. |
| **APIs** | What endpoints exist? Who calls them? Request/response shape? | APIs table, frontend usage. |
| **Scripts & ops** | What scripts exist for backfill, audit, reconcile? How do runbooks work? | Scripts, reconciliation, runbooks. |
| **File map** | Where is every relevant file and doc? | File and doc index. |

You can literally “spin up” separate prompts or agents: one per pass, e.g. “Explore the codebase and answer only: [question]. Output a structured section for the doc.”

### Step 3: Merge into one master doc

- Create a **single master doc** (e.g. `CREDIT-LEADERBOARD-SYSTEM.md`) that is the **entry point** for that system.
- Each section should be **self-contained** but **link to deeper docs** where they already exist (formula, bulletproof, audit, go-live).
- Add a short **architecture diagram** (ASCII or Mermaid) so the flow is visible at a glance.
- End with **runbooks** and **related docs** so maintainers know what to do and where to read next.

### Step 4: Keep the master doc as the single entry point

- When you add features or change behavior, update the master doc and the relevant deep-dive doc.
- New team members or AI agents should be pointed to the master doc first (“Read docs/CREDIT-LEADERBOARD-SYSTEM.md for the credit leaderboard”).

---

## 3. What to add to your prompt (checklist)

When you ask for “full, proper documentation” of a system, make the prompt explicit:

1. **Audience:** “So that another developer (or future maintainer) can fully understand the system and continue working on it.”
2. **Scope:** Name the system (e.g. “the Free Mint Credits Leaderboard for the Wojak Generator”).
3. **Sections:** “Include: purpose and context, product flow, architecture overview (with a diagram), data model and units, how we derive all information (sources and formulas), workers and what they do, all APIs, frontend usage, scripts and reconciliation, file and doc index, glossary, runbooks for common ops, and links to existing deep-dive docs.”
4. **Conventions:** “Use exact file paths. Reference key constants and function names where it helps. Link to existing docs (e.g. CREDITS-FORMULA.md, CREDIT-LEADERBOARD-BULLETPROOF.md) instead of duplicating them.”
5. **Exploration:** “Use multiple focused passes if needed: one for data flow, one for workers, one for APIs and frontend, one for scripts and ops — then merge into one master document.”
6. **Runbooks:** “Document at least: how to fix missing events, how to add a new cutoff date, how to change the formula (or equivalent), and how to fix alerting.”

---

## 4. Credit Leaderboard — what was done

- **Master doc:** [CREDIT-LEADERBOARD-SYSTEM.md](./CREDIT-LEADERBOARD-SYSTEM.md) — single entry point for the whole system.
- **Existing deep dives** linked from it: CREDITS-FORMULA.md, CREDIT-LEADERBOARD-BULLETPROOF.md, CREDITS-AUDIT-GUIDE.md, CREDIT-LEADERBOARD-GO-LIVE-PLAN.md, CREDIT-LEADERBOARD-VERIFIER-PLAN.md, PHASE2-COLLECTION-BRANDING.md.
- **This process doc:** Use it for the next system you want to document the same way (e.g. games leaderboard, economy, generator layers).

---

## 5. Applying this to another system

1. Create a new master doc: `docs/<SYSTEM>-SYSTEM.md`.
2. Run the exploration passes (yourself or via separate prompts) for that system.
3. Fill in each section; add a diagram, file index, glossary, runbooks.
4. Link to any existing specs or guides.
5. In the main project doc or README, add a line: “For [system X], see docs/<SYSTEM>-SYSTEM.md.”

This keeps documentation consistent and makes it easy for humans and agents to find the “one place” that explains a system end-to-end.
