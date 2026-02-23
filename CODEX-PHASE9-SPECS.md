# Codex Phase 9 Specs — Feature Roadmap & Scale Phase (Week 3+)

**Generated:** 2026-02-23 13:11 UTC  
**Status:** Ready for execution Week 3+ post-launch  
**Effort Estimate:** 20-30 hours (Week 3-4, parallel execution)  
**Priority:** Execute in order, some in parallel

---

## Context

**Phase 1-7:** ✅ Launch complete (v1.0.0 shipped)  
**Phase 8:** ✅ Performance sprint (Week 2, contexts consolidated, assets optimized)  
**Phase 9:** Feature expansion & scaling infrastructure

---

## 1. FEATURE: MULTIPLAYER BATTLES (High Priority)

**Impact:** Very High (engagement, retention, revenue)  
**Effort:** 8-12 hours  
**ROI:** Massive (enables competitive gameplay + tournaments)

### Overview
Enable real-time 1v1 battle system where users can challenge each other, not just AI.

### Architecture

**Backend Changes:**
- WebSocket server (socket.io or similar)
- Battle queue + matchmaking
- Real-time state sync (both players' moves visible)
- Result persistence (wins/losses, ELO rating)

**Frontend Changes:**
- Battle lobby (waiting for opponent)
- Real-time battle UI (both players' sides)
- Post-battle results (ELO gain/loss)
- Match history + replays

### Tasks

**Task 1A: WebSocket Battle Server** (4-5h)
- Set up socket.io on Cloudflare Workers
- Battle queue logic
- Real-time move sync
- Result calculation + persistence
- Error handling (disconnect, timeout)

**Task 1B: Multiplayer UI** (3-4h)
- Battle lobby component
- Real-time opponent display
- Move synchronization visual feedback
- ELO rating display
- Post-battle summary

**Task 1C: Testing** (1-2h)
- Integration tests (two players connecting)
- Latency simulation (what if opponent disconnects?)
- Concurrent battle handling

### Success Metrics
- ✅ 2+ players can battle simultaneously
- ✅ Moves sync in real-time (<500ms latency)
- ✅ Results persistent + ELO tracked
- ✅ 99%+ uptime for battle servers

---

## 2. FEATURE: TOURNAMENTS & LEAGUES (High Priority)

**Impact:** Very High (engagement, monetization)  
**Effort:** 6-8 hours  
**ROI:** High (enables competitive season play)

### Overview
Structured tournaments (single-elimination) and seasonal leagues (ranked ladder).

### Tasks

**Task 2A: Tournament System** (3-4h)
- Tournament creation (admin)
- Bracket generation (single-elimination)
- Auto-advance on wins
- Finals handling (best-of-3)
- Prize distribution (credits, NFTs, badges)

**Task 2B: Seasonal Leagues** (2-3h)
- Ranked ladder (ELO-based)
- Division assignment (Bronze → Diamond)
- Season resets (monthly)
- Leaderboard tiers

**Task 2C: UI Components** (1-2h)
- Tournament bracket display
- Seasonal rank display
- Prize claim interface

### Success Metrics
- ✅ 50+ concurrent tournament players
- ✅ Bracket updates in real-time
- ✅ Season resets automated
- ✅ Prizes awarded automatically

---

## 3. FEATURE: SOCIAL FEATURES (Medium Priority)

**Impact:** High (retention, community)  
**Effort:** 6-8 hours  
**ROI:** High (network effects)

### Tasks

**Task 3A: Friends & Profiles** (2-3h)
- Add/remove friends
- Friend list + status (online/in-game)
- Public profiles + profile customization
- Stats page (wins, level, achievements)

**Task 3B: Guilds/Teams** (2-3h)
- Guild creation (5+ players)
- Guild wars (team battles)
- Guild leaderboard
- Guild chat

**Task 3C: Activity Feed** (1-2h)
- Friends' recent activity (wins, achievements)
- Global announcements
- Social sharing (Twitter, Discord)

### Success Metrics
- ✅ 50% of users have friends added
- ✅ 10% of users in guilds
- ✅ Guild wars happening daily

---

## 4. FEATURE: NFT INTEGRATION (Medium Priority)

**Impact:** Medium-High (monetization, differentiation)  
**Effort:** 8-10 hours  
**ROI:** High (DeFi + web3 adoption)

### Tasks

**Task 4A: Mint NFT Lobsters** (3-4h)
- User can mint their lobster as NFT
- Transfer to Chia blockchain
- Store metadata (stats, traits)
- Verify ownership

**Task 4B: NFT Trading** (3-4h)
- Marketplace (list/buy/sell NFTs)
- Price discovery (floor price)
- Gas fee handling
- Wallet integration

**Task 4C: Rewards & Airdrops** (1-2h)
- Airdrop NFTs to top 100 players
- Claim interface
- Metadata display

### Success Metrics
- ✅ 5% of users minting NFTs
- ✅ 100+ NFTs traded
- ✅ Average floor price increasing

---

## 5. INFRASTRUCTURE: SCALING & OPTIMIZATION (High Priority)

**Impact:** Critical (stability at scale)  
**Effort:** 6-8 hours  
**ROI:** Essential (prevents outages)

### Tasks

**Task 5A: Database Scaling** (2-3h)
- Add read replicas (for scaling reads)
- Query optimization (indexed slow queries)
- Connection pooling
- Caching layer (Redis)

**Task 5B: CDN & Caching** (2-3h)
- Cloudflare cache rules (aggressive for static assets)
- Image CDN (Cloudinary or similar)
- Cache invalidation strategy
- Gzip compression (already done)

**Task 5C: Load Testing at Scale** (1-2h)
- 500+ concurrent users
- 1000+ users/sec login spike
- Battle server stress test
- Database load test

### Success Metrics
- ✅ 500+ concurrent users without errors
- ✅ API p95 latency <200ms at scale
- ✅ Zero downtime events
- ✅ Database CPU <70%

---

## 6. ANALYTICS & INSIGHTS (Medium Priority)

**Impact:** High (data-driven decisions)  
**Effort:** 3-4 hours  
**ROI:** High (informs future features)

### Tasks

**Task 6A: Advanced Analytics** (2-3h)
- Cohort analysis (new users vs. retained)
- Funnel analysis (signup → first game → purchase)
- Churn analysis (why users leave)
- Feature usage (which games popular)

**Task 6B: Admin Dashboard** (1-2h)
- Real-time user count
- Revenue tracking (credits spent)
- Event logs (top events, errors)
- User segmentation

### Success Metrics
- ✅ Dashboard used for 80% of decisions
- ✅ Data available <5 min after event
- ✅ >90% data accuracy

---

## 7. MONETIZATION: PREMIUM FEATURES (High Priority)

**Impact:** Very High (revenue)  
**Effort:** 4-6 hours  
**ROI:** Essential (business model)

### Tasks

**Task 7A: Premium Subscription** (2-3h)
- $4.99/month tier (unlimited games, cosmetics)
- Annual discount ($49.99/year = ~35% off)
- Cancel anytime
- Stripe billing

**Task 7B: Cosmetics Shop** (1-2h)
- Skins for lobsters (appearance, not gameplay)
- Battle effects (special animations)
- UI themes (dark mode, neon, etc.)
- Pricing strategy ($0.99-$9.99)

**Task 7C: Battle Pass** (1-2h)
- Seasonal pass (30 days, $9.99)
- 50 tiers of rewards (skins, credits, NFTs)
- Free + premium tracks
- Progression tracking

### Success Metrics
- ✅ 10-15% of users converting to paid
- ✅ LTV >$20 per user
- ✅ Churn <5% month-over-month

---

## 8. COMMUNITY MANAGEMENT (Low-Medium Priority)

**Impact:** Medium (retention, brand)  
**Effort:** 2-3 hours/week (ongoing)  
**ROI:** Medium (long-term value)

### Tasks

**Task 8A: Discord Community** (2 hours setup)
- Official Discord server
- Channels: announcements, bugs, feedback, off-topic
- Bot integration (rank sync, stats lookup)
- Moderator onboarding

**Task 8B: Content & Comms** (ongoing, 3-5 hours/week)
- Weekly dev updates
- Patch notes + balance changes
- Community spotlights (best players, fan art)
- Announcements

**Task 8C: Feedback Loop** (ongoing)
- Read + respond to community feedback
- Prioritize feature requests
- Address bugs + balance issues quickly

### Success Metrics
- ✅ 1000+ Discord members by Week 4
- ✅ <24h response time on issues
- ✅ Monthly updates shipped

---

## 9. MARKETING & GROWTH (Low-Medium Priority)

**Impact:** Medium (user acquisition)  
**Effort:** 5-10 hours/week (ongoing)  
**ROI:** Medium-High (drives top-of-funnel)

### Tasks

**Task 9A: Launch Marketing** (5-10 hours)
- Twitter campaign (daily updates, polls, giveaways)
- TikTok strategy (gameplay clips, tips)
- YouTube: gameplay trailers
- Press outreach (crypto blogs, game blogs)

**Task 9B: User Acquisition** (ongoing)
- Twitch streamer partnerships
- Content creator sponsorships
- In-game referral rewards (earn credits by referring friends)
- Ad campaigns (meta, Google, etc.)

**Task 9C: Retention Marketing** (ongoing)
- Weekly emails (new features, limited offers)
- Push notifications (friend requests, match results)
- Seasonal events (limited-time tournaments)

### Success Metrics
- ✅ 1000+ signups/week
- ✅ D7 retention >40%
- ✅ D30 retention >20%
- ✅ CAC <$0.50

---

## 10. CONTENT & GAMEPLAY EXPANSION (Medium Priority)

**Impact:** High (retention)  
**Effort:** 8-12 hours  
**ROI:** High (keeps game fresh)

### Tasks

**Task 10A: New Game Modes** (4-6h)
- Battle Royale (16+ players, last one wins)
- Cooperative mode (2 players vs. AI boss)
- Time attack (speedrun mode)
- Puzzle mode (daily challenges)

**Task 10B: New Lobster Traits** (2-3h)
- 20+ new trait combinations
- New rarity tiers (Ultra Rare, Mythic)
- Animated traits (particles, effects)

**Task 10C: Seasonal Content** (2-3h)
- Themed lobsters (holiday editions)
- Limited-time events (boss battles)
- Quest lines (story progression)

### Success Metrics
- ✅ 4+ game modes available
- ✅ 50+ unique lobster traits
- ✅ Weekly new events
- ✅ Avg session time >20min

---

## Execution Timeline

**Week 3 (Mon-Sun):**
- Day 1-2: Tasks 1A, 2A (Multiplayer battles, tournaments)
- Day 3-4: Tasks 3A, 4A (Social, NFTs)
- Day 5: Tasks 5A, 6A (Scaling, analytics)
- Day 6-7: Testing + buffer

**Week 4 (Mon-Sun):**
- Day 1-2: Tasks 7A, 8A (Monetization, community)
- Day 3-4: Tasks 9A, 10A (Marketing, content)
- Day 5-7: Bug fixes, optimization, buffer

**Week 5+ (Ongoing):**
- Weekly feature drops (one new mode, cosmetics, etc.)
- Community management (daily)
- Marketing push (social content)
- Data-driven iterations (based on Phase 6 analytics)

---

## Success Metrics (Phase 9 End Goals)

**User Metrics:**
- ✅ 5,000+ DAU
- ✅ 500+ concurrent users (peak)
- ✅ 40% D7 retention
- ✅ 20% D30 retention
- ✅ 4+ hours AVG session time/week

**Monetization:**
- ✅ 10-15% conversion to paid
- ✅ $50K+ ARR (annual recurring revenue)
- ✅ <$0.50 CAC
- ✅ >$20 LTV

**Community:**
- ✅ 1000+ Discord members
- ✅ 5000+ Twitter followers
- ✅ 50+ community creators
- ✅ <24h support response time

**Technical:**
- ✅ 99.9% uptime
- ✅ <200ms p95 latency
- ✅ Zero data loss
- ✅ All tests passing (>60% coverage)

---

## Phase 10 Preview (Stretch Goals)

If Phase 9 is wildly successful (>10K DAU, >30% conversion):

- **Mobile App** (iOS + Android native)
- **Web3 Governance** (DAO, token, community voting)
- **Trading Cards / Collectibles** (separate game mode)
- **Esports League** (professional play, prize pools)
- **Blockchain Lottery** (blockchain-based random draws)

---

## Summary

Phase 9 transforms wojak-ink from MVP to **platform**.

**Phases 1-7:** Ship v1.0.0 (foundation)  
**Phase 8:** Optimize for scale (performance)  
**Phase 9:** Expand features & monetize (growth)  
**Phase 10+:** Become ecosystem (if successful)

**Timeline:** 2 weeks of intense execution (Phases 9-10)  
**Outcome:** From indie game → community-driven platform  
**Success State:** 10K+ DAU, $50K+ ARR, thriving community

---

**Ready to execute. Codex standing by for Phase 9 go-live signal.** 🚀
