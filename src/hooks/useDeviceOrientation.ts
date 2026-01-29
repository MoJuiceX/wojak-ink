/**
 * useDeviceOrientation Hook
 *
 * Tracks device orientation (gyroscope/accelerometer) for parallax effects.
 * Returns tilt values that can be used to transform elements based on phone angle.
 *
 * - gamma: left-to-right tilt (-90 to 90 degrees)
 * - beta: front-to-back tilt (-180 to 180 degrees)
 */

import { useState, useEffect, useCallback } from 'react';

interface DeviceOrientation {
  gamma: number; // Left-right tilt (-90 to 90)
  beta: number;  // Front-back tilt (-180 to 180)
  isSupported: boolean;
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
}

// Normalize values to a -1 to 1 range for easier use
const normalizeGamma = (gamma: number | null): number => {
  if (gamma === null) return 0;
  // gamma is -90 to 90, normalize to -1 to 1
  return Math.max(-1, Math.min(1, gamma / 45));
};

const normalizeBeta = (beta: number | null): number => {
  if (beta === null) return 0;
  // beta when holding phone upright is around 45-90
  // Normalize around the "holding phone" position (roughly 45 degrees)
  const adjusted = beta - 45;
  return Math.max(-1, Math.min(1, adjusted / 45));
};

export function useDeviceOrientation(): DeviceOrientation {
  const [orientation, setOrientation] = useState({
    gamma: 0,
    beta: 0,
  });
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Check if DeviceOrientationEvent is supported
  useEffect(() => {
    const supported = 'DeviceOrientationEvent' in window;
    queueMicrotask(() => {
      setIsSupported(supported);

      // On non-iOS devices, permission is usually granted by default
      if (supported && !('requestPermission' in DeviceOrientationEvent)) {
        setIsPermissionGranted(true);
      }
    });
  }, []);

  // Handle orientation changes
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    setOrientation({
      gamma: normalizeGamma(event.gamma),
      beta: normalizeBeta(event.beta),
    });
  }, []);

  // Request permission (required for iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check if we need to request permission (iOS 13+)
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        const granted = permission === 'granted';
        setIsPermissionGranted(granted);
        return granted;
      } catch (error) {
        console.warn('Device orientation permission denied:', error);
        setIsPermissionGranted(false);
        return false;
      }
    }

    // Permission not required (non-iOS or older iOS)
    setIsPermissionGranted(true);
    return true;
  }, []);

  // Add/remove event listener
  useEffect(() => {
    if (!isSupported || !isPermissionGranted) return;

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isSupported, isPermissionGranted, handleOrientation]);

  return {
    gamma: orientation.gamma,
    beta: orientation.beta,
    isSupported,
    isPermissionGranted,
    requestPermission,
  };
}

/**
 * Simplified hook that just returns tilt values
 * Automatically requests permission on first user interaction
 */
export function useDeviceTilt(maxOffset: number = 10): { x: number; y: number } {
  const { gamma, beta, isSupported, isPermissionGranted, requestPermission } = useDeviceOrientation();
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // Auto-request permission on first touch (iOS requirement)
  useEffect(() => {
    if (!isSupported || isPermissionGranted || hasRequestedPermission) return;

    const handleFirstInteraction = async () => {
      setHasRequestedPermission(true);
      await requestPermission();
      // Remove listeners after first interaction
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, [isSupported, isPermissionGranted, hasRequestedPermission, requestPermission]);

  // Return x/y offset values
  return {
    x: gamma * maxOffset,  // Left-right movement
    y: beta * maxOffset,   // Up-down movement
  };
}

export default useDeviceOrientation;
