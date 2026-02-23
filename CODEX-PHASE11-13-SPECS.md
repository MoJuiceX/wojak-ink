# Codex Phases 11-13 — Privacy, Internationalization & Machine Learning

**Generated:** 2026-02-23 13:20 UTC  
**Status:** Ready for execution Weeks 5-8 post-launch

---

## PHASE 11: Data Privacy, GDPR & Compliance Automation (8-10h)

**Timeline:** Week 5 post-launch  
**Priority:** Legal requirement (€20M+ fines for GDPR violations)

### Task 11.1: GDPR Data Export & Deletion (4-5h)

**Implementation:**

```typescript
// functions/api/user/export.ts
export async function export_user_data(req, res) {
  const user = req.user;
  
  // Collect all user data
  const data = {
    profile: await db.get("SELECT * FROM users WHERE id = ?", [user.id]),
    games: await db.all("SELECT * FROM game_history WHERE user_id = ?", [user.id]),
    purchases: await db.all("SELECT * FROM purchases WHERE user_id = ?", [user.id]),
    friends: await db.all("SELECT * FROM friendships WHERE user_id = ?", [user.id]),
    settings: await db.get("SELECT * FROM user_settings WHERE user_id = ?", [user.id]),
  };
  
  // Return as downloadable JSON
  res.json(data);
}

// functions/api/user/delete.ts
export async function delete_account(req, res) {
  const user = req.user;
  
  // 30-day waiting period
  await db.run(
    "UPDATE users SET deletion_requested = NOW(), deletion_date = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?",
    [user.id]
  );
  
  // Email confirmation
  await sendEmail(user.email, "Account deletion scheduled");
  
  // After 30 days, cron job purges all data
  res.json({ status: "Deletion scheduled for " + futureDate });
}
```

**Cron job (runs daily):**
```typescript
// After 30 days, permanently delete
const usersToDelete = await db.all("SELECT * FROM users WHERE deletion_date < NOW()");
for (const user of usersToDelete) {
  await db.run("DELETE FROM users WHERE id = ?", [user.id]);
  await db.run("DELETE FROM game_history WHERE user_id = ?", [user.id]);
  // ... delete all user data
  await logToAuditTrail("User permanently deleted: " + user.id);
}
```

### Task 11.2: Consent Management (2-3h)

**Implementation:**

```typescript
// src/components/ConsentBanner.tsx
export const ConsentBanner = () => {
  const [consent, setConsent] = useState({
    analytics: false,
    marketing: false,
    profiling: false,
  });
  
  const handleAccept = (type) => {
    setConsent({ ...consent, [type]: true });
    localStorage.setItem("consent", JSON.stringify(consent));
    Sentry.captureMessage("User consented to " + type);
  };
  
  return (
    <Banner>
      <p>We use analytics to improve your experience.</p>
      <button onClick={() => handleAccept('analytics')}>Accept Analytics</button>
      <button onClick={() => handleAccept('marketing')}>Accept Marketing</button>
      <Link to="/privacy">Privacy Policy</Link>
    </Banner>
  );
};
```

### Task 11.3: Privacy Dashboard (2-3h)

**Features:**

```typescript
// /account/privacy
- View: Last login, devices used, locations, login history
- Control: Revoke sessions, disable 2FA, change email, password reset
- Download: Click to export all data (uses Task 11.1)
- Delete: Irreversible account deletion (uses Task 11.1)
```

### Definition of Done
- ✅ Users can export data in <5 min
- ✅ Users can delete accounts (30-day waiting period)
- ✅ Audit log tracks all deletions
- ✅ Zero data leaks on deletion
- ✅ Consent granular (users choose what to share)

---

## PHASE 12: Internationalization (i18n) & Localization (15-20h)

**Timeline:** Week 6-7 post-launch  
**Priority:** High (3x addressable market)  
**Target Languages:** Spanish, German, French, Chinese (Simplified), Japanese

### Task 12.1: i18n Infrastructure (4-5h)

```typescript
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
// ... more languages

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    resources: { en, es, de, fr, zh, ja },
  });

export default i18n;
```

**Extract all strings:**

```typescript
// Before
<h1>Play Wojak Games</h1>
<button>Start Game</button>

// After
<h1>{t('games.play')}</h1>
<button>{t('buttons.start')}</button>
```

**Translation files:**

```json
// locales/en.json
{
  "games": { "play": "Play Wojak Games" },
  "buttons": { "start": "Start Game" }
}

// locales/es.json
{
  "games": { "play": "Jugar Juegos de Wojak" },
  "buttons": { "start": "Comenzar Juego" }
}
```

### Task 12.2: Professional Translations (8-10h)

**Languages:** Spanish (500M), German (130M), French (280M), Chinese Simplified (1B), Japanese (125M)

**Process:**
1. Use Phrase.com or Lokalise (professional translation platform)
2. Upload en.json
3. Translate to 5 languages
4. Native speakers review (not Google Translate)
5. QA: Test in each language

**Targeting 80/20:** Translate core features (login, games, shop) but not debug text

### Task 12.3: Regional Pricing (3-4h)

```typescript
// functions/api/prices.ts
const PRICES = {
  'US': { premium: '$4.99', cosmetic: '$0.99' },
  'ES': { premium: '€4.99', cosmetic: '€0.99' },
  'IN': { premium: '₹99', cosmetic: '₹19' }, // Lower for emerging markets
  'CN': { premium: '¥29', cosmetic: '¥3' },
  'JP': { premium: '¥600', cosmetic: '¥100' },
};

export async function get_prices(req, res) {
  const country = geoip.country(req.ip);
  const prices = PRICES[country] || PRICES['US'];
  res.json(prices);
}
```

### Task 12.4: Cultural Content (2-3h)

```typescript
// Disable culturally sensitive content by region
const getAvailableCosmetics = (country) => {
  let cosmetics = allCosmetics;
  
  if (['SA', 'AE', 'IR'].includes(country)) {
    // Remove alcohol/violence themes
    cosmetics = cosmetics.filter(c => !c.tags.includes('alcohol'));
  }
  
  return cosmetics;
};
```

### Definition of Done
- ✅ 5 languages fully playable
- ✅ Strings >95% translated
- ✅ Native speaker review complete
- ✅ Regional pricing configured
- ✅ +30% DAU from non-English users

---

## PHASE 13: Machine Learning & Personalization (20-30h)

**Timeline:** Week 8+ post-launch  
**Priority:** High (revenue multiplier)  
**ROI:** +50% LTV, +30% engagement

### Task 13.1: Recommendation Engine (6-8h)

```python
# ML model (Python, runs as service)
import numpy as np
from sklearn.decomposition import TruncatedSVD
from collaborative_filtering import CollaborativeFilter

# Data: user_id → [games_played]
# Model: predict games user hasn't played but similar users enjoyed

cf = CollaborativeFilter(n_factors=50)
cf.fit(user_game_matrix)

# Predictions: for user 123, what games to recommend?
recommendations = cf.predict(user_id=123, n_items=5)
# Output: [GeneratorGame, Merge2048, Wordle, ...]
```

**API Integration:**

```typescript
// Get personalized recommendations
const { data: recommendations } = await fetch('/api/recommendations');
// Returns: 5 games tailored to this user
```

### Task 13.2: Difficulty Balancing (4-6h)

```typescript
// Track user skill
const updateUserSkill = (userId, gameResult) => {
  const skill = calculateSkill({
    wins: userStats.wins,
    losses: userStats.losses,
    avgTime: userStats.avgTime,
    accuracy: userStats.accuracy,
  });
  
  // Adjust AI difficulty
  const aiLevel = mapSkillToLevel(skill); // 1-10
  
  // Goal: achieve ~50% win rate
  return {
    aiLevel,
    targetWinRate: 0.5,
  };
};
```

### Task 13.3: Churn Prediction (4-5h)

```python
# ML model detects at-risk users
from sklearn.ensemble import RandomForestClassifier

# Features: last login, games/week, spending, days since signup
features = [
  days_since_last_login,
  games_per_week,
  total_spending,
  days_since_signup,
]

# Train: historical data of churned users
model = RandomForestClassifier()
model.fit(X_train, y_churn)

# Predict: probability user will churn in next 7 days
churn_risk = model.predict_proba(features)
if churn_risk > 0.7:
  send_intervention_email(user, "$5 credit")
```

### Task 13.4: Dynamic Pricing (3-4h)

```typescript
// Show cosmetics user is likely to buy
const getPersonalizedShop = (user) => {
  const preferences = analyzeUserBehavior(user);
  // User liked: dragon cosmetics, purple colors
  
  const recommendedCosmetics = shop.filter(c => 
    preferences.themes.includes(c.theme) &&
    preferences.colors.includes(c.color)
  );
  
  // Show recommended first
  return [
    ...recommendedCosmetics,  // Personalized
    ...otherCosmetics,        // Generic
  ];
};
```

### Task 13.5: Analytics Dashboard (3-4h)

```typescript
// Dashboard for product decisions
{
  "DAU": 5000,
  "retention": {
    "D1": 0.65,
    "D7": 0.40,
    "D30": 0.20,
  },
  "recommendations": {
    "clickthrough_rate": 0.15,  // 15% of users click recs
    "conversion_rate": 0.08,    // 8% convert after rec
  },
  "churn_prediction": {
    "accuracy": 0.82,           // 82% of predicted churns actually churn
    "saved_users": 120,         // 120 users prevented from churning
  },
}
```

### Definition of Done
- ✅ Recommendation engine: 15% clickthrough
- ✅ Difficulty balancing: 50% average win rate
- ✅ Churn prediction: 82% accuracy, save 10% of at-risk users
- ✅ Dynamic pricing: +15% cosmetic conversion
- ✅ LTV +50%, engagement +30%

---

## CONSOLIDATED TIMELINE: PHASES 1-13

```
WEEKS 1-2:  Phases 1-7  (Launch + initial validation)
WEEK 2:     Phase 8     (Performance sprint)
WEEK 3:     Phase 9     (Features + monetization)
WEEK 4:     Phase 10    (Observability + fraud)
WEEK 5:     Phase 11    (Privacy + GDPR)
WEEKS 6-7:  Phase 12    (i18n + 5 languages)
WEEKS 8+:   Phase 13    (ML + personalization)
```

**Total Effort:** ~150 hours  
**Revenue Impact:** v1.0 → $50K ARR → $500K+ ARR (with Phase 13)  
**User Impact:** v1.0 (1K DAU) → Phase 13 (10K+ DAU, 2x retention)

---

## STRATEGIC RECOMMENDATION

**Execute in order:**
1. ✅ Phases 1-7 (Foundation + launch) — COMPLETE
2. → Phase 8 (Performance) — Execute Week 2
3. → Phase 9 (Features) — Execute Week 3
4. → Phase 10 (Observability) — Execute Week 4 (CRITICAL)
5. → Phase 11 (Privacy) — Execute Week 5 (LEGAL)
6. → Phase 12 (i18n) — Execute Weeks 6-7 (if on track)
7. → Phase 13 (ML) — Execute Week 8+ (if PMF confirmed)

**All specs complete. Ready for full execution. 🚀**
