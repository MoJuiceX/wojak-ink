/* eslint-disable react-refresh/only-export-components */
/**
 * DeviceOrientationContext
 *
 * Provides device tilt values to all components efficiently.
 * Only one event listener for the entire app.
 *
 * On mobile: uses gyroscope/accelerometer
 * On desktop: uses mouse position for similar effect
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface TiltContextValue {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (up to down)
  isSupported: boolean;
  isPermissionGranted: boolean;
  needsPermission: boolean; // True if iOS and permission not yet granted
  requestPermission: () => Promise<boolean>;
}

const DeviceOrientationContext = createContext<TiltContextValue>({
  x: 0,
  y: 0,
  isSupported: false,
  isPermissionGranted: false,
  needsPermission: false,
  requestPermission: async () => false,
});

export function useDeviceTilt() {
  return useContext(DeviceOrientationContext);
}

interface DeviceOrientationProviderProps {
  children: ReactNode;
}

export function DeviceOrientationProvider({ children }: DeviceOrientationProviderProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop
  useEffect(() => {
    const mobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientationSupported = 'DeviceOrientationEvent' in window;
    const requiresPermission = orientationSupported &&
      'requestPermission' in DeviceOrientationEvent &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission === 'function';

    queueMicrotask(() => {
      setIsMobile(mobile);
      setIsSupported(orientationSupported || !mobile); // Desktop always "supported" via mouse

      if (requiresPermission) {
        // iOS 13+ - needs explicit permission
        setNeedsPermission(true);
        setIsPermissionGranted(false);
      } else if (orientationSupported) {
        // Android or older iOS - permission granted by default
        setNeedsPermission(false);
        setIsPermissionGranted(true);
      }

      // Desktop doesn't need permission
      if (!mobile) {
        setNeedsPermission(false);
        setIsPermissionGranted(true);
      }
    });
  }, []);

  // Handle device orientation (mobile)
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const gamma = event.gamma ?? 0;
    const beta = event.beta ?? 0;

    // Log first few orientation events for debugging
    if (Math.random() < 0.01) { // Log ~1% of events to not spam console
    }

    // Normalize gamma (-90 to 90) to -1 to 1
    const x = Math.max(-1, Math.min(1, gamma / 30)); // Reduced sensitivity

    // Normalize beta (adjust for holding phone at ~45 degrees)
    const adjustedBeta = beta - 45;
    const y = Math.max(-1, Math.min(1, adjustedBeta / 30));

    setTilt({ x, y });
  }, []);

  // Handle mouse movement (desktop)
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;

    // Normalize to -1 to 1 based on mouse position
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;

    setTilt({ x: x * 0.3, y: y * 0.3 }); // Reduced intensity for desktop
  }, []);

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        const granted = permission === 'granted';
        setIsPermissionGranted(granted);
        if (granted) {
          setNeedsPermission(false);
        }
        return granted;
      } catch (error) {
        console.error('[DeviceOrientation] Permission error:', error);
        setIsPermissionGranted(false);
        return false;
      }
    } else {
      // intentionally empty
    }

    setIsPermissionGranted(true);
    setNeedsPermission(false);
    return true;
  }, []);

  // Auto-request permission on first touch (iOS)
  useEffect(() => {
    if (!isMobile || isPermissionGranted) return;

    const handleFirstInteraction = async () => {
      await requestPermission();
    };

    window.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [isMobile, isPermissionGranted, requestPermission]);

  // Set up event listeners
  useEffect(() => {
    if (!isPermissionGranted) return;

    if (isMobile) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    } else {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isMobile, isPermissionGranted, handleOrientation, handleMouseMove]);

  return (
    <DeviceOrientationContext.Provider
      value={{
        x: tilt.x,
        y: tilt.y,
        isSupported,
        isPermissionGranted,
        needsPermission,
        requestPermission,
      }}
    >
      {children}
    </DeviceOrientationContext.Provider>
  );
}

export default DeviceOrientationContext;
