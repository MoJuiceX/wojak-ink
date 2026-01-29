import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
    (window.navigator as any).standalone === true
  );

  // Check if installable (prompt event captured)
  const isInstallable = !!installPromptEvent && !isInstalled && !isStandalone;

  // Determine if we should show install banner
  const showInstallBanner = (() => {
    if (!isInstallable) return false;
    if (typeof localStorage === 'undefined') return false;

    // Check if user dismissed recently (24 hours)
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) return false;
    }

    // Check if user has played enough games (engagement threshold)
    const gamesPlayed = parseInt(localStorage.getItem('games-played') || '0');
    if (gamesPlayed < 3) return false; // Wait until they've played 3 games

    return true;
  })();

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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pwa-installed', 'true');
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('pwa-installed') === 'true' || isStandalone) {
        setIsInstalled(true);
      }
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
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

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
};
