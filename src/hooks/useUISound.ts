import { useCallback } from 'react';

// Simple sound hook - adjust to match your settings system
export function useUISound() {
  const playSound = useCallback((soundId: 'click' | 'navigate' | 'success' | 'error') => {
    // Check your existing sound settings
    // Adjust this to read from YOUR settings context/localStorage
    const soundEnabled = localStorage.getItem('soundEffectsEnabled') !== 'false';
    const volume = parseInt(localStorage.getItem('soundEffectsVolume') || '80', 10) / 100;
    
    if (!soundEnabled || volume === 0) return;

    // Create and play sound
    const audio = new Audio(`/assets/sounds/${soundId}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {}); // Ignore autoplay errors
  }, []);

  return { playSound };
}
