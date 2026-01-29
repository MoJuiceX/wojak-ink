/**
 * Notification Context
 *
 * Manages PWA push notification subscriptions and preferences.
 * Demo mode uses localStorage; production will use backend API.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type {
  NotificationPreferences,
  PushSubscriptionData,
} from '../types/notification';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notification';

// Storage keys
const NOTIFICATION_PREFS_KEY = 'wojak_notification_prefs';
const PUSH_SUBSCRIPTION_KEY = 'wojak_push_subscription';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface NotificationContextType {
  // State
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  preferences: NotificationPreferences;
  isLoading: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;

  // Test notification (for development)
  sendTestNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check if push notifications are supported
  const isSupported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Check if already subscribed
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // Store subscription data
      if (subscription) {
        localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription.toJSON()));
      }
    } catch (err) {
      console.error('Error checking push subscription:', err);
      setIsSubscribed(false);
    }
  };

  // Load preferences from localStorage
  const loadPreferences = (userId: string) => {
    try {
      const stored = localStorage.getItem(`${NOTIFICATION_PREFS_KEY}_${userId}`);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      }
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    }
  };

  // Initialize on mount
  useEffect(() => {
    queueMicrotask(() => {
      if (isSupported) {
        setPermission(Notification.permission);
        checkSubscription();
      }
      setIsLoading(false);
    });
  }, [isSupported]);

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      queueMicrotask(() => loadPreferences(user.id));
    } else {
      queueMicrotask(() => setPreferences(DEFAULT_NOTIFICATION_PREFERENCES));
    }

  }, [user]);

  // Save preferences to localStorage
  const savePreferences = (userId: string, prefs: NotificationPreferences) => {
    try {
      localStorage.setItem(`${NOTIFICATION_PREFS_KEY}_${userId}`, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // Create new subscription if none exists and we have VAPID key
      if (!subscription && VAPID_PUBLIC_KEY) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          });
        } catch (subError) {
          console.error('Error creating push subscription:', subError);
          // Still mark as subscribed for demo mode (local notifications)
        }
      }

      // Store subscription data
      if (subscription) {
        const subData: PushSubscriptionData = subscription.toJSON() as PushSubscriptionData;
        localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subData));

        // In production, send to server:
        // await fetch('/api/notifications/subscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ subscription: subData }),
        // });
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }, [isSupported, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // In production, notify server:
        // await fetch('/api/notifications/unsubscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ endpoint: subscription.endpoint }),
        // });
      }

      localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }, [isSupported]);

  // Update notification preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      const newPrefs = { ...preferences, ...prefs };
      setPreferences(newPrefs);

      if (user) {
        savePreferences(user.id, newPrefs);

        // In production, sync to server:
        // await fetch('/api/notifications/preferences', {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ preferences: newPrefs }),
        // });
      }
    },
    [user, preferences]
  );

  // Send a test notification (for development/testing)
  const sendTestNotification = useCallback(() => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot send test notification: not subscribed or permission denied');
      return;
    }

    // Use the Notification API directly for testing
    const notification = new Notification('Test Notification', {
      body: 'This is a test notification from Wojak Games!',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge.png',
      tag: 'test',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, [isSupported, permission]);

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Hook to check if user has enabled specific notification type
// eslint-disable-next-line react-refresh/only-export-components
export const useNotificationEnabled = (type: keyof NotificationPreferences): boolean => {
  const { isSubscribed, preferences } = useNotifications();
  return isSubscribed && preferences[type];
};
