/**
 * Unified Profile Page (SPEC 15)
 *
 * Premium profile page with tabs: Overview, Collection, Achievements, Stats.
 * Supports viewing any user's profile (public) or your own (with edit options).
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { useLayout } from '@/hooks/useLayout';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import {
  ProfileHeader,
  ProfileTabs,
  OverviewTab,
  CollectionTab,
  AchievementsTab,
  StatsTab,
} from '@/components/Profile';
import type { ProfileTab } from '@/components/Profile';

import '@/styles/profile.css';

// Profile data structure from API
interface ProfileData {
  // User basics
  userId: string;
  displayName: string;
  bio?: string;
  title?: string;
  xHandle?: string;
  discord?: string;
  location?: string;
  createdAt: string;

  // Avatar & customization
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    nftId?: string;
  };
  frame?: {
    id: string;
    css_class: string;
  };
  nameEffect?: {
    id: string;
    css_class: string;
  };
  emojiRing?: Record<string, string>;
  customization?: {
    banner_style?: string;
    username_color?: string;
    username_style?: string;
    avatar_glow?: string;
    avatar_size?: string;
  };

  // BigPulp
  bigpulp?: {
    hat: string | null;
    mood: string;
    accessory: string | null;
  };

  // Stats
  level: number;
  oranges: number;
  gems: number;

  // Overview stats
  overviewStats: {
    level: number;
    itemsOwned: number;
    achievementsCompleted: number;
    achievementsTotal: number;
    currentStreak: number;
    bestRank: number | null;
  };

  // Detailed stats
  detailedStats: {
    memberSince: string;
    currentStreak: number;
    longestStreak: number;
    profileViews?: number;
    level: number;
    lifetimeOranges: number;
    totalSpent: number;
    currentBalance: number;
    itemsOwned: number;
    gems: number;
    gamesPlayed: number;
    totalScore: number;
    bestGame?: string;
    highestRank?: number;
    firstPlaceCount: number;
    friendsCount: number;
    guildName?: string;
    giftsSent: number;
    giftsReceived: number;
    challengesWon: number;
  };

  // Featured items
  featured?: Array<{
    id: string;
    type: 'item' | 'emoji' | 'achievement' | 'score';
    name: string;
    icon: string;
  }>;

  // Recent activity
  activities?: Array<{
    id: string;
    type: 'achievement' | 'purchase' | 'leaderboard' | 'streak';
    text: string;
    icon: string;
    timestamp: string;
  }>;

  // Game scores
  gameScores?: Array<{
    gameId: string;
    gameName: string;
    score: number;
    rank: number | null;
  }>;

  // Collection items
  collectionItems: Array<{
    id: string;
    name: string;
    category: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon?: string;
    css_class?: string;
  }>;

  // Achievements
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'gameplay' | 'collection' | 'social' | 'milestone';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    reward: { oranges: number; gems: number };
    isSecret?: boolean;
  }>;
  achievementProgress: Record<string, {
    achievementId: string;
    progress: number;
    target: number;
    completed: boolean;
    completedAt?: string;
    claimed: boolean;
  }>;
}

// Generate mock profile data for development
function generateMockProfile(userId: string): ProfileData {
  return {
    userId,
    displayName: 'TangGangKing',
    bio: 'Collecting rare Wojaks since 2024. Tang Gang for life!',
    title: 'Legendary Collector',
    xHandle: 'tangfarmerjake',
    discord: 'TangKing#1234',
    location: 'Citrus Grove',
    createdAt: '2024-01-15T00:00:00Z',
    avatar: {
      type: 'emoji',
      value: '🍊',
    },
    frame: {
      id: 'legendary-flame',
      css_class: 'frame-legendary-flame',
    },
    emojiRing: {
      slot1: '🔥',
      slot2: '💎',
      slot3: '🏆',
      slot4: '⭐',
    },
    customization: {
      banner_style: 'gradient-sunset',
      username_color: 'gold',
      avatar_glow: 'legendary',
      avatar_size: 'large',
    },
    bigpulp: {
      hat: 'crown',
      mood: 'happy',
      accessory: 'sunglasses',
    },
    level: 42,
    oranges: 15000,
    gems: 125,
    overviewStats: {
      level: 42,
      itemsOwned: 28,
      achievementsCompleted: 15,
      achievementsTotal: 50,
      currentStreak: 7,
      bestRank: 3,
    },
    detailedStats: {
      memberSince: '2024-01-15T00:00:00Z',
      currentStreak: 7,
      longestStreak: 21,
      profileViews: 1234,
      level: 42,
      lifetimeOranges: 45000,
      totalSpent: 30000,
      currentBalance: 15000,
      itemsOwned: 28,
      gems: 125,
      gamesPlayed: 156,
      totalScore: 89500,
      bestGame: 'Flappy Orange',
      highestRank: 3,
      firstPlaceCount: 5,
      friendsCount: 12,
      guildName: 'Tang Gang Elite',
      giftsSent: 8,
      giftsReceived: 15,
      challengesWon: 23,
    },
    featured: [
      { id: '1', type: 'achievement', name: 'First Place!', icon: '🏆' },
      { id: '2', type: 'item', name: 'Legendary Frame', icon: '🖼️' },
      { id: '3', type: 'score', name: 'Flappy High Score', icon: '🎮' },
    ],
    activities: [
      { id: '1', type: 'achievement', text: 'Unlocked "Master Collector"', icon: '🏆', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: '2', type: 'leaderboard', text: 'Reached #3 in Flappy Orange', icon: '📈', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: '3', type: 'purchase', text: 'Purchased Legendary Frame', icon: '🛒', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: '4', type: 'streak', text: 'Login streak: 7 days!', icon: '🔥', timestamp: new Date(Date.now() - 259200000).toISOString() },
    ],
    gameScores: [
      { gameId: 'flappy', gameName: 'Flappy Orange', score: 127, rank: 3 },
      { gameId: 'stack', gameName: 'Brick by Brick', score: 45, rank: 12 },
      { gameId: 'memory', gameName: 'Memory Match', score: 890, rank: 5 },
      { gameId: 'runner', gameName: 'Wojak Runner', score: 3400, rank: 8 },
    ],
    collectionItems: [
      { id: '1', name: 'Fire Emoji', category: 'emoji_badge', rarity: 'rare', icon: '🔥' },
      { id: '2', name: 'Crown Badge', category: 'emoji_badge', rarity: 'legendary', icon: '👑' },
      { id: '3', name: 'Legendary Frame', category: 'frame', rarity: 'legendary', icon: '🖼️' },
      { id: '4', name: 'Tang Gang Title', category: 'title', rarity: 'epic', icon: '📜' },
      { id: '5', name: 'Sunset Background', category: 'background', rarity: 'rare', icon: '🌅' },
      { id: '6', name: 'Rainbow Glow', category: 'name_effect', rarity: 'epic', icon: '✨' },
      { id: '7', name: 'Party Hat', category: 'bigpulp_hat', rarity: 'uncommon', icon: '🎩' },
      { id: '8', name: 'Happy Mood', category: 'bigpulp_mood', rarity: 'common', icon: '😊' },
    ],
    achievements: [
      { id: 'first-game', name: 'First Steps', description: 'Play your first game', icon: '🎮', category: 'gameplay', rarity: 'common', reward: { oranges: 50, gems: 0 } },
      { id: 'collector-10', name: 'Budding Collector', description: 'Own 10 items', icon: '📦', category: 'collection', rarity: 'uncommon', reward: { oranges: 100, gems: 1 } },
      { id: 'first-place', name: 'Champion', description: 'Get first place on any leaderboard', icon: '🏆', category: 'gameplay', rarity: 'epic', reward: { oranges: 500, gems: 5 } },
      { id: 'legendary-item', name: 'Legendary Find', description: 'Own a legendary item', icon: '⭐', category: 'collection', rarity: 'legendary', reward: { oranges: 1000, gems: 10 } },
      { id: 'week-streak', name: 'Dedicated', description: 'Login 7 days in a row', icon: '🔥', category: 'milestone', rarity: 'rare', reward: { oranges: 200, gems: 3 } },
      { id: 'make-friend', name: 'Social Butterfly', description: 'Add your first friend', icon: '👋', category: 'social', rarity: 'common', reward: { oranges: 50, gems: 0 } },
      { id: 'secret-find', name: '???', description: 'A secret achievement', icon: '❓', category: 'milestone', rarity: 'legendary', reward: { oranges: 2000, gems: 20 }, isSecret: true },
    ],
    achievementProgress: {
      'first-game': { achievementId: 'first-game', progress: 1, target: 1, completed: true, completedAt: '2024-01-20T12:00:00Z', claimed: true },
      'collector-10': { achievementId: 'collector-10', progress: 10, target: 10, completed: true, completedAt: '2024-02-15T14:30:00Z', claimed: true },
      'first-place': { achievementId: 'first-place', progress: 1, target: 1, completed: true, completedAt: '2024-03-01T18:00:00Z', claimed: true },
      'legendary-item': { achievementId: 'legendary-item', progress: 1, target: 1, completed: true, completedAt: '2024-03-10T10:00:00Z', claimed: true },
      'week-streak': { achievementId: 'week-streak', progress: 7, target: 7, completed: true, completedAt: '2024-01-22T00:00:00Z', claimed: true },
      'make-friend': { achievementId: 'make-friend', progress: 1, target: 1, completed: true, completedAt: '2024-01-18T16:00:00Z', claimed: true },
      'secret-find': { achievementId: 'secret-find', progress: 0, target: 1, completed: false, claimed: false },
    },
  };
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contentPadding, isDesktop } = useLayout();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get active tab from URL or default to 'overview'
  const activeTab = (searchParams.get('tab') as ProfileTab) || 'overview';

  const setActiveTab = (tab: ProfileTab) => {
    setSearchParams({ tab });
  };

  const isOwnProfile = currentUser?.id === userId;

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/profile/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Profile not found');
          }
          throw new Error('Failed to load profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        // Use mock data for development
        console.warn('Using mock profile data:', err);
        setProfile(generateMockProfile(userId));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  // Edit profile — not yet implemented
  const handleEditProfile = () => {
    // No-op until profile editing is built
  };

  // Handle share profile
  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile/${userId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.displayName}'s Profile`,
          text: `Check out ${profile?.displayName}'s profile on Wojak.ink!`,
          url,
        });
      } catch {
        // User cancelled or share failed, copy to clipboard
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="profile-loading">
          <Loader2 className="spin" size={32} />
          <p>Loading profile...</p>
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <PageTransition>
        <div className="profile-error">
          <span className="error-icon">😢</span>
          <h2>Profile Not Found</h2>
          <p>{error || 'This user does not exist'}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageSEO
        title="Profile"
        description="Your Wojak profile — view your minted NFTs, battle stats, and achievements."
        path="/profile"
      />
      <div className="profile-page">
        <div
          className="profile-container"
          style={{
            padding: contentPadding,
            maxWidth: isDesktop ? '1000px' : undefined,
            margin: '0 auto',
          }}
        >
          {/* Profile Header */}
          <ProfileHeader
            userId={profile.userId}
            username={profile.displayName}
            title={profile.title}
            bio={profile.bio}
            avatar={profile.avatar}
            frame={profile.frame}
            nameEffect={profile.nameEffect}
            emojiRing={profile.emojiRing}
            xHandle={profile.xHandle}
            discord={profile.discord}
            location={profile.location}
            bigpulp={profile.bigpulp}
            customization={profile.customization}
            isOwnProfile={isOwnProfile}
            onEdit={handleEditProfile}
            onShare={handleShareProfile}
          />

          {/* Tab Navigation */}
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabStyle="pills"
            collectionCount={profile.collectionItems.length}
            achievementCount={{
              completed: profile.overviewStats.achievementsCompleted,
              total: profile.overviewStats.achievementsTotal,
            }}
          />

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                stats={profile.overviewStats}
                featured={profile.featured}
                activities={profile.activities}
                gameScores={profile.gameScores}
                showActivity={true}
                showScores={true}
              />
            )}

            {activeTab === 'collection' && (
              <CollectionTab
                items={profile.collectionItems}
                totalSpent={profile.detailedStats.totalSpent}
              />
            )}

            {activeTab === 'achievements' && (
              <AchievementsTab
                achievements={profile.achievements}
                progress={profile.achievementProgress}
                showLocked={true}
              />
            )}

            {activeTab === 'stats' && (
              <StatsTab stats={profile.detailedStats} />
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
