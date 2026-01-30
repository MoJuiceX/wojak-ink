# Component Upgrades — File-by-File Implementation

## Files to Create

### 1. `src/components/common/InfoButton.tsx`

```tsx
import { Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageInfoContent } from './PageInfoContent';

export type PageId =
  | 'gallery'
  | 'bigpulp'
  | 'generator'
  | 'games'
  | 'leaderboard'
  | 'chat'
  | 'account'
  | 'shop'
  | 'treasury';

interface InfoButtonProps {
  page: PageId;
}

export function InfoButton({ page }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenInfo, setHasSeenInfo] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(`info-seen-${page}`);
    setHasSeenInfo(!!seen);
  }, [page]);

  const handleOpen = () => setIsOpen(true);

  const handleClose = () => {
    localStorage.setItem(`info-seen-${page}`, 'true');
    setHasSeenInfo(true);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`info-button ${hasSeenInfo ? 'seen' : ''}`}
        aria-label="Page information and tips"
      >
        <Info size={18} />
      </button>

      <Lightbox isOpen={isOpen} onClose={handleClose}>
        <PageInfoContent page={page} />
      </Lightbox>
    </>
  );
}
```

---

### 2. `src/components/common/PageInfoContent.tsx`

```tsx
import { ArrowRight, Zap, Eye, TrendingUp, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PageId } from './InfoButton';

interface PageSection {
  icon: LucideIcon;
  title: string;
  content?: string;
  items?: string[];
  links?: Array<{ label: string; path: string }>;
}

interface PageInfo {
  title: string;
  tagline: string;
  sections: PageSection[];
}

const PAGE_INFO: Record<PageId, PageInfo> = {
  gallery: {
    title: "Gallery",
    tagline: "4,200 Wojak Farmer Plot NFTs",
    sections: [
      {
        icon: Eye,
        title: "How to Explore",
        content: "Click any base character to see all variations. Use sidebar filters to narrow by traits, price, or rarity."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Sort by 'Recently Listed' to catch new deals",
          "Click any trait to filter the entire collection",
          "Rarity rank is shown on each NFT detail view"
        ]
      },
      {
        icon: TrendingUp,
        title: "Go Deeper",
        links: [
          { label: "Analyze traits with BigPulp", path: "/bigpulp" },
          { label: "Create your own in Generator", path: "/generator" }
        ]
      }
    ]
  },
  bigpulp: {
    title: "BigPulp Intelligence",
    tagline: "BigPulp sees what you cannot.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Market data, trait analysis, and an AI that knows everything about the collection."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Heat Map shows price vs rarity — find undervalued gems",
          "Ask BigPulp about specific combos: 'What's a Ronin Wojak worth?'",
          "Check 'Top 10 Valuable Attributes' for high-value traits"
        ]
      },
      {
        icon: Sparkles,
        title: "Try Asking",
        items: [
          "What's trending today?",
          "Find me undervalued NFTs",
          "Which traits are pumping?"
        ]
      }
    ]
  },
  generator: {
    title: "Wojak Generator",
    tagline: "Experience being the artist.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Build your own Wojak using the same traits from the collection. Feel what the artist felt."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Orange badges on traits indicate premium/rare options",
          "Hit 'Random' for quick inspiration",
          "Export and share your creation on social"
        ]
      }
    ]
  },
  games: {
    title: "Games",
    tagline: "Training simulations active.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Arcade games to play and compete. Earn points for the leaderboard."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Points contribute to your overall rank",
          "Check 'Your High Scores' to track progress",
          "Some games have daily challenges"
        ]
      }
    ]
  },
  leaderboard: {
    title: "Leaderboard",
    tagline: "Top operators in the simulation.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Rankings based on game scores. Filter by time period to see who's on top."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Weekly resets give everyone a fresh shot",
          "Different games have different point weights",
          "Top 3 get special recognition"
        ]
      }
    ]
  },
  chat: {
    title: "Chat Rooms",
    tagline: "Connect with operators.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Whale Chat (42+ NFTs) and Holder Chat (1+ NFT). Gated by your holdings."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Whale Chat is where the big moves are discussed",
          "Holder Chat is open to all collection members"
        ]
      }
    ]
  },
  account: {
    title: "Your Profile",
    tagline: "Your identity in the simulation.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Your Wojaks, game scores, achievements, and friends."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Customize your avatar from your NFT collection",
          "Achievements unlock through gameplay and exploration",
          "Your profile card can be shared"
        ]
      }
    ]
  },
  shop: {
    title: "Shop",
    tagline: "Gear up.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Items and power-ups. Spend your earned currency."
      }
    ]
  },
  treasury: {
    title: "Treasury",
    tagline: "Community funds.",
    sections: [
      {
        icon: Eye,
        title: "What's Here",
        content: "Track the community treasury holdings. Funds from sales and royalties."
      },
      {
        icon: Zap,
        title: "Alpha Tips",
        items: [
          "Bubble size shows relative holdings",
          "Treasury funds development and community rewards"
        ]
      }
    ]
  }
};

export function PageInfoContent({ page }: { page: PageId }) {
  const info = PAGE_INFO[page];

  return (
    <div className="page-info-content">
      <header className="info-header">
        <h2>{info.title}</h2>
        <p className="info-tagline">{info.tagline}</p>
      </header>

      <div className="info-sections">
        {info.sections.map((section, i) => (
          <div key={i} className="info-section">
            <div className="section-icon">
              <section.icon size={20} />
            </div>
            <div className="section-content">
              <h3>{section.title}</h3>
              {section.content && <p>{section.content}</p>}
              {section.items && (
                <ul>
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
              {section.links && (
                <div className="section-links">
                  {section.links.map((link, j) => (
                    <Link key={j} to={link.path} className="info-link">
                      {link.label}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. `src/components/Account/ProfileHero.tsx`

```tsx
import { Pencil, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfileHeroProps {
  user: {
    username: string;
    avatar: string;
    walletAddress: string;
    joinedAt: string;
  };
  onEditAvatar: () => void;
}

export function ProfileHero({ user, onEditAvatar }: ProfileHeroProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="profile-hero">
      <motion.div
        className="avatar-container"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="avatar-wrapper">
          <img
            src={user.avatar}
            alt={user.username}
            className="avatar-image"
          />
          <button
            onClick={onEditAvatar}
            className="avatar-edit-btn"
            aria-label="Edit avatar"
          >
            <Pencil size={14} />
          </button>
        </div>
      </motion.div>

      <div className="user-info">
        <h1 className="username">{user.username}</h1>
        <button onClick={copyAddress} className="wallet-address">
          <span className="font-mono">{truncateAddress(user.walletAddress)}</span>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <span className="join-date">
          Operator since {new Date(user.joinedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
```

---

### 4. `src/components/Account/QuickStats.tsx`

```tsx
import { Zap, Trophy, Image, Gamepad } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface QuickStatsProps {
  stats: {
    points: number;
    rank: number;
    nftCount: number;
    gamesPlayed: number;
  };
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="stat-value">
      {prefix}{displayValue.toLocaleString()}
    </span>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    { icon: Zap, label: 'Points', value: stats.points, color: 'orange' },
    { icon: Trophy, label: 'Rank', value: stats.rank, color: 'gold', prefix: '#' },
    { icon: Image, label: 'Wojaks', value: stats.nftCount, color: 'cyan' },
    { icon: Gamepad, label: 'Games', value: stats.gamesPlayed, color: 'purple' },
  ];

  return (
    <motion.div
      className="quick-stats"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {statItems.map(item => (
        <motion.div
          key={item.label}
          className={`stat-card stat-${item.color}`}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <item.icon size={20} className="stat-icon" />
          <AnimatedNumber value={item.value} prefix={item.prefix} />
          <span className="stat-label">{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

### 5. `src/types/bigpulp.ts`

```typescript
export type StreamingStage = 'analyzing' | 'searching' | 'generating' | null;

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  stage: StreamingStage;
}

export type AIResponseType = 'text' | 'nft-list' | 'stats' | 'chart' | 'suggestion' | 'error';

export interface AIResponse {
  id: string;
  type: AIResponseType;
  content: unknown;
  timestamp: Date;
}

export interface NFTListResponse {
  nfts: Array<{
    id: string;
    name: string;
    image: string;
    price?: number;
    rarity: string;
  }>;
  title?: string;
}

export interface StatsResponse {
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  response?: AIResponse;
}
```

---

### 6. `src/hooks/useContextualPrompts.ts`

```typescript
import { useMemo } from 'react';
import type { Message } from '@/types/bigpulp';

const PROMPT_SETS = {
  initial: [
    "What's trending today?",
    "Find undervalued NFTs",
    "Show me the floor",
    "Which traits are rarest?",
  ],
  afterNFTView: [
    "Find similar to this",
    "What's this trait worth?",
    "Is this a good deal?",
    "Show price history",
  ],
  afterPriceQuery: [
    "Compare to similar",
    "Show sales history",
    "What affects this price?",
    "Alert me if it drops",
  ],
  afterTraitQuery: [
    "Show NFTs with this trait",
    "What pairs well with this?",
    "Rarest combos with this trait",
    "Price range for this trait",
  ],
  afterMarketQuery: [
    "Who's buying?",
    "Recent big sales",
    "Volume trends",
    "Whale activity",
  ],
};

export function useContextualPrompts(conversationHistory: Message[]): string[] {
  return useMemo(() => {
    if (conversationHistory.length === 0) {
      return PROMPT_SETS.initial;
    }

    const lastUserMessage = [...conversationHistory]
      .reverse()
      .find(m => m.role === 'user');

    if (!lastUserMessage) {
      return PROMPT_SETS.initial;
    }

    const content = lastUserMessage.content.toLowerCase();

    if (content.includes('nft #') || content.includes('wojak #')) {
      return PROMPT_SETS.afterNFTView;
    }

    if (content.includes('price') || content.includes('worth') || content.includes('value')) {
      return PROMPT_SETS.afterPriceQuery;
    }

    if (content.includes('trait') || content.includes('attribute')) {
      return PROMPT_SETS.afterTraitQuery;
    }

    if (content.includes('market') || content.includes('floor') || content.includes('volume')) {
      return PROMPT_SETS.afterMarketQuery;
    }

    return PROMPT_SETS.initial;
  }, [conversationHistory]);
}
```

---

## Files to Modify

### 1. `src/pages/GamesHub.tsx`

**Changes:**
1. Filter games to only show playable ones in main grid
2. Consolidate to single right sidebar
3. Add collapsible "Coming Soon" section at bottom

```tsx
// Add to component
const playableGames = games.filter(game => !game.comingSoon);
const comingSoonGames = games.filter(game => game.comingSoon);

// New layout structure:
<div className="games-layout">
  <main className="games-main">
    <div className="games-grid">
      {playableGames.map(game => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>

    {comingSoonGames.length > 0 && (
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="coming-soon-trigger">
          More Games Coming Soon ({comingSoonGames.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="games-grid games-grid--coming-soon">
            {comingSoonGames.map(game => (
              <GameCard key={game.id} game={game} comingSoon />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )}
  </main>

  <aside className="games-sidebar">
    <section className="sidebar-section">
      <h3>Your Scores</h3>
      <ScoresList scores={userScores} limit={5} />
    </section>
    <section className="sidebar-section">
      <h3>Top Operators</h3>
      <ScoresList scores={globalScores} limit={5} />
    </section>
  </aside>
</div>

// Add InfoButton
import { InfoButton } from '@/components/common/InfoButton';
// ... at end of component return:
<InfoButton page="games" />
```

---

### 2. `src/pages/Shop.tsx`

**Changes:**
1. Filter categories to only show ones with items
2. Add footer text

```tsx
// Filter categories
const availableCategories = categories.filter(cat => cat.items.length > 0);

// Show only available categories
{availableCategories.map(category => (
  // ... category tab
))}

// Add footer
<p className="shop-footer-text">
  More items arriving soon. Stay tuned.
</p>

// Add InfoButton
<InfoButton page="shop" />
```

---

### 3. `src/config/routes.ts`

**Changes:**
Hide Guild from primary navigation

```typescript
// Find the Guild nav item and add hidden flag:
{
  id: 'guild',
  path: '/guild',
  label: 'Guild',
  icon: Users,
  hidden: true, // Add this
  comingSoon: true,
}

// Update navigation filter to respect hidden flag:
export const visibleNavItems = PRIMARY_NAV_ITEMS.filter(item => !item.hidden);
```

---

### 4. `src/pages/Settings.tsx`

**Changes:**
1. Remove "Coming Soon" rows
2. Group settings

```tsx
// Remove gyroscope or any "Coming Soon" setting rows

// Group settings:
<section className="settings-group">
  <h2 className="settings-group-title">Audio & Effects</h2>
  {/* Sound Effects, Background Music, Motion Effects */}
</section>

<section className="settings-group">
  <h2 className="settings-group-title">Display</h2>
  {/* Compact Mode, Show Prices in USD */}
</section>

<p className="settings-footer">
  More settings coming soon.
</p>
```

---

### 5. `src/pages/Account.tsx`

**Changes:**
1. Import and use ProfileHero, QuickStats
2. Restructure layout
3. Add InfoButton

```tsx
import { ProfileHero } from '@/components/Account/ProfileHero';
import { QuickStats } from '@/components/Account/QuickStats';
import { InfoButton } from '@/components/common/InfoButton';

// New layout:
<div className="account-page">
  <ProfileHero user={user} onEditAvatar={handleEditAvatar} />

  <QuickStats stats={{
    points: userStats.points,
    rank: userStats.rank,
    nftCount: userNfts.length,
    gamesPlayed: userStats.gamesPlayed,
  }} />

  <section className="achievements-section">
    <h2>Achievements</h2>
    <AchievementShowcase achievements={achievements} />
  </section>

  <section className="collection-section">
    <h2>Your Wojaks ({nfts.length})</h2>
    <NFTCollectionGrid nfts={nfts} />
  </section>

  {/* Game scores collapsed by default */}
  <Collapsible defaultOpen={false}>
    <CollapsibleTrigger>Game Scores</CollapsibleTrigger>
    <CollapsibleContent>
      <GameScoresGrid scores={scores} />
    </CollapsibleContent>
  </Collapsible>

  <InfoButton page="account" />
</div>
```

---

### 6. All Main Pages — Add InfoButton

Add to each of these files at the end of the return statement:

| File | Code to Add |
|------|-------------|
| `src/pages/Gallery.tsx` | `<InfoButton page="gallery" />` |
| `src/pages/BigPulp.tsx` | `<InfoButton page="bigpulp" />` |
| `src/pages/Generator.tsx` | `<InfoButton page="generator" />` |
| `src/pages/Leaderboard.tsx` | `<InfoButton page="leaderboard" />` |
| `src/pages/ChatHub.tsx` | `<InfoButton page="chat" />` |
| `src/pages/Treasury.tsx` | `<InfoButton page="treasury" />` |

Import at top of each:
```tsx
import { InfoButton } from '@/components/common/InfoButton';
```

---

### 7. NFT Grid Item — Add Rarity Classes

**File:** `src/components/gallery/NFTGridItem.tsx` (or similar)

```tsx
// Add rarity class based on NFT rarity
const getRarityClass = (rarityRank: number, totalSupply: number = 4200) => {
  const percentile = (rarityRank / totalSupply) * 100;

  if (percentile <= 1) return 'rarity-mythic';
  if (percentile <= 5) return 'rarity-legendary';
  if (percentile <= 15) return 'rarity-epic';
  if (percentile <= 35) return 'rarity-rare';
  if (percentile <= 60) return 'rarity-uncommon';
  return 'rarity-common';
};

// In component:
<div className={`nft-card ${getRarityClass(nft.rarityRank)}`}>
  {/* ... */}
</div>
```

---

## Export Updates

### `src/components/common/index.ts`

Create or update:

```typescript
export { InfoButton } from './InfoButton';
export type { PageId } from './InfoButton';
export { PageInfoContent } from './PageInfoContent';
```

### `src/components/Account/index.ts`

Create or update:

```typescript
export { ProfileHero } from './ProfileHero';
export { QuickStats } from './QuickStats';
```

---

## Checklist

### Files to Create
- [ ] `src/components/common/InfoButton.tsx`
- [ ] `src/components/common/PageInfoContent.tsx`
- [ ] `src/components/common/index.ts` (if not exists)
- [ ] `src/components/Account/ProfileHero.tsx`
- [ ] `src/components/Account/QuickStats.tsx`
- [ ] `src/components/Account/index.ts` (if not exists)
- [ ] `src/types/bigpulp.ts`
- [ ] `src/hooks/useContextualPrompts.ts`

### Files to Modify
- [ ] `src/pages/GamesHub.tsx` — Filter games, consolidate sidebar
- [ ] `src/pages/Shop.tsx` — Filter categories
- [ ] `src/config/routes.ts` — Hide Guild
- [ ] `src/pages/Settings.tsx` — Group settings, remove Coming Soon
- [ ] `src/pages/Account.tsx` — Use new components
- [ ] `src/pages/Gallery.tsx` — Add InfoButton
- [ ] `src/pages/BigPulp.tsx` — Add InfoButton (full upgrade in separate doc)
- [ ] `src/pages/Generator.tsx` — Add InfoButton
- [ ] `src/pages/Leaderboard.tsx` — Add InfoButton
- [ ] `src/pages/ChatHub.tsx` — Add InfoButton
- [ ] `src/pages/Treasury.tsx` — Add InfoButton
- [ ] NFT Grid Item — Add rarity classes

---

*Component Upgrades Guide*
*January 29, 2026*
