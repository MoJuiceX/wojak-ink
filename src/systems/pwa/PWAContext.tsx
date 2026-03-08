import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { safeStorage } from '@/utils/safeStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  // State
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isStandalone: boolean;

  // Actions
  promptInstall: () => Promise<boolean>;
  dismissInstallPrompt: () => void;

  // For UI
  showInstallBanner: boolean;
  installDismissedAt: number | null;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [installDismissedAt, setInstallDismissedAt] = useState<number | null>(null);

  // Check if running as installed PWA
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );

  // Check if installable (prompt event captured)
  const isInstallable = !!installPromptEvent && !isInstalled && !isStandalone;

  // Track whether to show install banner using state
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Determine if we should show install banner (run in effect to avoid impure function during render)
  useEffect(() => {
    queueMicrotask(() => {
      if (!isInstallable) {
        setShowInstallBanner(false);
        return;
      }
      // Check if user dismissed recently (24 hours)
      const dismissedTime = safeStorage.getItem('pwa-install-dismissed');
      if (dismissedTime) {
        const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
        if (hoursSinceDismissed < 24) {
          setShowInstallBanner(false);
          return;
        }
      }

      // Check if user has played enough games (engagement threshold)
      const gamesPlayed = parseInt(safeStorage.getItem('games-played') || '0');
      if (gamesPlayed < 3) {
        setShowInstallBanner(false);
        return;
      }

      setShowInstallBanner(true);
    });
  }, [isInstallable]);

  // Capture the install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);

      // Track installation
      safeStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (safeStorage.getItem('pwa-installed') === 'true' || isStandalone) {
      queueMicrotask(() => setIsInstalled(true));
    }

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Trigger the install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent) {
      return false;
    }

    try {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;


      if (outcome === 'accepted') {
        setIsInstalled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [installPromptEvent]);

  // Dismiss the install prompt (for 24 hours)
  const dismissInstallPrompt = useCallback(() => {
    safeStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setInstallDismissedAt(Date.now());
  }, []);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isOnline,
        isStandalone,
        promptInstall,
        dismissInstallPrompt,
        showInstallBanner,
        installDismissedAt
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
};
