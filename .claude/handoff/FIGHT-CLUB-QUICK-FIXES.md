# Fight Club Quick Fixes

Run these BEFORE the demo battle spec. They're small, independent fixes.

---

## Fix 1: Wallet Icon Visibility

**File:** `src/pages/FightClub.tsx`

In `ConnectWalletPrompt`, the Wallet icon inside the dark circle is nearly invisible. Add explicit color:

```tsx
<Wallet size={32} style={{ color: 'var(--color-primary)' }} />
```

Verify visually that it renders as orange on the dark rounded background.

---

## Fix 2: Fight Club Loading Skeleton

**File:** `src/pages/FightClub.tsx`

Replace the bare spinner loading state (when `accessLoading` is true) with a skeleton that shows the tab bar shape:

```tsx
if (accessLoading) {
  return (
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* Skeleton tab bar */}
        <div className="fight-club-tabs" style={{ opacity: 0.3, pointerEvents: 'none' }}>
          {['Battle', 'Vote', 'Rankings', 'Burn'].map((label) => (
            <div key={label} className="fight-club-tab">{label}</div>
          ))}
        </div>
        {/* Skeleton content */}
        <div className="flex flex-col gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-static p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
                  <div className="h-3 w-48 rounded" style={{ background: 'var(--color-white-5)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
```

---

## Fix 3: Old Route Redirects

**File:** `src/App.tsx`

Add redirects for old bookmarked URLs. Check if these already exist — if not, add them:

```tsx
import { Navigate } from 'react-router-dom';

// In route definitions, add:
<Route path="/swipe" element={<Navigate to="/fight-club/vote" replace />} />
<Route path="/swipe/*" element={<Navigate to="/fight-club/vote" replace />} />
<Route path="/arena" element={<Navigate to="/fight-club/battle" replace />} />
<Route path="/arena/*" element={<Navigate to="/fight-club/battle" replace />} />
<Route path="/leaderboard" element={<Navigate to="/games" replace />} />
```

Only add redirects that don't already exist. Check App.tsx first.

---

## Rules
- Run `npm run build` after each fix
- Commit and `git push origin main` after each fix
- These are independent fixes — do them in order but each is its own commit
