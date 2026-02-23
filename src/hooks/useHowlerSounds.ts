import { Howl, Howler } from 'howler';
import { useCallback, useRef, useEffect } from 'react';

// Sound URLs - update paths to your actual sound files
const SOUNDS = {
  blockLand: '/assets/sounds/block-land.mp3',
  perfectBonus: '/assets/sounds/perfect-bonus.mp3',
  combo: '/assets/sounds/combo.mp3',
  win: '/assets/sounds/win.mp3',
  gameOver: '/assets/sounds/game-over.mp3',
  click: '/assets/sounds/click.mp3',
};

export const useHowlerSounds = () => {
  const soundsRef = useRef<Record<string, Howl>>({});
  const isMutedRef = useRef(false);

  // Initialize sounds on mount
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, src]) => {
      soundsRef.current[key] = new Howl({
        src: [src],
        volume: 0.5,
        preload: true,
      });
    });
    const sounds = soundsRef.current;

    return () => {
      // Cleanup
      Object.values(sounds).forEach(sound => sound.unload());
    };
  }, []);

  const playSound = useCallback((soundName: keyof typeof SOUNDS) => {
    if (isMutedRef.current) return;
    soundsRef.current[soundName]?.play();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    Howler.mute(muted);
  }, []);

  return {
    playBlockLand: () => playSound('blockLand'),
    playPerfectBonus: () => playSound('perfectBonus'),
    playCombo: () => playSound('combo'),
    playWinSound: () => playSound('win'),
    playGameOver: () => playSound('gameOver'),
    playClick: () => playSound('click'),
    setMuted,
    isMuted: () => isMutedRef.current,
  };
};
