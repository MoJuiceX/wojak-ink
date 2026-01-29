import { useEffect, useRef, useState, useCallback } from 'react';
import './CryptoBubbles.css';

interface BubbleData {
  id: string;
  symbol: string;
  value: number;
  color: string;
  logo?: string;
}

interface Bubble extends BubbleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  popping?: boolean;
  hidden?: boolean;
  spawning?: boolean;
}

interface CryptoBubblesProps {
  data: BubbleData[];
  width?: number;
  height?: number;
  soundEffectsEnabled?: boolean;
}

// Color palette for bubbles
const BUBBLE_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#E91E63', '#3F51B5', '#009688', '#FF5722',
  '#673AB7', '#8BC34A', '#FFC107', '#03A9F4', '#795548',
];

const RESPAWN_DELAY = 30000; // 30 seconds

// Create pop sound using Web Audio API - pitch varies by value
const playPopSound = (value: number, maxValue: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Create oscillator for the pop
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Higher value = deeper pitch (lower frequency), smaller value = higher pitch
    const valueRatio = Math.min(value / maxValue, 1);
    const baseFreq = 800 - (valueRatio * 500); // Range: 300Hz (big) to 800Hz (small)
    const endFreq = 80 + (valueRatio * 50); // Range: 80Hz to 130Hz

    // Pop sound: quick frequency sweep down
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + 0.12);

    // Quick attack, fast decay - louder for bigger bubbles
    const volume = 0.2 + (valueRatio * 0.15);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not supported, fail silently
  }
};

// Haptic feedback for mobile
const triggerHaptic = () => {
  try {
    // Use Vibration API (works on most mobile browsers)
    if (navigator.vibrate) {
      navigator.vibrate(15); // Short 15ms vibration for a "pop" feel
    }
  } catch {
    // Haptics not supported, fail silently
  }
};

// Universal particle config - oranges for all bubbles
const PARTICLE_CONFIG = { emoji: '🍊', count: 6 };

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

// Create particles for a popped bubble
const createParticles = (
  bubbleId: string,
  x: number,
  y: number
): Particle[] => {
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_CONFIG.count + (Math.random() - 0.5) * 0.5;
    const speed = 4 + Math.random() * 5;
    particles.push({
      id: `${bubbleId}-particle-${i}-${Date.now()}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3, // Upward bias
      emoji: PARTICLE_CONFIG.emoji,
      opacity: 1,
      scale: 1.5 + Math.random() * 0.5, // Much bigger scale
    });
  }

  return particles;
};

// Create confetti particles - full screen celebration
const createConfetti = (): Particle[] => {
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
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
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
      vx: 5 + Math.random() * 4,
      vy: 0.5 + Math.random() * 2,
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
      vx: -(5 + Math.random() * 4),
      vy: 0.5 + Math.random() * 2,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      opacity: 1,
      scale: 0.8 + Math.random() * 0.8,
    });
  }

  return confetti;
};

// Play celebration sound
const playCelebrationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

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
};

const CryptoBubbles: React.FC<CryptoBubblesProps> = ({
  data,
  width = 340,
  height = 320,
  soundEffectsEnabled = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const frameCountRef = useRef(0);
  const particleAnimationRef = useRef<number | undefined>(undefined);
  const bubblesRef = useRef<Bubble[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [confettiParticles, setConfettiParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiAnimationRef = useRef<number | undefined>(undefined);
  const respawnTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const maxValueRef = useRef<number>(100);

  // Handle bubble pop
  const handleBubblePop = useCallback((id: string, event?: React.MouseEvent) => {
    // Find the bubble and mark it as popping
    const bubbleIndex = bubblesRef.current.findIndex(b => b.id === id);
    if (bubbleIndex === -1 || bubblesRef.current[bubbleIndex].popping || bubblesRef.current[bubbleIndex].hidden) {
      return;
    }

    const bubble = bubblesRef.current[bubbleIndex];

    // Play pop sound (pitch based on value) and haptic feedback - only if sound effects enabled
    if (soundEffectsEnabled) {
      playPopSound(bubble.value, maxValueRef.current);
    }
    triggerHaptic();

    // Create ripple at tap position
    if (event && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rippleX = event.clientX - rect.left;
      const rippleY = event.clientY - rect.top;
      const newRipple: Ripple = { id: `ripple-${Date.now()}`, x: rippleX, y: rippleY };
      setRipples(prev => [...prev, newRipple]);
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    // Create particles at bubble center
    const newParticles = createParticles(id, bubble.x, bubble.y);
    setParticles(prev => [...prev, ...newParticles]);

    // Mark as popping (triggers animation)
    bubblesRef.current[bubbleIndex].popping = true;
    setBubbles([...bubblesRef.current]);

    // After pop animation (300ms), hide the bubble and check for confetti
    setTimeout(() => {
      const idx = bubblesRef.current.findIndex(b => b.id === id);
      if (idx !== -1) {
        bubblesRef.current[idx].hidden = true;
        bubblesRef.current[idx].popping = false;
        setBubbles([...bubblesRef.current]);

        // Check if all bubbles are popped
        const allPopped = bubblesRef.current.every(b => b.hidden);
        if (allPopped) {
          setShowConfetti(true);
          if (soundEffectsEnabled) {
            playCelebrationSound();
          }
          triggerHaptic();
          // Extra haptic for celebration
          setTimeout(() => triggerHaptic(), 100);
          setTimeout(() => triggerHaptic(), 200);
        }
      }
    }, 300);

    // Set respawn timer
    const timer = setTimeout(() => {
      const idx = bubblesRef.current.findIndex(b => b.id === id);
      if (idx !== -1) {
        // Respawn at random position with spawn animation
        const bubble = bubblesRef.current[idx];
        bubble.hidden = false;
        bubble.spawning = true;
        bubble.x = Math.random() * (width - bubble.radius * 2) + bubble.radius;
        bubble.y = Math.random() * (height - bubble.radius * 2) + bubble.radius;
        bubble.vx = (Math.random() - 0.5) * 0.6;
        bubble.vy = (Math.random() - 0.5) * 0.6;
        setBubbles([...bubblesRef.current]);

        // Clear spawning state after animation
        setTimeout(() => {
          const i = bubblesRef.current.findIndex(b => b.id === id);
          if (i !== -1) {
            bubblesRef.current[i].spawning = false;
            setBubbles([...bubblesRef.current]);
          }
        }, 400);
      }
      respawnTimersRef.current.delete(id);
    }, RESPAWN_DELAY);

    respawnTimersRef.current.set(id, timer);
  }, [width, height, soundEffectsEnabled]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timersRef = respawnTimersRef.current;
    return () => {
      timersRef.forEach(timer => clearTimeout(timer));
      timersRef.clear();
    };
  }, []);

  // Reset all bubbles (for shake gesture)
  const resetAllBubbles = useCallback(() => {
    // Clear all respawn timers
    respawnTimersRef.current.forEach(timer => clearTimeout(timer));
    respawnTimersRef.current.clear();

    // Respawn all hidden bubbles
    bubblesRef.current.forEach(bubble => {
      if (bubble.hidden) {
        bubble.hidden = false;
        bubble.spawning = true;
        bubble.x = Math.random() * (width - bubble.radius * 2) + bubble.radius;
        bubble.y = Math.random() * (height - bubble.radius * 2) + bubble.radius;
        bubble.vx = (Math.random() - 0.5) * 0.6;
        bubble.vy = (Math.random() - 0.5) * 0.6;

        // Clear spawning after animation
        setTimeout(() => {
          bubble.spawning = false;
          setBubbles([...bubblesRef.current]);
        }, 400);
      }
    });

    setShowConfetti(false);
    setBubbles([...bubblesRef.current]);

    // Haptic feedback for reset
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]); // Double vibration
    }
  }, [width, height]);

  // Shake detection (with permissions policy check)
  useEffect(() => {
    // Check if devicemotion is allowed by permissions policy
    if (!('DeviceMotionEvent' in window)) return;

    let lastX = 0, lastY = 0, lastZ = 0;
    let lastShake = 0;
    const shakeThreshold = 25;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const deltaX = Math.abs(acc.x - lastX);
      const deltaY = Math.abs(acc.y - lastY);
      const deltaZ = Math.abs(acc.z - lastZ);

      if ((deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold)) {
        const now = Date.now();
        if (now - lastShake > 1000) { // Debounce: 1 second
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

  // Particle animation
  useEffect(() => {
    if (particles.length === 0) return;

    const animateParticles = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3, // Gravity
          opacity: p.opacity - 0.02,
          scale: p.scale * 0.98,
        })).filter(p => p.opacity > 0);

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
  }, [particles.length]);

  // Confetti trigger
  useEffect(() => {
    if (!showConfetti) return;

    // Defer setState to avoid synchronous call in effect body
    const timer = setTimeout(() => {
      const newConfetti = createConfetti();
      setConfettiParticles(newConfetti);
    }, 0);

    // Auto-hide confetti after 8 seconds
    const hideTimeout = setTimeout(() => {
      setShowConfetti(false);
      setConfettiParticles([]);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimeout);
    };
  }, [showConfetti]);

  // Confetti physics animation
  useEffect(() => {
    if (confettiParticles.length === 0) return;

    const animateConfetti = () => {
      setConfettiParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * 0.995, // Less air resistance
          vy: p.vy + 0.1, // Slower gravity
          opacity: p.opacity - 0.003, // Much slower fade
          scale: p.scale,
        })).filter(p => p.opacity > 0 && p.y < window.innerHeight + 50);

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
  }, [confettiParticles.length]);

  // Calculate bubble radius using log scale for better visual balance
  // This ensures smaller values are still visible while larger values are proportionally bigger
  const calculateRadius = (
    value: number,
    minValue: number,
    maxValue: number,
    minRadius: number,
    maxRadius: number
  ) => {
    if (value <= 0) return minRadius;

    // Use log scale to compress large differences while maintaining proportionality
    const logMin = Math.log(Math.max(minValue, 1));
    const logMax = Math.log(Math.max(maxValue, 1));
    const logValue = Math.log(Math.max(value, 1));

    // Normalize to 0-1 range
    const ratio = logMax > logMin
      ? (logValue - logMin) / (logMax - logMin)
      : 1;

    return minRadius + ratio * (maxRadius - minRadius);
  };

  // Initialize bubbles
  useEffect(() => {
    if (data.length === 0) return;

    const values = data.map(d => d.value).filter(v => v > 0);
    const maxValue = Math.max(...values);
    maxValueRef.current = maxValue; // Store for pitch calculation
    const minValue = Math.min(...values);
    const minRadius = 28;
    const maxRadius = 58;

    const initialBubbles: Bubble[] = data.map((item, index) => {
      const radius = calculateRadius(item.value, minValue, maxValue, minRadius, maxRadius);
      return {
        ...item,
        color: item.color || BUBBLE_COLORS[index % BUBBLE_COLORS.length],
        x: Math.random() * (width - radius * 2) + radius,
        y: Math.random() * (height - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius,
      };
    });

    bubblesRef.current = initialBubbles;
    // Defer setState to avoid synchronous call in effect
    const timer = setTimeout(() => setBubbles(initialBubbles), 0);
    return () => clearTimeout(timer);
  }, [data, width, height]);

  // Physics simulation
  useEffect(() => {
    if (bubblesRef.current.length === 0) return;

    const friction = 0.995;
    const bounce = 0.8;
    const minSpeed = 0.15;

    const animate = () => {
      const currentBubbles = bubblesRef.current;

      for (let i = 0; i < currentBubbles.length; i++) {
        const bubble = currentBubbles[i];

        // Skip hidden bubbles
        if (bubble.hidden) continue;

        // Apply velocity
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;

        // Apply friction
        bubble.vx *= friction;
        bubble.vy *= friction;

        // Add small random force to keep bubbles moving
        if (Math.abs(bubble.vx) < minSpeed) {
          bubble.vx += (Math.random() - 0.5) * 0.15;
        }
        if (Math.abs(bubble.vy) < minSpeed) {
          bubble.vy += (Math.random() - 0.5) * 0.15;
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
          // Skip hidden bubbles in collision
          if (other.hidden) continue;
          const dx = other.x - bubble.x;
          const dy = other.y - bubble.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = bubble.radius + other.radius;

          if (distance < minDist && distance > 0) {
            // Normalize collision vector
            const nx = dx / distance;
            const ny = dy / distance;

            // Relative velocity
            const dvx = bubble.vx - other.vx;
            const dvy = bubble.vy - other.vy;
            const dvn = dvx * nx + dvy * ny;

            // Only resolve if moving towards each other
            if (dvn > 0) {
              // Mass proportional to radius
              const m1 = bubble.radius;
              const m2 = other.radius;
              const totalMass = m1 + m2;

              // Update velocities (elastic collision)
              const impulse = (2 * dvn) / totalMass;
              bubble.vx -= impulse * m2 * nx * bounce;
              bubble.vy -= impulse * m2 * ny * bounce;
              other.vx += impulse * m1 * nx * bounce;
              other.vy += impulse * m1 * ny * bounce;

              // Separate overlapping bubbles
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
  }, [width, height]);

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return '$' + Math.round(value / 1000) + 'k';
    }
    return '$' + Math.round(value);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="crypto-bubbles-container"
        style={{ width, height }}
      >
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="ripple"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}

        {/* Bubbles (Logo-based) */}
        {bubbles.filter(b => !b.hidden).map((bubble) => (
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
            {bubble.logo && (
              <img
                src={bubble.logo}
                alt={bubble.symbol}
                className="bubble-logo-main"
                style={{
                  width: bubble.radius * 2,
                  height: bubble.radius * 2,
                }}
              />
            )}
            <div className="bubble-label">
              <span className="bubble-value">{formatValue(bubble.value)}</span>
            </div>
          </div>
        ))}

        {/* Particles (oranges from bubble pops) */}
        {particles.map(particle => (
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
          {confettiParticles.map(particle => (
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
};

export default CryptoBubbles;
