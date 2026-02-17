import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryProvider } from '@/providers/QueryProvider';
import { DeviceOrientationProvider } from '@/contexts/DeviceOrientationContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { GalleryProvider } from '@/contexts/GalleryContext';
import { MediaProvider } from '@/contexts/MediaContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { HapticProvider } from '@/systems/haptics';
import { PWAProvider, InstallBanner, OfflineIndicator } from '@/systems/pwa';
import { AuthProvider } from '@/contexts/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { LeaderboardProvider } from '@/contexts/LeaderboardContext';
import { GuildProvider } from '@/contexts/GuildContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { ToastContainer } from '@/components/ui/Toast';
import { ProfileGuard } from '@/components/auth/ProfileGuard';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import { AchievementsProvider } from '@/contexts/AchievementsContext';
import { PreloadProvider } from '@/components/preload/PreloadProvider';
import { SageWalletProvider } from '@/sage-wallet';
import { MintProvider } from '@/contexts/MintContext';
import { GeneratorProvider } from '@/contexts/GeneratorContext';
import { SalesProvider } from '@/providers/SalesProvider';
import { GlobalVideoPlayer } from '@/components/media/video/GlobalVideoPlayer';
import StartupSequence from '@/components/StartupSequence';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GameLoading } from '@/components/games/GameLoading';
import { GameErrorBoundary } from '@/components/games/GameError';
// Lazy load all pages for code splitting
const Gallery = lazy(() => import('./pages/Gallery'));
const Treasury = lazy(() => import('./pages/Treasury'));
const BigPulp = lazy(() => import('./pages/BigPulp'));
// Chat pages
const ChatHub = lazy(() => import('./pages/ChatHub'));
const WhaleChat = lazy(() => import('./pages/GatedChat')); // Whale chat (42+ NFTs) - formerly GatedChat
const HolderChat = lazy(() => import('./pages/HolderChat')); // Holder chat (1+ NFT)
const Generator = lazy(() => import('./pages/Generator'));
const GamesHub = lazy(() => import('./pages/GamesHub'));
const Media = lazy(() => import('./pages/Media'));
const Settings = lazy(() => import('./pages/Settings'));

// Auth
const Account = lazy(() => import('./pages/Account'));
const Profile = lazy(() => import('./pages/Profile'));

// Social
// Friends and Achievements pages removed - now use lightboxes in Account page
const Guild = lazy(() => import('./pages/Guild'));
const Shop = lazy(() => import('./pages/Shop'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Drawer = lazy(() => import('./pages/Drawer'));
const RuleBuilder = lazy(() => import('./pages/RuleBuilder'));

// Games
const GameVoting = lazy(() => import('./pages/GameVoting'));
const GameDashboard = lazy(() => import('./pages/GameDashboard'));
const GameBattles = lazy(() => import('./pages/GameBattles'));
const GameLeaderboard = lazy(() => import('./pages/GameLeaderboard'));

const BrickByBrick = lazy(() => import('./pages/BrickByBrick'));
const MemoryMatch = lazy(() => import('./pages/MemoryMatch'));
const OrangePong = lazy(() => import('./pages/OrangePong'));
const WojakRunner = lazy(() => import('./pages/WojakRunner'));
const OrangeJuggle = lazy(() => import('./pages/OrangeJuggle'));
const KnifeGame = lazy(() => import('./pages/KnifeGame'));
const BlockPuzzle = lazy(() => import('./pages/BlockPuzzle'));
const FlappyOrange = lazy(() => import('./pages/FlappyOrange'));
const CitrusDrop = lazy(() => import('./pages/CitrusDrop'));
const OrangeSnake = lazy(() => import('./pages/OrangeSnake'));
const BrickBreaker = lazy(() => import('./pages/BrickBreaker'));
const WojakWhack = lazy(() => import('./pages/WojakWhack'));

// Skip boot sequence in development for faster testing
const SKIP_BOOT_IN_DEV = true;

// Check if running on localhost (for testing with production builds)
const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// Check if boot sequence was already shown this session (e.g., before OAuth redirect)
const hasSeenBoot = () => {
  try {
    return sessionStorage.getItem('wojak_boot_complete') === 'true';
  } catch {
    return false;
  }
};

// Check if user has permanently disabled boot sequence in settings
const hasSkipBootSetting = () => {
  try {
    const stored = localStorage.getItem('wojak-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.app?.skipBootSequence === true;
    }
  } catch { /* intentionally empty */ }
  return false;
};

const markBootComplete = () => {
  try {
    sessionStorage.setItem('wojak_boot_complete', 'true');
  } catch {
    // Ignore storage errors
  }
};

// Routes that should be publicly accessible without boot sequence
const PUBLIC_ROUTES = ['/drawer/', '/profile/'];

// Inner app component with access to router
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current route is public (shareable links that skip boot)
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route)
  );

  // Skip boot if: dev mode, localhost, user already saw it, public route, or user disabled it in settings
  const [isStartupComplete, setIsStartupComplete] = useState(
    (import.meta.env.DEV && SKIP_BOOT_IN_DEV) || (SKIP_BOOT_IN_DEV && isLocalhost()) || hasSeenBoot() || isPublicRoute || hasSkipBootSetting()
  );

  const handleStartupComplete = () => {
    // Mark boot as complete for this session
    markBootComplete();
    // Navigate to Gallery page after boot sequence
    navigate('/gallery', { replace: true });
    // Small delay ensures navigation completes before content becomes visible
    setTimeout(() => {
      setIsStartupComplete(true);
    }, 50);
  };

  // Show content if: startup complete OR localhost testing
  const showContent = import.meta.env.DEV || isLocalhost() || isStartupComplete;

  return (
    <PreloadProvider>
      <GalleryProvider>
        <LayoutProvider>
          {/* Boot Sequence - shows until complete, then navigates to Gallery */}
          {/* Skip boot for public routes (drawer, profile) so shareable links work */}
          {!isStartupComplete && !isPublicRoute && (
            <StartupSequence onComplete={handleStartupComplete} />
          )}

          {/* Global Video Player - rendered outside content wrapper for proper z-index */}
          {showContent && <GlobalVideoPlayer />}

          {/* Subtle noise texture overlay */}
          {showContent && <div className="noise-overlay" />}

          {/* Main App Content */}
          <div
            style={{
              opacity: showContent ? 1 : 0,
              pointerEvents: showContent ? 'auto' : 'none',
              transition: 'opacity 0.3s ease-in',
              visibility: showContent ? 'visible' : 'hidden',
              flex: 1,
              minHeight: 0,
            }}
          >
            <ErrorBoundary>
              <Routes>
                {/* All routes with AppLayout (header, nav, etc.) */}
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Navigate to="/gallery" replace />} />
                  <Route
                    path="gallery"
                    element={
                      <Suspense fallback={<PageSkeleton type="gallery" />}>
                        <Gallery />
                      </Suspense>
                    }
                  />
                  <Route
                    path="gallery/:nftId"
                    element={
                      <Suspense fallback={<PageSkeleton type="detail" />}>
                        <Gallery />
                      </Suspense>
                    }
                  />
                  <Route
                    path="treasury"
                    element={
                      <Suspense fallback={<PageSkeleton type="treasury" />}>
                        <Treasury />
                      </Suspense>
                    }
                  />
                  <Route
                    path="bigpulp"
                    element={
                      <Suspense fallback={<PageSkeleton type="bigpulp" />}>
                        <BigPulp />
                      </Suspense>
                    }
                  />
                  {/* Chat routes */}
                  <Route
                    path="chat"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <ChatHub />
                      </Suspense>
                    }
                  />
                  <Route
                    path="chat/whale"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <WhaleChat />
                      </Suspense>
                    }
                  />
                  <Route
                    path="chat/holder"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <HolderChat />
                      </Suspense>
                    }
                  />
                  <Route
                    path="generator"
                    element={
                      <GeneratorProvider>
                        <Suspense fallback={<PageSkeleton type="generator" />}>
                          <Generator />
                        </Suspense>
                      </GeneratorProvider>
                    }
                  />
                  <Route
                    path="rule-builder"
                    element={
                      <Suspense fallback={<PageSkeleton type="generator" />}>
                        <RuleBuilder />
                      </Suspense>
                    }
                  />
                  <Route
                    path="games"
                    element={
                      <Suspense fallback={<PageSkeleton type="media" />}>
                        <GamesHub />
                      </Suspense>
                    }
                  />
                  <Route
                    path="media"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<PageSkeleton type="media" />}>
                          <Media />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="settings/*"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Settings />
                      </Suspense>
                    }
                  />
                  <Route
                    path="account"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Account />
                      </Suspense>
                    }
                  />
                  <Route
                    path="profile/:userId"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Profile />
                      </Suspense>
                    }
                  />
                  {/* Redirect /friends to /account - Friends feature now uses lightbox */}
                  <Route
                    path="friends"
                    element={<Navigate to="/account" replace />}
                  />
                  <Route
                    path="guild"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Guild />
                      </Suspense>
                    }
                  />
                  <Route
                    path="shop"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Shop />
                      </Suspense>
                    }
                  />
                  <Route
                    path="leaderboard"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Leaderboard />
                      </Suspense>
                    }
                  />
                  {/* Redirect /achievements to /account - Achievements feature now uses lightbox */}
                  <Route
                    path="achievements"
                    element={<Navigate to="/account" replace />}
                  />
                  {/* Admin dashboard — internal, not in navigation */}
                  <Route
                    path="admin"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Admin />
                      </Suspense>
                    }
                  />
                  <Route
                    path="drawer/:userId"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <Drawer />
                      </Suspense>
                    }
                  />
                  {/* Wojak Swipe */}
                  <Route
                    path="swipe"
                    element={
                      <Suspense fallback={<PageSkeleton type="media" />}>
                        <GameVoting />
                      </Suspense>
                    }
                  />
                  <Route
                    path="swipe/dashboard"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <GameDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="swipe/battles"
                    element={
                      <Suspense fallback={<PageSkeleton type="media" />}>
                        <GameBattles />
                      </Suspense>
                    }
                  />
                  <Route
                    path="swipe/leaderboard"
                    element={
                      <Suspense fallback={<PageSkeleton type="settings" />}>
                        <GameLeaderboard />
                      </Suspense>
                    }
                  />
                  {/* Redirects from old routes */}
                  <Route path="your-wojak" element={<Navigate to="/swipe" replace />} />
                  <Route path="your-wojak/dashboard" element={<Navigate to="/swipe/dashboard" replace />} />
                  <Route path="your-wojak/battles" element={<Navigate to="/swipe/battles" replace />} />
                  <Route path="your-wojak/leaderboard" element={<Navigate to="/swipe/leaderboard" replace />} />
                  {/* Game Routes - all under /games/* for cleaner URLs */}
                  <Route
                    path="games/stack"
                    element={
                      <GameErrorBoundary gameName="Brick by Brick">
                        <Suspense fallback={<GameLoading gameName="Brick by Brick" />}>
                          <BrickByBrick />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/memory"
                    element={
                      <GameErrorBoundary gameName="Memory Match">
                        <Suspense fallback={<GameLoading gameName="Memory Match" />}>
                          <MemoryMatch />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/pong"
                    element={
                      <GameErrorBoundary gameName="Orange Pong">
                        <Suspense fallback={<GameLoading gameName="Orange Pong" />}>
                          <OrangePong />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/runner"
                    element={
                      <GameErrorBoundary gameName="Wojak Runner">
                        <Suspense fallback={<GameLoading gameName="Wojak Runner" />}>
                          <WojakRunner />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/juggle"
                    element={
                      <GameErrorBoundary gameName="Orange Juggle">
                        <Suspense fallback={<GameLoading gameName="Orange Juggle" />}>
                          <OrangeJuggle />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/knife"
                    element={
                      <GameErrorBoundary gameName="Knife Game">
                        <Suspense fallback={<GameLoading gameName="Knife Game" />}>
                          <KnifeGame />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/block-puzzle"
                    element={
                      <GameErrorBoundary gameName="Block Puzzle">
                        <Suspense fallback={<GameLoading gameName="Block Puzzle" />}>
                          <BlockPuzzle />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/flappy"
                    element={
                      <GameErrorBoundary gameName="Flappy Orange">
                        <Suspense fallback={<GameLoading gameName="Flappy Orange" />}>
                          <FlappyOrange />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/citrus-drop"
                    element={
                      <GameErrorBoundary gameName="Citrus Drop">
                        <Suspense fallback={<GameLoading gameName="Citrus Drop" />}>
                          <CitrusDrop />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/snake"
                    element={
                      <GameErrorBoundary gameName="Orange Snake">
                        <Suspense fallback={<GameLoading gameName="Orange Snake" />}>
                          <OrangeSnake />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/brick-breaker"
                    element={
                      <GameErrorBoundary gameName="Brick Breaker">
                        <Suspense fallback={<GameLoading gameName="Brick Breaker" />}>
                          <BrickBreaker />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  <Route
                    path="games/whack"
                    element={
                      <GameErrorBoundary gameName="Wojak Whack">
                        <Suspense fallback={<GameLoading gameName="Wojak Whack" />}>
                          <WojakWhack />
                        </Suspense>
                      </GameErrorBoundary>
                    }
                  />
                  {/* Legacy game routes - redirect to new paths */}
                  <Route path="media/games/stack" element={<Navigate to="/games/stack" replace />} />
                  <Route path="media/games/memory" element={<Navigate to="/games/memory" replace />} />
                  <Route path="media/games/pong" element={<Navigate to="/games/pong" replace />} />
                  <Route path="media/games/runner" element={<Navigate to="/games/runner" replace />} />
                  <Route path="media/games/juggle" element={<Navigate to="/games/juggle" replace />} />
                  <Route path="media/games/knife" element={<Navigate to="/games/knife" replace />} />
                  <Route path="media/games/*" element={<Navigate to="/games" replace />} />
                </Route>

                {/* Legacy routes - redirect to gallery */}
                <Route path="onboarding" element={<Navigate to="/gallery" replace />} />
                <Route path="landing" element={<Navigate to="/gallery" replace />} />
              </Routes>
            </ErrorBoundary>
            <ProfileGuard />
            <ToastContainer />
          </div>
        </LayoutProvider>
      </GalleryProvider>
    </PreloadProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
    <QueryProvider>
      <SalesProvider>
        <DeviceOrientationProvider>
        <SettingsProvider>
          <ToastProvider>
            <AudioProvider>
            <HapticProvider>
            <PWAProvider>
            <MediaProvider>
            <AuthProvider>
            <CurrencyProvider>
            <LeaderboardProvider>
            <GuildProvider>
            <NotificationProvider>
            <BrowserRouter>
              <SageWalletProvider
                config={{
                  metadata: {
                    name: 'Wojak.ink',
                    description: 'Wojak Farmers Plot NFT Explorer',
                    url: 'https://wojak.ink',
                    icons: ['https://wojak.ink/assets/icons/Wojak_logo.png'],
                  },
                }}
              >
                <MintProvider>
                <UserProfileProvider>
                  <FriendsProvider>
                    <AchievementsProvider>
                      <OfflineIndicator />
                      <AppContent />
                      <InstallBanner position="bottom" />
                    </AchievementsProvider>
                  </FriendsProvider>
                </UserProfileProvider>
                </MintProvider>
              </SageWalletProvider>
            </BrowserRouter>
            </NotificationProvider>
            </GuildProvider>
            </LeaderboardProvider>
            </CurrencyProvider>
            </AuthProvider>
            </MediaProvider>
            </PWAProvider>
            </HapticProvider>
            </AudioProvider>
          </ToastProvider>
        </SettingsProvider>
        </DeviceOrientationProvider>
      </SalesProvider>
    </QueryProvider>
    </HelmetProvider>
  );
}

export default App;
