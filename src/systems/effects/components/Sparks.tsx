import React, { useState } from 'react';

interface SparksProps {
  position?: { x: number; y: number };
  data?: {
    count?: number;
    color?: string;
  };
  duration: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  delay: number;
}

function createSparks(count: number): Spark[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - Math.random() * 30,
      delay: Math.random() * 100
    };
  });
}

export const Sparks: React.FC<SparksProps> = ({
  position = { x: 50, y: 50 },
  data = {},
  duration
}) => {
  const { count = 12, color = '#FFD700' } = data;

  const [sparks] = useState<Spark[]>(() => createSparks(count));

  return (
    <div
      className="effect-sparks-container"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`
      }}
    >
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="effect-spark"
          style={{
            '--spark-color': color,
            '--spark-x': `${spark.x}px`,
            '--spark-y': `${spark.y}px`,
            '--spark-duration': `${duration}ms`,
            animationDelay: `${spark.delay}ms`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
