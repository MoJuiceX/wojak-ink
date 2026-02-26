/**
 * CryptoBubbles Component
 *
 * Interactive DOM-based bubble visualization with physics simulation.
 * Ported from wojak-ink with improved physics and effects.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WalletToken } from '@/types/treasury';
import { getFallbackLogo } from '@/services/treasuryFallback';
import './CryptoBubbles.css';

interface CryptoBubblesProps {
  tokens: WalletToken[];
  onBubblePop?: (token: WalletToken) => void;
  onAllPopped?: () => void;
  isLoading?: boolean;
  soundEnabled?: boolean;
}

interface Bubble {
  id: string;
  token: WalletToken;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  popping?: boolean;
  hidden?: boolean;
  spawning?: boolean;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  opacity: number;
  scale: number;
}

interface Ripple {
  id: string;
  x: number;
  y: number;
}

const RESPAWN_DELAY = 30000; // 30 seconds
const PARTICLE_CONFIG = { emoji: '🍊', count: 6 };

// Create pop sound using Web Audio API - pitch varies by value
function playPopSound(value: number, maxValue: number): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Higher value = deeper pitch (lower frequency), smaller value = higher pitch
    const valueRatio = Math.min(value / maxValue, 1);
    const baseFreq = 800 - valueRatio * 500; // Range: 300Hz (big) to 800Hz (small)
    const endFreq = 80 + valueRatio * 50; // Range: 80Hz to 130Hz

    // Pop sound: quick frequency sweep down
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + 0.12);

    // Quick attack, fast decay - louder for bigger bubbles
    const volume = 0.2 + valueRatio * 0.15;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported, fail silently
  }
}

// Haptic feedback for mobile
function triggerHaptic(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  } catch {
    // Haptics not supported, fail silently
  }
}

// Play celebration sound
function playCelebrationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();

    // Play a cheerful ascending arpeggio
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const startTime = audioContext.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  } catch {
    // Audio not supported
  }
}

// Create particles for a popped bubble
function createParticles(bubbleId: string, x: number, y: number): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_CONFIG.count + (Math.random() - 0.5) * 0.5;
    const speed = 7 + Math.random() * 8;
    particles.push({
      id: `${bubbleId}-particle-${i}-${Date.now()}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5, // Upward bias
      emoji: PARTICLE_CONFIG.emoji,
      opacity: 1,
      scale: 1.5 + Math.random() * 0.5,
    });
  }

  return particles;
}

// Create confetti particles - full screen celebration
function createConfetti(): Particle[] {
  const confetti: Particle[] = [];
  const emojis = ['🎉', '🎊', '✨', '💫', '⭐', '🌟', '🍊'];
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // From top (falling down)
  for (let i = 0; i < 40; i++) {
    confetti.push({
      id: `confetti-top-${i}-${Date.now()}`,
      x: Math.random() * screenWidth,
      y: -30 - Math.random() * 150,
      vx: (Math.random() - 0.5) * 4,
      vy: 4 + Math.random() * 5,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      opacity: 1,
      scale: 0.8 + Math.random() * 0.8,
    });
  }

  // From left side (shooting right)
  for (let i = 0; i < 25; i++) {
    confetti.push({
      id: `confetti-left-${i}-${Date.now()}`,
      x: -20,
      y: Math.random() * (screenHeight * 0.6),
      vx: 8 + Math.random() * 6,
      vy: 1 + Math.random() * 3,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      opacity: 1,
      scale: 0.8 + Math.random() * 0.8,
    });
  }

  // From right side (shooting left)
  for (let i = 0; i < 25; i++) {
    confetti.push({
      id: `confetti-right-${i}-${Date.now()}`,
      x: screenWidth + 20,
      y: Math.random() * (screenHeight * 0.6),
      vx: -(8 + Math.random() * 6),
      vy: 1 + Math.random() * 3,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      opacity: 1,
      scale: 0.8 + Math.random() * 0.8,
    });
  }

  return confetti;
}

// Calculate bubble radius using log scale for better visual balance
function calculateRadius(
  value: number,
  minValue: number,
  maxValue: number,
  minRadius: number,
  maxRadius: number
): number {
  if (value <= 0) return minRadius;

  const logMin = Math.log(Math.max(minValue, 1));
  const logMax = Math.log(Math.max(maxValue, 1));
  const logValue = Math.log(Math.max(value, 1));

  const ratio = logMax > logMin ? (logValue - logMin) / (logMax - logMin) : 1;

  return minRadius + ratio * (maxRadius - minRadius);
}

// Format value for display
function formatValue(value: number): string {
  if (value >= 1000) {
    return '$' + Math.round(value / 1000) + 'k';
  }
  return '$' + Math.round(value);
}

export function CryptoBubbles({
  tokens,
  onBubblePop,
  onAllPopped,
  isLoading = false,
  soundEnabled = true,
}: CryptoBubblesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const particleAnimationRef = useRef<number>(0);
  const confettiAnimationRef = useRef<number>(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const respawnTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const maxValueRef = useRef<number>(100);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [confettiParticles, setConfettiParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 500 });
  const [isContainerReady, setIsContainerReady] = useState(false);

  // Handle container resize - fill available space
  useEffect(() => {
    if (isLoading) return;
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      // Get the actual container dimensions from CSS
      const rect = container.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : 600;
      const height = rect.height > 100 ? rect.height : 500; // Ensure valid height

      if (width > 0 && height > 100) {
        setContainerSize({ width, height });
        setIsContainerReady(true);
      }
    };

    // Initial update after CSS applies
    const initTimer = setTimeout(updateSize, 100);
    // Second check to ensure dimensions are correct
    const secondTimer = setTimeout(updateSize, 300);

    window.addEventListener('resize', updateSize);
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(secondTimer);
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, [isLoading]);

  // Handle bubble pop
  const handleBubblePop = useCallback(
    (id: string, event?: React.MouseEvent) => {
      const bubbleIndex = bubblesRef.current.findIndex((b) => b.id === id);
      if (
        bubbleIndex === -1 ||
        bubblesRef.current[bubbleIndex].popping ||
        bubblesRef.current[bubbleIndex].hidden
      ) {
        return;
      }

      const bubble = bubblesRef.current[bubbleIndex];

      // Play pop sound and haptic feedback
      if (soundEnabled) {
        playPopSound(bubble.token.valueUSD, maxValueRef.current);
      }
      triggerHaptic();

      // Create ripple at tap position
      if (event && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const rippleX = event.clientX - rect.left;
        const rippleY = event.clientY - rect.top;
        const newRipple: Ripple = { id: `ripple-${Date.now()}`, x: rippleX, y: rippleY };
        setRipples((prev) => [...prev, newRipple]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      // Create particles at bubble center
      const newParticles = createParticles(id, bubble.x, bubble.y);
      setParticles((prev) => [...prev, ...newParticles]);

      // Mark as popping (triggers animation)
      bubblesRef.current[bubbleIndex].popping = true;
      setBubbles([...bubblesRef.current]);

      // Notify parent
      onBubblePop?.(bubble.token);

      // After pop animation (300ms), hide the bubble and check for confetti
      setTimeout(() => {
        const idx = bubblesRef.current.findIndex((b) => b.id === id);
        if (idx !== -1) {
          bubblesRef.current[idx].hidden = true;
          bubblesRef.current[idx].popping = false;
          setBubbles([...bubblesRef.current]);

          // Check if all bubbles are popped
          const allPopped = bubblesRef.current.every((b) => b.hidden);
          if (allPopped) {
            setShowConfetti(true);
            if (soundEnabled) {
              playCelebrationSound();
            }
            triggerHaptic();
            setTimeout(() => triggerHaptic(), 100);
            setTimeout(() => triggerHaptic(), 200);
            onAllPopped?.();
          }
        }
      }, 300);

      // Set respawn timer
      const timer = setTimeout(() => {
        const idx = bubblesRef.current.findIndex((b) => b.id === id);
        if (idx !== -1) {
          const b = bubblesRef.current[idx];
          b.hidden = false;
          b.spawning = true;
          b.x = Math.random() * (containerSize.width - b.radius * 2) + b.radius;
          b.y = Math.random() * (containerSize.height - b.radius * 2) + b.radius;
          b.vx = (Math.random() - 0.5) * 0.6;
          b.vy = (Math.random() - 0.5) * 0.6;
          setBubbles([...bubblesRef.current]);

          setTimeout(() => {
            const i = bubblesRef.current.findIndex((bb) => bb.id === id);
            if (i !== -1) {
              bubblesRef.current[i].spawning = false;
              setBubbles([...bubblesRef.current]);
            }
          }, 400);
        }
        respawnTimersRef.current.delete(id);
      }, RESPAWN_DELAY);

      respawnTimersRef.current.set(id, timer);
    },
    [containerSize.width, containerSize.height, soundEnabled, onBubblePop, onAllPopped]
  );

  // Reset all bubbles (for shake gesture)
  const resetAllBubbles = useCallback(() => {
    respawnTimersRef.current.forEach((timer) => clearTimeout(timer));
    respawnTimersRef.current.clear();

    bubblesRef.current.forEach((bubble) => {
      if (bubble.hidden) {
        bubble.hidden = false;
        bubble.spawning = true;
        bubble.x = Math.random() * (containerSize.width - bubble.radius * 2) + bubble.radius;
        bubble.y = Math.random() * (containerSize.height - bubble.radius * 2) + bubble.radius;
        bubble.vx = (Math.random() - 0.5) * 0.6;
        bubble.vy = (Math.random() - 0.5) * 0.6;

        setTimeout(() => {
          bubble.spawning = false;
          setBubbles([...bubblesRef.current]);
        }, 400);
      }
    });

    setShowConfetti(false);
    setBubbles([...bubblesRef.current]);

    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  }, [containerSize.width, containerSize.height]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = respawnTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Shake detection (with permissions policy check)
  useEffect(() => {
    // Check if devicemotion is allowed by permissions policy
    if (!('DeviceMotionEvent' in window)) return;

    let lastX = 0,
      lastY = 0,
      lastZ = 0;
    let lastShake = 0;
    const shakeThreshold = 25;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const deltaX = Math.abs(acc.x - lastX);
      const deltaY = Math.abs(acc.y - lastY);
      const deltaZ = Math.abs(acc.z - lastZ);

      if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
        const now = Date.now();
        if (now - lastShake > 1000) {
          lastShake = now;
          resetAllBubbles();
        }
      }

      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;
    };

    try {
      window.addEventListener('devicemotion', handleMotion);
    } catch {
      // Permissions policy may block devicemotion, fail silently
      return;
    }
    return () => {
      try {
        window.removeEventListener('devicemotion', handleMotion);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [resetAllBubbles]);

  // Track if bubbles have been initialized
  const bubblesInitializedRef = useRef(false);

  // Initialize bubbles when tokens change and container is ready (only once per token set)
  useEffect(() => {
    if (isLoading || tokens.length === 0 || !isContainerReady) return;

    // Create a stable token key to detect actual token changes vs just re-renders
    const tokenKey = tokens.map(t => t.id).sort().join(',');
    const currentTokenKey = bubblesRef.current.map(b => b.id).sort().join(',');

    // Only reinitialize if tokens actually changed, not on container resize
    if (bubblesInitializedRef.current && tokenKey === currentTokenKey) {
      return;
    }

    const visibleTokens = tokens.filter((t) => t.valueUSD >= 10);
    const values = visibleTokens.map((t) => t.valueUSD);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 1);
    maxValueRef.current = maxValue;

    // Bubble sizes - XCH stays large, others scale down on mobile
    const isMobile = window.innerWidth < 768;
    const minRadius = isMobile ? 35 : 45;
    const maxRadius = isMobile ? 70 : 90;
    // On mobile, non-XCH bubbles are 25% smaller
    const mobileNonXchScale = 0.75;

    // Use actual container dimensions
    const width = containerSize.width;
    const height = containerSize.height;

    const initialBubbles: Bubble[] = visibleTokens.map((token) => {
      let radius = calculateRadius(token.valueUSD, minValue, maxValue, minRadius, maxRadius);
      // Apply mobile scaling to non-XCH tokens
      if (isMobile && token.symbol !== 'XCH') {
        radius = radius * mobileNonXchScale;
      }
      return {
        id: token.id,
        token,
        // Distribute bubbles throughout the FULL container
        x: Math.random() * (width - radius * 2) + radius,
        y: Math.random() * (height - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius,
      };
    });

    bubblesRef.current = initialBubbles;
    queueMicrotask(() => setBubbles(initialBubbles));
    bubblesInitializedRef.current = true;
  }, [tokens, containerSize.width, containerSize.height, isLoading, isContainerReady]);

  // Physics simulation
  useEffect(() => {
    if (isLoading || bubblesRef.current.length === 0 || !isContainerReady) return;

    const friction = 0.992;
    const bounce = 0.85;
    const minSpeed = 0.5;

    const animate = () => {
      // Get real-time container dimensions
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width || containerSize.width;
      const height = rect.height || containerSize.height;

      const currentBubbles = bubblesRef.current;

      for (let i = 0; i < currentBubbles.length; i++) {
        const bubble = currentBubbles[i];

        if (bubble.hidden) continue;

        // Apply velocity
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;

        // Apply friction
        bubble.vx *= friction;
        bubble.vy *= friction;

        // Add random force to keep bubbles moving
        if (Math.abs(bubble.vx) < minSpeed) {
          bubble.vx += (Math.random() - 0.5) * 0.4;
        }
        if (Math.abs(bubble.vy) < minSpeed) {
          bubble.vy += (Math.random() - 0.5) * 0.4;
        }

        // Wall collision
        if (bubble.x - bubble.radius < 0) {
          bubble.x = bubble.radius;
          bubble.vx *= -bounce;
        }
        if (bubble.x + bubble.radius > width) {
          bubble.x = width - bubble.radius;
          bubble.vx *= -bounce;
        }
        if (bubble.y - bubble.radius < 0) {
          bubble.y = bubble.radius;
          bubble.vy *= -bounce;
        }
        if (bubble.y + bubble.radius > height) {
          bubble.y = height - bubble.radius;
          bubble.vy *= -bounce;
        }

        // Bubble-to-bubble collision
        for (let j = i + 1; j < currentBubbles.length; j++) {
          const other = currentBubbles[j];
          if (other.hidden) continue;

          const dx = other.x - bubble.x;
          const dy = other.y - bubble.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = bubble.radius + other.radius;

          if (distance < minDist && distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;

            const dvx = bubble.vx - other.vx;
            const dvy = bubble.vy - other.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
              const m1 = bubble.radius;
              const m2 = other.radius;
              const totalMass = m1 + m2;

              const impulse = (2 * dvn) / totalMass;
              bubble.vx -= impulse * m2 * nx * bounce;
              bubble.vy -= impulse * m2 * ny * bounce;
              other.vx += impulse * m1 * nx * bounce;
              other.vy += impulse * m1 * ny * bounce;

              const overlap = minDist - distance;
              const separationX = (overlap / 2) * nx;
              const separationY = (overlap / 2) * ny;
              bubble.x -= separationX;
              bubble.y -= separationY;
              other.x += separationX;
              other.y += separationY;
            }
          }
        }
      }

      // Only update React state every 2 frames to reduce re-renders
      frameCountRef.current++;
      if (frameCountRef.current % 2 === 0) {
        setBubbles([...currentBubbles]);
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    frameCountRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [containerSize, isLoading, isContainerReady]);

  // Particle animation
  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) return;

    const animateParticles = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.5,
            opacity: p.opacity - 0.035,
            scale: p.scale * 0.97,
          }))
          .filter((p) => p.opacity > 0);

        return updated;
      });

      particleAnimationRef.current = requestAnimationFrame(animateParticles);
    };

    particleAnimationRef.current = requestAnimationFrame(animateParticles);

    return () => {
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current);
      }
    };
  }, [hasParticles]);

  // Confetti trigger
  useEffect(() => {
    if (!showConfetti) return;

    const newConfetti = createConfetti();
    queueMicrotask(() => setConfettiParticles(newConfetti));

    const timeout = setTimeout(() => {
      setShowConfetti(false);
      setConfettiParticles([]);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [showConfetti]);

  // Confetti physics animation
  const hasConfetti = confettiParticles.length > 0;
  useEffect(() => {
    if (!hasConfetti) return;

    const animateConfetti = () => {
      setConfettiParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.99,
            vy: p.vy + 0.25,
            opacity: p.opacity - 0.006,
          }))
          .filter((p) => p.opacity > 0 && p.y < window.innerHeight + 50);

        return updated;
      });

      confettiAnimationRef.current = requestAnimationFrame(animateConfetti);
    };

    confettiAnimationRef.current = requestAnimationFrame(animateConfetti);

    return () => {
      if (confettiAnimationRef.current) {
        cancelAnimationFrame(confettiAnimationRef.current);
      }
    };
  }, [hasConfetti]);

  // Loading skeleton - moved after all hooks
  if (isLoading) {
    return (
      <div
        className="crypto-bubbles-container crypto-bubbles-loading"
        style={{ width: '100%', height: '100%', flex: 1 }}
      >
        <div className="loading-bubbles">
          <div className="loading-bubble" style={{ width: 64, height: 64 }} />
          <div className="loading-bubble" style={{ width: 80, height: 80 }} />
          <div className="loading-bubble" style={{ width: 56, height: 56 }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="crypto-bubbles-container"
        style={{ width: '100%', height: '100%', flex: 1 }}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="ripple"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}

        {/* Bubbles */}
        {bubbles
          .filter((b) => !b.hidden)
          .map((bubble) => (
            <div
              key={bubble.id}
              className={`crypto-bubble logo-bubble ${bubble.popping ? 'popping' : ''} ${bubble.spawning ? 'spawning' : ''} ${!bubble.popping && !bubble.spawning ? 'breathing' : ''}`}
              onClick={(e) => handleBubblePop(bubble.id, e)}
              style={{
                left: bubble.x - bubble.radius,
                top: bubble.y - bubble.radius,
                width: bubble.radius * 2,
                height: bubble.radius * 2,
              }}
            >
              <img
                src={bubble.token.logoUrl || getFallbackLogo(bubble.token.symbol)}
                alt={bubble.token.symbol}
                className="bubble-logo-main"
                style={{
                  width: bubble.radius * 2,
                  height: bubble.radius * 2,
                }}
                onError={(e) => {
                  // Use fallback logo (orange circle with first letter)
                  (e.target as HTMLImageElement).src = getFallbackLogo(bubble.token.symbol);
                }}
              />
              <div className="bubble-label">
                <span className="bubble-symbol">{bubble.token.symbol}</span>
                <span className="bubble-value">{formatValue(bubble.token.valueUSD)}</span>
              </div>
            </div>
          ))}

        {/* Particles (oranges from bubble pops) */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: particle.x,
              top: particle.y,
              opacity: particle.opacity,
              transform: `translate(-50%, -50%) scale(${particle.scale})`,
            }}
          >
            {particle.emoji}
          </div>
        ))}
      </div>

      {/* Full-screen confetti overlay */}
      {confettiParticles.length > 0 && (
        <div className="confetti-overlay">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: particle.x,
                top: particle.y,
                opacity: particle.opacity,
                transform: `translate(-50%, -50%) scale(${particle.scale})`,
              }}
            >
              {particle.emoji}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default CryptoBubbles;
