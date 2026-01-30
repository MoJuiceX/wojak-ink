import { Zap, Trophy, Image, Gamepad } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface QuickStatsProps {
  stats: {
    points: number;
    rank: number;
    nftCount: number;
    gamesPlayed: number;
  };
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="stat-value">
      {prefix}{displayValue.toLocaleString()}
    </span>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    { icon: Zap, label: 'Points', value: stats.points, color: 'orange' },
    { icon: Trophy, label: 'Rank', value: stats.rank, color: 'gold', prefix: '#' },
    { icon: Image, label: 'Wojaks', value: stats.nftCount, color: 'cyan' },
    { icon: Gamepad, label: 'Games', value: stats.gamesPlayed, color: 'purple' },
  ];

  return (
    <motion.div
      className="quick-stats"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {statItems.map(item => (
        <motion.div
          key={item.label}
          className={`stat-card stat-${item.color}`}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <item.icon size={20} className="stat-icon" />
          <AnimatedNumber value={item.value} prefix={item.prefix} />
          <span className="stat-label">{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
