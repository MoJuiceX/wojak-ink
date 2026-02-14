# SPEC: Phase 9A — Admin Endpoint Authentication

> **For Claude CLI:** Read this entire spec, then read every file in "Files to Read" before making changes. Follow `CLAUDE.md` for all conventions.

---

## Problem

Two admin API endpoints have **zero authentication**. Anyone who discovers the URLs can read internal data:
- `/api/admin/recent-mints` — exposes wallet addresses, mint details, pricing
- `/api/admin/credit-stats` — exposes aggregate credit system metrics

Bots routinely scan for `/api/admin/*` paths. This is a data leak.

---

## Files to Read

1. `functions/api/admin/credit-stats.ts` — **unprotected** (the target)
2. `functions/api/admin/recent-mints.ts` — **unprotected** (the target)
3. `functions/api/mint/audit.ts` — **has auth** (the pattern to copy)
4. `src/pages/Admin.tsx` — frontend that calls both endpoints (needs update)

---

## Exact Changes

### Step 1: `functions/api/admin/credit-stats.ts`

**1a.** Add `ADMIN_SECRET` to the `Env` interface:

```typescript
interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;  // Set via wrangler secret
}
```

**1b.** Add `Authorization` to the CORS `Allow-Headers`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',   // Will be fixed in Phase 9B
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',  // Added Authorization
  'Content-Type': 'application/json',
};
```

**1c.** Add auth check block **after** the method check (line 33) and **before** the DB check (line 35). Insert this block between them:

```typescript
  // Admin authentication (required — blocks access if ADMIN_SECRET not configured)
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }
```

This is the exact same pattern used in `functions/api/mint/audit.ts` lines 82-89.

### Step 2: `functions/api/admin/recent-mints.ts`

Apply the **exact same 3 changes** (1a, 1b, 1c) to this file. The insertion point is also between the method check and the DB check.

### Step 3: `src/pages/Admin.tsx`

The Admin.tsx page calls both endpoints at lines 303-305:

```typescript
fetch('/api/admin/recent-mints?limit=20'),
fetch('/api/admin/credit-stats'),
```

These now need the Authorization header.

**3a.** Add admin secret extraction from URL near the top of the `Admin` component (after `const { contentPadding } = useLayout();`):

```typescript
const [adminSecret] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('secret') || '';
});
```

**3b.** If `adminSecret` is empty, show an access denied message instead of fetching data. Add this early return before the main render:

```typescript
if (!adminSecret) {
  return (
    <PageTransition>
      <div className="min-h-full flex items-center justify-center" style={{ padding: contentPadding }}>
        <div className="card-static p-6 flex flex-col gap-3" style={{ maxWidth: 400, textAlign: 'center' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Admin Access Required
          </h2>
          <p className="text-secondary text-sm">
            Add <code className="text-accent">?secret=your_admin_secret</code> to the URL.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
```

**3c.** Update the fetch calls to include the Authorization header. Change the `fetchAll` callback:

```typescript
const authHeaders = { 'Authorization': `Bearer ${adminSecret}` };

const [pricingRes, mintsRes, creditsRes] = await Promise.all([
  fetch('/api/mint/pricing'),  // pricing is public, no auth needed
  fetch('/api/admin/recent-mints?limit=20', { headers: authHeaders }),
  fetch('/api/admin/credit-stats', { headers: authHeaders }),
]);
```

**3d.** Handle 401 responses. After the fetch calls, if either admin endpoint returns 401, show an error:

```typescript
if (mintsRes.status === 401 || creditsRes.status === 401) {
  setError('Invalid admin secret. Check your ?secret= parameter.');
  setLoading(false);
  return;
}
```

Place this before the existing `if (pricingRes.ok) ...` block.

**Do NOT:**
- Store the admin secret in localStorage
- Hardcode the admin secret anywhere
- Create an env var or config file containing it on the frontend

---

## Verification

```bash
# Both admin files have ADMIN_SECRET in Env
grep -l "ADMIN_SECRET" functions/api/admin/*.ts
# Expected: credit-stats.ts AND recent-mints.ts

# Both admin files check Authorization header
grep -n "authHeader.*Bearer" functions/api/admin/*.ts
# Expected: 2 results (one per file)

# Admin.tsx reads secret from URL
grep -n "secret" src/pages/Admin.tsx
# Expected: matches for URLSearchParams and Authorization

# Build passes
npm run typecheck && npm run build
```

---

## Access Pattern After Fix

Admin dashboard URL becomes: `https://wojak.ink/admin?secret=YOUR_ADMIN_SECRET`

The `ADMIN_SECRET` is set via `wrangler secret put ADMIN_SECRET` on Cloudflare — same secret already used by `audit.ts` and `refund.ts`.
