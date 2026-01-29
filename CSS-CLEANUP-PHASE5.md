# CSS CLEANUP PHASE 5 - Remove Ionic Completely

## Overview

This phase removes ALL Ionic dependencies and replaces them with existing native components.

**Good news:** The codebase already has excellent replacements:
- `LoadingSpinner` + `LoadingDots` → replaces `IonSpinner`
- `Toggle` → replaces `IonToggle`
- `Dropdown` → replaces `IonSelect`
- `.btn` classes → replaces `IonButton`
- `lucide-react` → replaces `ionicons`

---

## FILES TO MODIFY

| File | Ionic Usage | Replacement |
|------|-------------|-------------|
| `src/main.tsx` | setupIonicReact, core.css | DELETE |
| `src/components/auth/SignInButton.tsx` | IonButton, IonSpinner, IonPopover, IonList, IonItem, IonIcon | Native + lucide-react |
| `src/components/settings/NotificationSettings.tsx` | IonList, IonItem, IonLabel, IonToggle, IonButton, IonNote, IonSpinner | Native + Toggle + LoadingSpinner |
| `src/components/TraitValues.tsx` | IonSpinner, IonSearchbar, IonSelect, IonSelectOption, IonRefresher | Native + Dropdown + LoadingSpinner |
| `src/components/AskBigPulp.tsx` | IonImg, IonIcon, IonSpinner | Native img + lucide-react + LoadingSpinner |

---

## PHASE 5A: Update main.tsx

**File:** `src/main.tsx`

### Remove these lines:

```tsx
// DELETE this import
import { setupIonicReact } from '@ionic/react'

// DELETE this import
import '@ionic/react/css/core.css'

// DELETE this block
setupIonicReact({
  mode: 'ios',
})
```

### Final main.tsx should look like:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { register as registerServiceWorker } from './serviceWorkerRegistration'
import { ErrorBoundary } from './components/ErrorBoundary'

import './index.css'
import App from './App.tsx'

// Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Warn if key is missing (auth will be disabled)
if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    '[Clerk] Missing VITE_CLERK_PUBLISHABLE_KEY. Auth features will be disabled.\n' +
    'Add it to .env.local - see .env.example for details.'
  )
}

// Clerk appearance customization - orange theme with white backgrounds
const clerkAppearance = {
  variables: {
    colorPrimary: '#ea580c',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBackground: '#ffffff',
    colorInputBackground: '#f9fafb',
    colorInputText: '#1f2937',
  },
  elements: {
    rootBox: { backgroundColor: '#ffffff' },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    headerTitle: { color: '#1f2937' },
    headerSubtitle: { color: '#6b7280' },
    identityPreview: { backgroundColor: '#ffffff' },
    identityPreviewText: { color: '#1f2937' },
    identityPreviewEditButton: { color: '#ea580c' },
    formButtonPrimary: { backgroundColor: '#ea580c', color: '#ffffff' },
    formFieldLabel: { color: '#374151' },
    formFieldInput: {
      backgroundColor: '#f9fafb',
      color: '#1f2937',
      borderColor: '#d1d5db',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
    },
    socialButtonsBlockButtonText: { color: '#1f2937' },
    dividerLine: { backgroundColor: '#e5e7eb' },
    dividerText: { color: '#9ca3af' },
    footer: { backgroundColor: '#ffffff' },
    footerAction: { backgroundColor: '#ffffff' },
    footerActionLink: { color: '#ea580c' },
    footerActionText: { color: '#6b7280' },
    userButtonPopoverCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    userButtonPopoverActionButton: { color: '#ea580c !important' },
    userButtonPopoverActionButtonText: { color: '#ea580c !important' },
    userButtonPopoverActionButtonIcon: { color: '#ea580c !important' },
    userButtonPopoverCustomItemButton: { color: '#ea580c !important' },
    userButtonPopoverFooter: { backgroundColor: '#fff7ed' },
    menuButton: { color: '#ea580c !important' },
    menuList: { backgroundColor: '#ffffff' },
    menuItem: { color: '#ea580c !important' },
  },
}

// Register service worker for PWA support
registerServiceWorker({
  onSuccess: () => console.log('App ready for offline use'),
  onUpdate: () => console.log('New version available - refresh to update'),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider
          publishableKey={CLERK_PUBLISHABLE_KEY}
          afterSignOutUrl="/"
          appearance={clerkAppearance}
        >
          <App />
        </ClerkProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)
```

---

## PHASE 5B: Replace SignInButton.tsx

**File:** `src/components/auth/SignInButton.tsx`

### COMPLETE REPLACEMENT:

```tsx
/**
 * Sign In Button Component
 *
 * Shows sign in button when logged out, or user avatar/menu when logged in.
 * Handles the auth flow including Google sign-in and username picker.
 */

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Pencil, Wallet } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../Avatar/Avatar';
import { AvatarPickerModal } from '../AvatarPicker';
import { UsernamePicker } from '../UsernamePicker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import './SignInButton.css';

interface SignInButtonProps {
  variant?: 'compact' | 'full';
}

export const SignInButton: React.FC<SignInButtonProps> = ({
  variant = 'compact'
}) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    isNewUser,
    signInWithGoogle,
    signOut,
    connectWallet,
    disconnectWallet
  } = useAuth();

  const [showMenu, setShowMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [_showUsernamePicker, _setShowUsernamePicker] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Google login hook
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        const userData = await userInfo.json();
        await signInWithGoogle(JSON.stringify(userData));
      } catch (error) {
        console.error('Sign in failed:', error);
      } finally {
        setIsSigningIn(false);
      }
    },
    onError: () => {
      console.error('Google login failed');
      setIsSigningIn(false);
    },
  });

  const handleSignIn = () => {
    setIsSigningIn(true);
    googleLogin();
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    await signOut();
  };

  const handleWalletAction = async () => {
    setShowMenu(false);
    if (user?.walletAddress) {
      await disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  const handleAvatarClick = () => {
    setShowMenu(false);
    setShowAvatarPicker(true);
  };

  const handleUsernameComplete = () => {
    _setShowUsernamePicker(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="sign-in-button-loading">
        <LoadingSpinner size={20} />
      </div>
    );
  }

  // Not authenticated - show sign in button
  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className={`btn btn-primary sign-in-button ${variant}`}
        >
          {isSigningIn ? (
            <LoadingSpinner size={18} />
          ) : (
            <>
              <User size={18} />
              {variant === 'full' ? 'Sign In with Google' : 'Sign In'}
            </>
          )}
        </button>

        <UsernamePicker
          isOpen={isNewUser}
          onComplete={handleUsernameComplete}
        />
      </>
    );
  }

  // Authenticated - show user avatar with menu
  return (
    <>
      <button
        ref={triggerRef}
        className="user-avatar-button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="User menu"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <Avatar
          type={user?.avatar.type || 'emoji'}
          value={user?.avatar.value || '🍊'}
          size="small"
          isNftHolder={!!user?.walletAddress && user?.avatar.type === 'nft'}
        />
        {variant === 'full' && (
          <span className="username-label">{user?.username || 'User'}</span>
        )}
      </button>

      {showMenu && (
        <div ref={menuRef} className="user-menu-popover">
          <div className="user-menu-header">
            <Avatar
              type={user?.avatar.type || 'emoji'}
              value={user?.avatar.value || '🍊'}
              size="medium"
              isNftHolder={!!user?.walletAddress && user?.avatar.type === 'nft'}
            />
            <div className="user-info">
              <span className="user-name">{user?.username || 'User'}</span>
              {user?.walletAddress && (
                <span className="wallet-badge">Wallet Connected</span>
              )}
            </div>
          </div>

          <div className="user-menu-items">
            <button className="user-menu-item" onClick={handleAvatarClick}>
              <Pencil size={18} />
              Change Avatar
            </button>

            <button className="user-menu-item" onClick={handleWalletAction}>
              <Wallet size={18} />
              {user?.walletAddress ? 'Disconnect Wallet' : 'Connect Wallet'}
            </button>

            <button className="user-menu-item sign-out-item" onClick={handleSignOut}>
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <AvatarPickerModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
      />

      <UsernamePicker
        isOpen={isNewUser && !user?.username}
        onComplete={handleUsernameComplete}
      />
    </>
  );
};

export default SignInButton;
```

### Update SignInButton.css - Add these styles:

```css
/* Add to existing SignInButton.css */

.user-menu-popover {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 220px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  overflow: hidden;
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.user-menu-items {
  padding: 8px;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.user-menu-item:hover {
  background: var(--color-surface-hover);
}

.user-menu-item.sign-out-item {
  color: var(--color-error);
}
```

---

## PHASE 5C: Replace NotificationSettings.tsx

**File:** `src/components/settings/NotificationSettings.tsx`

### COMPLETE REPLACEMENT:

```tsx
/**
 * Notification Settings Component
 *
 * UI for managing push notification preferences.
 */

import React, { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Toggle } from '../ui/Toggle';
import './NotificationSettings.css';

export const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    sendTestNotification,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsEnabling(false);
          return;
        }
      }
      await subscribe();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsDisabling(true);
    try {
      await unsubscribe();
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="notification-settings loading">
        <LoadingSpinner size={24} />
        <p>Loading notification settings...</p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="notification-settings unsupported">
        <div className="unsupported-icon">🔕</div>
        <h3>Not Supported</h3>
        <p>Push notifications are not supported in this browser.</p>
        <p className="hint">Try using Chrome, Firefox, or Edge for the best experience.</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="notification-settings blocked">
        <div className="blocked-icon">🚫</div>
        <h3>Notifications Blocked</h3>
        <p>You have blocked notifications for this site.</p>
        <p className="hint">
          To enable notifications, click the lock icon in your browser's address bar and change the
          notification setting to "Allow".
        </p>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <div className="header-content">
          <h3>Push Notifications</h3>
          <p className="header-description">
            Stay updated with game challenges, rewards, and guild activity.
          </p>
        </div>

        {!isSubscribed ? (
          <button
            onClick={handleEnableNotifications}
            disabled={isEnabling}
            className="btn btn-primary enable-button"
          >
            {isEnabling ? <LoadingSpinner size={18} /> : 'Enable Notifications'}
          </button>
        ) : (
          <div className="header-actions">
            <button
              onClick={sendTestNotification}
              className="btn btn-ghost test-button"
            >
              Test
            </button>
            <button
              onClick={handleDisableNotifications}
              disabled={isDisabling}
              className="btn btn-ghost disable-button"
            >
              {isDisabling ? <LoadingSpinner size={18} /> : 'Disable All'}
            </button>
          </div>
        )}
      </div>

      {isSubscribed && (
        <>
          <div className="preferences-section">
            <h4>Notification Types</h4>
            <p className="section-description">Choose which notifications you want to receive.</p>
          </div>

          <div className="preferences-list">
            <div className="preference-item">
              <div className="preference-info">
                <h5>Daily Rewards</h5>
                <p className="preference-note">Remind me to claim daily rewards</p>
              </div>
              <Toggle
                id="pref-daily-rewards"
                checked={preferences.dailyRewards}
                onChange={(checked) => updatePreferences({ dailyRewards: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>High Score Alerts</h5>
                <p className="preference-note">Notify when someone beats my score</p>
              </div>
              <Toggle
                id="pref-high-score"
                checked={preferences.highScoreBeaten}
                onChange={(checked) => updatePreferences({ highScoreBeaten: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Guild Updates</h5>
                <p className="preference-note">Guild challenges, invites, and competitions</p>
              </div>
              <Toggle
                id="pref-guild"
                checked={preferences.guildUpdates}
                onChange={(checked) => updatePreferences({ guildUpdates: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Achievements</h5>
                <p className="preference-note">New achievements unlocked</p>
              </div>
              <Toggle
                id="pref-achievements"
                checked={preferences.achievements}
                onChange={(checked) => updatePreferences({ achievements: checked })}
                size="small"
              />
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <h5>Social</h5>
                <p className="preference-note">Friends joining and activity</p>
              </div>
              <Toggle
                id="pref-social"
                checked={preferences.social}
                onChange={(checked) => updatePreferences({ social: checked })}
                size="small"
              />
            </div>
          </div>

          <div className="notification-info">
            <p>
              Notifications are sent to all your subscribed devices. You can manage this separately
              on each device.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
```

### Update NotificationSettings.css - Add these styles:

```css
/* Add/replace in NotificationSettings.css */

.preferences-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.preference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: var(--color-surface);
}

.preference-info {
  flex: 1;
  min-width: 0;
}

.preference-info h5 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.preference-note {
  margin: 4px 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
```

---

## PHASE 5D: Replace TraitValues.tsx

**File:** `src/components/TraitValues.tsx`

### COMPLETE REPLACEMENT:

```tsx
// @ts-nocheck
/**
 * TraitValues Component
 * Displays trait trade statistics in a sortable table
 * Used in BigPulp Intelligence modal's "Traits" tab
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import {
  fetchTradeValues,
  fetchTraitSales,
  formatRelativeTime,
  formatXCH,
  TraitStats,
  Sale,
} from '../services/tradeValuesService';
import { getCachedXchPrice } from '../services/treasuryApi';
import { LoadingSpinner, LoadingDots } from './ui/LoadingSpinner';
import { Dropdown } from './ui/Dropdown';
import './TraitValues.css';

type SortField = 'trait_name' | 'trait_category' | 'total_sales' | 'average_xch' | 'min_xch' | 'max_xch' | 'last_trade';
type SortDirection = 'asc' | 'desc';
type SalesSortMode = 'price_asc' | 'price_desc' | 'rarity_asc' | 'rarity_desc' | 'time_asc' | 'time_desc';

const IPFS_CID = 'bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq';
const getIpfsUrl = (edition: number) => {
  const paddedId = String(edition).padStart(4, '0');
  return `https://${IPFS_CID}.ipfs.w3s.link/${paddedId}.png`;
};

const capitalizeCategory = (str: string): string => {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface TraitValuesProps {
  onTraitClick?: (traitName: string) => void;
}

const TraitValues: React.FC<TraitValuesProps> = ({ onTraitClick }) => {
  const [traitStats, setTraitStats] = useState<TraitStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState(0);

  const [sortField, setSortField] = useState<SortField>('average_xch');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTrait, setSelectedTrait] = useState<TraitStats | null>(null);
  const [selectedTraitSales, setSelectedTraitSales] = useState<Sale[]>([]);
  const [loadingTraitSales, setLoadingTraitSales] = useState(false);

  const [salesSortMode, setSalesSortMode] = useState<SalesSortMode>('price_asc');
  const [rarityData, setRarityData] = useState<Map<number, number>>(new Map());
  const xchPriceUsd = getCachedXchPrice();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTradeValues();
      if (data.error && data.trait_stats.length === 0) {
        setError(data.error);
      } else {
        setTraitStats(data.trait_stats);
        setLastUpdated(data.last_updated);
        setTotalSalesCount(data.total_sales_count);
      }
    } catch (err) {
      setError('Failed to load trade data. Pull down to retry.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadRarityData = async () => {
      try {
        const response = await fetch('/assets/BigPulp/all_nft_analysis.json');
        const data = await response.json();
        const rarityMap = new Map<number, number>();
        for (const [id, analysis] of Object.entries(data)) {
          rarityMap.set(parseInt(id), (analysis as any).rank);
        }
        setRarityData(rarityMap);
      } catch (err) {
        console.error('Failed to load rarity data:', err);
      }
    };
    loadRarityData();
  }, []);

  const loadTraitSales = useCallback(async (traitName: string) => {
    try {
      setLoadingTraitSales(true);
      const data = await fetchTraitSales(traitName);
      setSelectedTraitSales(data.sales);
    } catch (err) {
      console.error('Failed to load trait sales:', err);
      setSelectedTraitSales([]);
    } finally {
      setLoadingTraitSales(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTrait) {
      loadTraitSales(selectedTrait.trait_name);
    } else {
      setSelectedTraitSales([]);
    }
  }, [selectedTrait, loadTraitSales]);

  const sortedSales = useMemo(() => {
    const seen = new Set<string>();
    const dedupedSales = selectedTraitSales.filter(sale => {
      const key = `${sale.edition}-${sale.price_xch}-${sale.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sales = [...dedupedSales];
    switch (salesSortMode) {
      case 'price_asc':
        return sales.sort((a, b) => a.price_xch - b.price_xch);
      case 'price_desc':
        return sales.sort((a, b) => b.price_xch - a.price_xch);
      case 'rarity_asc':
        return sales.sort((a, b) => {
          const rankA = rarityData.get(a.edition) || 9999;
          const rankB = rarityData.get(b.edition) || 9999;
          return rankA - rankB;
        });
      case 'rarity_desc':
        return sales.sort((a, b) => {
          const rankA = rarityData.get(a.edition) || 0;
          const rankB = rarityData.get(b.edition) || 0;
          return rankB - rankA;
        });
      case 'time_desc':
        return sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case 'time_asc':
        return sales.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      default:
        return sales;
    }
  }, [selectedTraitSales, salesSortMode, rarityData]);

  const categories = useMemo(() => {
    const cats = new Set(traitStats.map(t => t.trait_category));
    return ['all', ...Array.from(cats).sort()];
  }, [traitStats]);

  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({
      value: cat,
      label: cat === 'all' ? 'All Categories' : capitalizeCategory(cat),
    }));
  }, [categories]);

  const filteredStats = useMemo(() => {
    let result = [...traitStats];

    if (categoryFilter !== 'all') {
      result = result.filter(
        t => t.trait_category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.trait_name.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const comparison = (aVal as number) < (bVal as number) ? -1 : (aVal as number) > (bVal as number) ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [traitStats, categoryFilter, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (trait: TraitStats) => {
    if (selectedTrait?.trait_name === trait.trait_name) {
      setSelectedTrait(null);
    } else {
      setSelectedTrait(trait);
      onTraitClick?.(trait.trait_name);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading) {
    return (
      <div className="trait-values-loading">
        <LoadingSpinner size={24} />
        <p>Loading trade data...</p>
      </div>
    );
  }

  if (error && traitStats.length === 0) {
    return (
      <div className="trait-values-error">
        <p>{error}</p>
        <button onClick={loadData} className="btn btn-primary retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="trait-values-container">
      {/* Filters */}
      <div className="trait-filters">
        <Dropdown
          id="category-filter"
          value={categoryFilter}
          options={categoryOptions}
          onChange={setCategoryFilter}
          className="category-select"
        />
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search attributes..."
            className="input trait-search"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="trait-summary">
        <span>{totalSalesCount} sales</span>
        <span className="divider">•</span>
        <span>{traitStats.length} attributes</span>
        <span className="divider">•</span>
        <span>Updated {formatRelativeTime(lastUpdated)}</span>
      </div>

      {/* Table */}
      <div className="trait-table-wrapper">
        <table className="trait-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('trait_name')}>
                Attribute{renderSortIndicator('trait_name')}
              </th>
              <th className="hide-mobile" onClick={() => handleSort('trait_category')}>
                Type{renderSortIndicator('trait_category')}
              </th>
              <th onClick={() => handleSort('total_sales')}>
                Sales{renderSortIndicator('total_sales')}
              </th>
              <th onClick={() => handleSort('average_xch')}>
                Avg{renderSortIndicator('average_xch')}
              </th>
              <th className="hide-mobile" onClick={() => handleSort('min_xch')}>
                Min{renderSortIndicator('min_xch')}
              </th>
              <th className="hide-mobile" onClick={() => handleSort('max_xch')}>
                Max{renderSortIndicator('max_xch')}
              </th>
              <th onClick={() => handleSort('last_trade')}>
                Last{renderSortIndicator('last_trade')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-results">
                  No attributes found matching your filters.
                </td>
              </tr>
            ) : (
              filteredStats.map((trait) => (
                <>
                  <tr
                    key={`${trait.trait_category}-${trait.trait_name}`}
                    onClick={() => handleRowClick(trait)}
                    className={selectedTrait?.trait_name === trait.trait_name ? 'selected' : ''}
                  >
                    <td className="trait-name">{trait.trait_name}</td>
                    <td className="trait-category hide-mobile">
                      {capitalizeCategory(trait.trait_category)}
                    </td>
                    <td>{trait.total_sales}</td>
                    <td className="price">{formatXCH(trait.average_xch)}</td>
                    <td className="price hide-mobile">{formatXCH(trait.min_xch)}</td>
                    <td className="price hide-mobile">{formatXCH(trait.max_xch)}</td>
                    <td className="last-trade">{formatRelativeTime(trait.last_trade)}</td>
                  </tr>
                  {selectedTrait?.trait_name === trait.trait_name && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <div className="trait-detail">
                          <div className="recent-sales">
                            <div className="sales-header">
                              <h4>Sales ({selectedTraitSales.length})</h4>
                              <div className="sales-sort-toggles">
                                <button
                                  className={`sort-toggle ${salesSortMode.startsWith('price') ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSalesSortMode(salesSortMode === 'price_asc' ? 'price_desc' : 'price_asc');
                                  }}
                                >
                                  💰{salesSortMode === 'price_desc' ? '↓' : '↑'}
                                </button>
                                <button
                                  className={`sort-toggle ${salesSortMode.startsWith('rarity') ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSalesSortMode(salesSortMode === 'rarity_asc' ? 'rarity_desc' : 'rarity_asc');
                                  }}
                                >
                                  👑{salesSortMode === 'rarity_desc' ? '↓' : '↑'}
                                </button>
                                <button
                                  className={`sort-toggle ${salesSortMode.startsWith('time') ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSalesSortMode(salesSortMode === 'time_desc' ? 'time_asc' : 'time_desc');
                                  }}
                                >
                                  🕐{salesSortMode === 'time_asc' ? '↑' : '↓'}
                                </button>
                              </div>
                            </div>
                            {loadingTraitSales ? (
                              <LoadingDots size={8} />
                            ) : selectedTraitSales.length === 0 ? (
                              <p className="no-sales">No sales data available.</p>
                            ) : (
                              <div className="sales-carousel">
                                {(() => {
                                  const minPrice = Math.min(...sortedSales.map(s => s.price_xch));
                                  const maxPrice = Math.max(...sortedSales.map(s => s.price_xch));
                                  const timestamps = sortedSales.map(s => new Date(s.timestamp).getTime());
                                  const lastTime = Math.max(...timestamps);
                                  const rarities = sortedSales.map(s => rarityData.get(s.edition) || 9999);
                                  const rarestRank = Math.min(...rarities);

                                  return sortedSales.map((sale, idx) => {
                                    const saleTime = new Date(sale.timestamp).getTime();
                                    const saleRarity = rarityData.get(sale.edition) || 9999;
                                    const isMin = sale.price_xch === minPrice;
                                    const isMax = sale.price_xch === maxPrice;
                                    const isLast = saleTime === lastTime;
                                    const isRarest = saleRarity === rarestRank;

                                    return (
                                      <div key={`${sale.edition}-${idx}`} className="sale-card">
                                        <div className="sale-badges">
                                          {isMin && <span className="sale-badge min">MIN</span>}
                                          {isMax && <span className="sale-badge max">MAX</span>}
                                          {isLast && <span className="sale-badge last">🕐</span>}
                                          {isRarest && <span className="sale-badge rare">👑</span>}
                                        </div>
                                        <div className="sale-image-wrapper">
                                          <img
                                            src={getIpfsUrl(sale.edition)}
                                            alt={`#${sale.edition}`}
                                            className="sale-preview-image"
                                            loading="lazy"
                                          />
                                        </div>
                                        <div className="sale-info">
                                          <span className="sale-edition">#{sale.edition}</span>
                                          <span className="sale-price-xch">{formatXCH(sale.price_xch)} XCH</span>
                                          <span className="sale-price-usd">${(sale.price_xch * xchPriceUsd).toFixed(2)}</span>
                                          <span className="sale-rank">👑 {rarityData.get(sale.edition) || '—'}</span>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                            {selectedTraitSales.length > 0 && !loadingTraitSales && (
                              <div className="avg-formula-row">
                                {(() => {
                                  const prices = selectedTraitSales.map(s => s.price_xch);
                                  const total = prices.reduce((sum, p) => sum + p, 0);
                                  const avg = total / prices.length;

                                  let priceStr;
                                  if (prices.length <= 4) {
                                    priceStr = prices.map(p => formatXCH(p)).join(' + ');
                                  } else {
                                    const first = prices.slice(0, 2).map(p => formatXCH(p)).join(' + ');
                                    const last = formatXCH(prices[prices.length - 1]);
                                    priceStr = `${first} + ... + ${last}`;
                                  }

                                  return (
                                    <span className="avg-formula">
                                      Avg: {priceStr} = {formatXCH(total)} ÷ {prices.length} = <strong>{formatXCH(avg)} XCH</strong>
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TraitValues;
```

### Update TraitValues.css - Add these styles:

```css
/* Add to TraitValues.css */

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.trait-search {
  padding-left: 36px !important;
}
```

---

## PHASE 5E: Replace AskBigPulp.tsx

**File:** `src/components/AskBigPulp.tsx`

### Key replacements:

1. `IonImg` → standard `<img>`
2. `IonIcon` + ionicons → lucide-react icons
3. `IonSpinner` → `LoadingSpinner` / `LoadingDots`

### IMPORTS - Replace:

```tsx
// DELETE these
import { IonImg, IonIcon, IonSpinner } from '@ionic/react';
import {
  chevronForward,
  chevronBack,
  diamond,
  statsChart,
  school,
  flame,
  pricetag
} from 'ionicons/icons';

// ADD these
import {
  ChevronRight,
  ChevronLeft,
  Diamond,
  BarChart3,
  GraduationCap,
  Flame,
  Tag
} from 'lucide-react';
import { LoadingSpinner, LoadingDots } from './ui/LoadingSpinner';
```

### ICON MAPPINGS:

| ionicons | lucide-react |
|----------|--------------|
| `chevronForward` | `ChevronRight` |
| `chevronBack` | `ChevronLeft` |
| `diamond` | `Diamond` |
| `statsChart` | `BarChart3` |
| `school` | `GraduationCap` |
| `flame` | `Flame` |
| `pricetag` | `Tag` |

### REPLACEMENTS IN JSX:

**Replace IonSpinner:**
```tsx
// OLD
<IonSpinner />

// NEW
<LoadingSpinner size={24} />

// OLD (for dots variant)
<IonSpinner name="dots" />

// NEW
<LoadingDots size={8} />
```

**Replace IonImg:**
```tsx
// OLD
<IonImg
  src={getNftImageUrl(sale.edition)}
  alt={sale.nftName || `#${sale.edition}`}
  className="sale-image"
/>

// NEW
<img
  src={getNftImageUrl(sale.edition)}
  alt={sale.nftName || `#${sale.edition}`}
  className="sale-image"
  loading="lazy"
/>
```

**Replace IonIcon:**
```tsx
// OLD
<IonIcon icon={statsChart} className="section-icon green" />

// NEW
<BarChart3 size={20} className="section-icon green" />

// OLD
<IonIcon icon={expandedSection === 'stats' ? chevronBack : chevronForward} className="section-chevron" />

// NEW
{expandedSection === 'stats' ? (
  <ChevronLeft size={18} className="section-chevron" />
) : (
  <ChevronRight size={18} className="section-chevron" />
)}
```

### Full file too long - Claude CLI should do find/replace operations:

1. Replace all `<IonImg` with `<img`
2. Replace all `IonIcon icon={chevronForward}` with `<ChevronRight size={18}`
3. Replace all `IonIcon icon={chevronBack}` with `<ChevronLeft size={18}`
4. Replace all `IonIcon icon={diamond}` with `<Diamond size={20}`
5. Replace all `IonIcon icon={statsChart}` with `<BarChart3 size={20}`
6. Replace all `IonIcon icon={school}` with `<GraduationCap size={20}`
7. Replace all `IonIcon icon={flame}` with `<Flame size={20}`
8. Replace all `IonIcon icon={pricetag}` with `<Tag size={20}`
9. Replace all `<IonSpinner />` with `<LoadingSpinner size={24} />`
10. Replace all `<IonSpinner name="dots" />` with `<LoadingDots size={8} />`
11. Remove closing `/>` from IonIcon and add closing tag where needed
12. Add `loading="lazy"` to all img tags

---

## PHASE 5F: Run npm uninstall

```bash
npm uninstall @ionic/react ionicons
```

---

## PHASE 5G: Verify Build

```bash
# Build must succeed
npm run build

# Check for remaining Ionic imports (should return nothing)
grep -r "@ionic" src/ --include="*.tsx" --include="*.ts"
grep -r "ionicons" src/ --include="*.tsx" --include="*.ts"

# Start dev server
npm run dev
```

---

## PHASE 5H: Visual Verification

Check at localhost:
1. [ ] Sign In button works and shows loading state
2. [ ] User menu opens and closes correctly
3. [ ] Notification settings toggles work
4. [ ] TraitValues search and dropdown work
5. [ ] AskBigPulp sections expand/collapse
6. [ ] All spinners appear correctly
7. [ ] No console errors

---

## SUMMARY

| File | Action |
|------|--------|
| main.tsx | Remove setupIonicReact + CSS import |
| SignInButton.tsx | Full rewrite - use native + lucide-react |
| NotificationSettings.tsx | Full rewrite - use Toggle + LoadingSpinner |
| TraitValues.tsx | Full rewrite - use Dropdown + LoadingSpinner |
| AskBigPulp.tsx | Replace IonImg/IonIcon/IonSpinner |
| package.json | npm uninstall @ionic/react ionicons |

---

## COMMIT MESSAGE

```
refactor: remove Ionic completely, use native components

PHASE 5 - IONIC REMOVAL:
- Remove @ionic/react and ionicons npm packages
- Remove setupIonicReact from main.tsx
- Rewrite SignInButton with native popover menu
- Rewrite NotificationSettings with Toggle component
- Rewrite TraitValues with Dropdown + LoadingSpinner
- Update AskBigPulp to use lucide-react + native img

All Ionic components replaced with existing alternatives:
- IonSpinner → LoadingSpinner/LoadingDots
- IonToggle → Toggle
- IonSelect → Dropdown
- IonButton → .btn classes
- ionicons → lucide-react

Bundle size reduced, no more Ionic CSS conflicts.
```

---

## POST-PHASE 5 STATE

After this phase, the codebase will have:
- ✅ ZERO Ionic dependencies
- ✅ Consistent component library (LoadingSpinner, Toggle, Dropdown)
- ✅ lucide-react for all icons
- ✅ Native HTML elements where appropriate
- ✅ Smaller bundle size
- ✅ No more Ionic CSS overrides fighting theme.css
