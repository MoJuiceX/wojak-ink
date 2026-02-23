# Codex Phase 8 Specs — Post-Launch Performance Optimization

**Generated:** 2026-02-23 12:57 UTC  
**Status:** Ready for execution Week 2 post-launch  
**Effort Estimate:** 8-12 hours total (spread across 3-4 days)  
**Priority:** Execute in order

---

## Context

**Phase 1-7:** ✅ Complete (launched v1.0.0)  
**Phase 6 Results:** Security ✅, A11y ✅, Analytics ✅, Monitoring ✅  
**Phase 7 Results:** Deployment ✅, Launch day ✅, First 24h stable ✅

**Phase 8:** Post-launch performance optimization sprint based on CODEBASE-IMPACT-ANALYSIS.md findings

---

## 1. REMOVE DEBUG CODE FROM PRODUCTION (Pre-Launch, 30min)

**Priority:** 🔴 CRITICAL (must do before merging PR #14)

### Task 1A: Strip Console.log Statements

**Steps:**

1. **Identify all console statements:**
   ```bash
   grep -r "console\." src --include="*.tsx" --include="*.ts" \
     | grep -v "//" \
     | head -20
   ```

2. **Remove them:**
   ```bash
   # Remove console.log/warn/error/info (keep console only in //comments)
   find src -name "*.ts*" -type f -exec sed -i '' \
     '/console\.[a-z]*(/d' {} \;
   ```

3. **Verify:**
   ```bash
   grep -r "console\.[a-z]*(" src --include="*.tsx" --include="*.ts"
   # Should return 0 results (except commented lines)
   ```

4. **Commit:**
   ```bash
   git add -A
   git commit -m "chore: remove console statements from production code"
   ```

### Task 1B: Clean Up Dead Code

**Steps:**

1. **Remove commented lines:**
   ```bash
   find src -name "*.ts*" -type f -exec sed -i '' \
     '/^[[:space:]]*\/\//d; /^[[:space:]]*\/\*/,/^[[:space:]]*\*\//d' {} \;
   ```

2. **Verify bundle impact:**
   ```bash
   npm run build
   npm run bundle:report
   ```

3. **Commit:**
   ```bash
   git add -A
   git commit -m "chore: remove dead code and commented lines"
   ```

### Definition of Done
- ✅ All console.log removed (0 in production code)
- ✅ Dead code cleaned
- ✅ Bundle size verified reduced
- ✅ All tests still pass
- ✅ Ready to merge PR #14

---

## 2. CONSOLIDATE 29 CONTEXTS INTO 7 STRATEGIC CONTEXTS (3-4h)

**Priority:** 🟠 HIGH (biggest performance win)

### Architecture Change

**From (29 contexts):**
```
<AuthContext>
  <AudioContext>
    <GameContext>
      <CurrencyContext>
        <ToastContext>
          <!-- 24 more -->
```

**To (7 contexts):**
```
<AuthContext>
  <GameStateContext>
    <UserProfileContext>
      <UIStateContext>
        <PreferencesContext>
          <SocialContext>
            <MediaContext>
```

### Task 2A: Create New Consolidated Contexts

**File:** `src/contexts/consolidated/`

1. **AuthContext** (unchanged, already consolidated)
   ```typescript
   // src/contexts/AuthContext.tsx
   export const AuthContext = createContext({
     user, isLoggedIn, permissions,
     login, logout, refreshToken
   });
   ```

2. **GameStateContext** (combine 4)
   ```typescript
   // src/contexts/GameStateContext.tsx
   export const GameStateContext = createContext({
     currentGame, gameState, score,    // GameContext
     generatorState, generatorDispatch, // GeneratorContext
     bigPulpState,                      // BigPulpContext
     isMuted, toggleMute                // GameMuteContext
   });
   ```

3. **UserProfileContext** (combine 5)
   ```typescript
   // src/contexts/UserProfileContext.tsx
   export const UserProfileContext = createContext({
     profile, stats, achievements,      // AchievementsContext
     currency, credits, balance,        // CurrencyContext
     dailyChallenges, quests,           // DailyChallengesContext
     treasury, wallet,                  // TreasuryContext
     nfts, mintingState                 // MintContext
   });
   ```

4. **UIStateContext** (combine 4)
   ```typescript
   // src/contexts/UIStateContext.tsx
   export const UIStateContext = createContext({
     layout, layoutDispatch,            // LayoutContext
     notifications, addNotification,    // NotificationContext
     toast, showToast,                  // ToastContext
     videoPlayer, setVideoPlayer        // VideoPlayerContext
   });
   ```

5. **PreferencesContext** (combine 2)
   ```typescript
   // src/contexts/PreferencesContext.tsx
   export const PreferencesContext = createContext({
     settings, updateSetting,           // SettingsContext
     audioSettings, audioDispatch       // AudioContext (game-level audio moved to GameState)
   });
   ```

6. **SocialContext** (combine 3)
   ```typescript
   // src/contexts/SocialContext.tsx
   export const SocialContext = createContext({
     friends, friendRequests,           // FriendsContext
     leaderboard, ranking,              // LeaderboardContext
     guild, guildMembers                // GuildContext
   });
   ```

7. **MediaContext** (combine 3)
   ```typescript
   // src/contexts/MediaContext.tsx
   export const MediaContext = createContext({
     gallery, galleryFilter,            // GalleryContext
     media, mediaFilter,                // MediaContext
     arcadeLights, arcadeAnimation      // ArcadeLightsContext
   });
   ```

### Task 2B: Migrate All Consumers

**Steps:**

1. **Find all useContext calls:**
   ```bash
   grep -r "useContext(" src --include="*.tsx" \
     | grep -E "AudioContext|CurrencyContext|etc" \
     | head -20
   ```

2. **Replace patterns:**
   ```typescript
   // Before
   const { currency } = useContext(CurrencyContext);
   
   // After
   const { currency } = useContext(UserProfileContext);
   ```

3. **Create migration checklist:**
   - [ ] AudioContext → GameStateContext
   - [ ] CurrencyContext → UserProfileContext
   - [ ] GameContext → GameStateContext
   - [ ] AchievementsContext → UserProfileContext
   - [ ] All 29 migrated ✅

4. **Run tests after each group:**
   ```bash
   npm run test:unit
   ```

### Task 2C: Add Memoization to Context Values

**Key:** Prevent re-renders by memoizing context value objects

```typescript
// src/providers/GameStateProvider.tsx
const GameStateProvider = ({ children }) => {
  const [gameState, setGameState] = useState(...);
  const [score, setScore] = useState(...);
  const [isMuted, setIsMuted] = useState(...);
  
  // CRITICAL: Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    gameState, score, isMuted,
    setGameState, setScore, setIsMuted
  }), [gameState, score, isMuted]);
  
  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};
```

### Task 2D: Verify Performance Improvement

**Steps:**

1. **Open React DevTools Profiler:**
   - Before: Play game → see 25+ contexts re-render
   - After: Play game → see 1-2 contexts re-render

2. **Measure metrics:**
   ```bash
   npm run bundle:report
   # Check bundle size (should be same or slightly smaller)
   
   npm run test:unit
   # All tests pass ✅
   ```

3. **Document improvement:**
   ```markdown
   # Context Consolidation Results
   
   **Before:** 29 contexts, 25-30 re-renders per state change
   **After:** 7 contexts, 1-2 re-renders per state change
   **Improvement:** 90% re-render reduction
   **Memory:** 10-15% lower
   **Response time:** 50% faster interactions
   ```

### Definition of Done
- ✅ All 29 contexts consolidated to 7
- ✅ All consumers migrated + tested
- ✅ Memoization applied to all context values
- ✅ React Profiler shows 80%+ re-render reduction
- ✅ All tests passing
- ✅ Performance measurement documented

### Estimated Impact
- **Re-render reduction:** 80-90%
- **App responsiveness:** 50% faster
- **Memory usage:** 10-15% lower
- **User experience:** Noticeably snappier

---

## 3. SPLIT MEGA-COMPONENTS INTO SMALLER PIECES (2-3h)

**Priority:** 🟠 HIGH (code quality + testability)

### Target Components

1. **TraitSelector.tsx** (1,242 lines)
   ```
   Split into:
   ├─ TraitSelector.tsx (200 lines, main orchestrator)
   ├─ TraitGrid.tsx (300 lines)
   ├─ TraitCard.tsx (200 lines) + React.memo
   ├─ TraitFilter.tsx (150 lines)
   ├─ TraitStats.tsx (150 lines)
   └─ TraitPreview.tsx (100 lines, lazy-load)
   ```

2. **DrawerEditor.tsx** (1,113 lines)
   ```
   Split into:
   ├─ DrawerEditor.tsx (200 lines, orchestrator)
   ├─ DrawerCanvas.tsx (350 lines)
   ├─ DrawerToolbar.tsx (200 lines)
   ├─ DrawerLayers.tsx (150 lines)
   └─ DrawerProperties.tsx (200 lines)
   ```

3. **HeatMap.tsx** (1,111 lines) + 7 more

### Task 3A: Refactor Components

**Steps for TraitSelector:**

1. **Create new component structure:**
   ```bash
   mkdir -p src/components/generator/TraitSelector/
   mv src/components/generator/TraitSelector.tsx src/components/generator/TraitSelector/index.tsx
   touch src/components/generator/TraitSelector/{Grid,Card,Filter,Stats,Preview}.tsx
   ```

2. **Extract logic:**
   - Grid rendering → TraitGrid.tsx
   - Individual trait card → TraitCard.tsx (wrap with React.memo)
   - Filter logic → TraitFilter.tsx
   - Stats display → TraitStats.tsx
   - Lazy preview → TraitPreview.tsx

3. **Add React.memo to stable components:**
   ```typescript
   // src/components/generator/TraitSelector/Card.tsx
   const TraitCard = memo(({ trait, onClick, isSelected }) => (
     <div onClick={() => onClick(trait)}>
       {/* card content */}
     </div>
   ), (prev, next) => {
     // Only re-render if trait or selection changed
     return prev.trait === next.trait && 
            prev.isSelected === next.isSelected;
   });
   ```

4. **Lazy-load non-critical components:**
   ```typescript
   const TraitPreview = lazy(() => import('./Preview'));
   
   return (
     <Suspense fallback={<PreviewSkeleton />}>
       <TraitPreview trait={selected} />
     </Suspense>
   );
   ```

### Task 3B: Update Tests

**For each new component:**
```typescript
// src/components/generator/TraitSelector/Card.test.tsx
describe('TraitCard', () => {
  test('renders trait correctly', () => {
    render(<TraitCard trait={mockTrait} onClick={mockFn} />);
    expect(screen.getByText(mockTrait.name)).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    render(<TraitCard trait={mockTrait} onClick={mockFn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalledWith(mockTrait);
  });
});
```

### Definition of Done
- ✅ 10 mega-components split into 40+ smaller components
- ✅ Each <500 lines
- ✅ 80% wrapped in React.memo
- ✅ Lazy-loaded where appropriate
- ✅ Tests added for each
- ✅ All tests passing
- ✅ No behavior changes

### Estimated Impact
- **Bundle size:** No change (same code)
- **Performance:** 20-30% fewer re-renders (React.memo)
- **Testability:** 10x easier to write unit tests
- **Maintainability:** Much clearer code structure

---

## 4. OPTIMIZE IMAGES & ASSETS (1-2h)

**Priority:** 🟡 MEDIUM

### Task 4A: Convert Images

```bash
# Install tools
npm install -D imagemin imagemin-webp imagemin-mozjpeg

# Convert all PNGs to WebP
find src/assets -name "*.png" -exec imagemin {} \
  --out-dir=src/assets \
  --plugin=webp \
  --plugin=mozjpeg \;
```

### Task 4B: Lazy-Load Images

```typescript
// components/image/LazyImage.tsx
const LazyImage = ({ src, alt, fallback }) => {
  const { ref, inView } = useInView();
  
  return (
    <img
      ref={ref}
      src={inView ? src : fallback}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
};
```

### Definition of Done
- ✅ All images converted to WebP + JPEG fallback
- ✅ Lazy-loading applied
- ✅ Responsive srcsets added (1x, 2x, 3x)
- ✅ Bundle size reduced 20-30%

---

## 5. FIX API PATTERNS (N+1 Queries) (2-3h)

**Priority:** 🟡 MEDIUM

### Task 5A: Install React Query

```bash
npm install @tanstack/react-query
```

### Task 5B: Create Query Hooks

```typescript
// hooks/useLeaderboard.ts
export const useLeaderboard = () => 
  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard'),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

// hooks/useUserProfile.ts
export const useUserProfile = (userId) => 
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/user/${userId}`),
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
```

### Task 5C: Replace All fetch() Calls

```typescript
// Before
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/leaderboard')
    .then(r => r.json())
    .then(d => setData(d));
}, []);

// After
const { data } = useLeaderboard();
```

### Definition of Done
- ✅ React Query installed + configured
- ✅ All API calls use query hooks
- ✅ Proper cache invalidation
- ✅ Optimistic updates where needed
- ✅ API calls reduced 60-70%

### Estimated Impact
- **API requests:** 60-70% reduction
- **User latency:** 50-70% improvement
- **Server load:** 40-50% reduction

---

## 6. MOBILE OPTIMIZATION (2-3h)

**Priority:** 🟡 MEDIUM

### Task 6A: Mobile Testing

1. **Test on real devices:**
   - iPhone 12/14 Pro (375px, 390px)
   - Android (360px, 412px)
   - iPad (768px, 1024px)

2. **Checklist:**
   - [ ] No overflow on 320px width
   - [ ] All tap targets 44px minimum
   - [ ] Games fill mobile screen
   - [ ] No layout shifts
   - [ ] CLS < 0.1 on mobile

### Task 6B: Mobile-First CSS

```typescript
// Ensure mobile-first breakpoints
// styles/breakpoints.ts
export const breakpoints = {
  xs: '320px',    // Mobile first
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop
};
```

### Definition of Done
- ✅ All components tested on mobile
- ✅ 44px tap targets
- ✅ Games scale properly
- ✅ No CLS issues on mobile
- ✅ Mobile performance >60 Lighthouse

---

## 7. INCREASE TEST COVERAGE (4-6h)

**Priority:** 🟢 LOW (for Week 2, can defer)

### Task 7A: Identify Critical Paths

```
Top areas to test:
1. Game core logic (Wordle scoring, Merge2048 combine)
2. Auth flow (login, logout, session)
3. Currency/credits (earn, spend, balance)
4. API hooks (useLeaderboard, useCredits)
5. Wallet connection flow
```

### Task 7B: Write Tests

Focus on:
- Unit tests for utils + game logic
- Integration tests for critical user flows
- Component tests for high-traffic components

### Definition of Done
- ✅ Coverage >60% (from 14%)
- ✅ All critical paths tested
- ✅ No regressions

---

## Execution Timeline

**Week 2 Post-Launch (Phase 8):**

**Day 1 (Mon):**
- Task 2: Consolidate contexts (3-4h)
- Task 1: Remove more debug code if needed (30min)

**Day 2 (Tue):**
- Task 3: Split mega-components (2-3h)
- Task 4: Optimize images (1-2h)

**Day 3 (Wed):**
- Task 5: Fix API patterns (2-3h)
- Task 6: Mobile optimization (2-3h)

**Day 4 (Thu):**
- Task 7: Increase test coverage (4-6h)
- Final validation + performance measurement

**Time Budget:** 8-12 hours spread across 4 days

---

## Success Metrics

**Performance Improvement:**
- Re-render reduction: 80-90%
- Bundle size: 10-15% smaller
- API calls: 60-70% fewer
- Mobile performance: 30-50% improvement
- Test coverage: 14% → 60%+

**Code Quality:**
- Mega-components: 10 → 40+
- Avg component size: 500+ lines → <350 lines
- Context complexity: 29 → 7
- Test count: 132 → 300+

**User Impact:**
- App responsiveness: 50% faster
- Mobile conversion: +30-50%
- Mobile DAU: 2-3x increase
- User satisfaction: Higher (faster app)

---

**Phase 8 is the performance sprint. Execute methodically. By end of Week 2, you'll have a significantly faster, more maintainable codebase. 🚀**
