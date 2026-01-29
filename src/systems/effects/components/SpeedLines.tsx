import React, { useState } from 'react';

interface SpeedLinesProps {
  data?: {
    count?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
  };
  duration: number;
}

interface SpeedLine {
  id: number;
  left: number;
  delay: number;
  height: number;
}

function createLines(count: number): SpeedLine[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 200,
    height: 50 + Math.random() * 100
  }));
}

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  data = {},
  duration
}) => {
  const { count = 20, direction = 'down' } = data;

  const [lines] = useState<SpeedLine[]>(() => createLines(count));

  return (
    <div className={`effect-speed-lines direction-${direction}`}>
      {lines.map((line) => (
        <div
          key={line.id}
          className="effect-speed-line"
          style={{
            left: `${line.left}%`,
            height: `${line.height}px`,
            '--speed-duration': `${duration}ms`,
            animationDelay: `${line.delay}ms`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
