import React, { useState } from 'react';

interface ConfettiProps {
  position?: { x: number; y: number };
  data?: {
    count?: number;
    colors?: string[];
    spread?: number;
  };
  duration: number;
}

interface ConfettiParticle {
  id: number;
  color: string;
  angle: number;
  velocity: number;
  rotation: number;
  size: number;
  delay: number;
  endX: number;
  endY: number;
}

function createParticles(count: number, colors: string[], spread: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: (Math.random() - 0.5) * spread,
    velocity: 50 + Math.random() * 100,
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 100,
    // Pre-calculate end positions for fallback animation
    endX: (Math.random() - 0.5) * 200,
    endY: Math.random() * 200 + 100
  }));
}

export const Confetti: React.FC<ConfettiProps> = ({
  position = { x: 50, y: 50 },
  data = {},
  duration
}) => {
  const {
    count = 50,
    colors = ['#FF6B35', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#FF8C42'],
    spread = 120
  } = data;

  const [particles] = useState<ConfettiParticle[]>(() => createParticles(count, colors, spread));

  return (
    <div
      className="effect-confetti-container"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`
      }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="effect-confetti-particle"
          style={{
            '--confetti-color': particle.color,
            '--confetti-angle': `${particle.angle}deg`,
            '--confetti-velocity': particle.velocity,
            '--confetti-rotation': `${particle.rotation}deg`,
            '--confetti-size': `${particle.size}px`,
            '--confetti-duration': `${duration}ms`,
            '--confetti-end-x': `${particle.endX}px`,
            '--confetti-end-y': `${particle.endY}px`,
            animationDelay: `${particle.delay}ms`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
