/**
 * ProfileTabs Component (SPEC 15)
 *
 * Navigation tabs for the unified profile page.
 */

import { Home, ShoppingBag, Trophy, BarChart3 } from 'lucide-react';

export type ProfileTab = 'overview' | 'collection' | 'achievements' | 'stats';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  tabStyle?: 'default' | 'pills' | 'underline';
  collectionCount?: number;
  achievementCount?: { completed: number; total: number };
}

const TABS: { id: ProfileTab; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'collection', label: 'Collection', icon: ShoppingBag },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export function ProfileTabs({
  activeTab,
  onTabChange,
  tabStyle = 'default',
  collectionCount,
  achievementCount,
}: ProfileTabsProps) {
  return (
    <nav className={`profile-tabs tabs-${tabStyle}`}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        let badge = null;

        if (tab.id === 'collection' && collectionCount !== undefined && collectionCount > 0) {
          badge = <span className="tab-badge">{collectionCount}</span>;
        }
        if (tab.id === 'achievements' && achievementCount) {
          badge = <span className="tab-badge">{achievementCount.completed}/{achievementCount.total}</span>;
        }

        return (
          <button
            key={tab.id}
            className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={18} className="profile-tab-icon" />
            <span>{tab.label}</span>
            {badge}
          </button>
        );
      })}

      <style>{`
        .tab-badge {
          padding: 2px 8px;
          background: var(--color-white-10);
          border-radius: 10px;
          font-size: 0.7rem;
          margin-left: 4px;
        }

        .profile-tab.active .tab-badge {
          background: var(--color-primary-30);
        }
      `}</style>
    </nav>
  );
}
