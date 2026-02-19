/**
 * Game Loading Component
 *
 * Loading state shown while game assets are loading.
 * Features animated orange with pulsing glow.
 */

import { motion } from 'framer-motion';

interface GameLoadingProps {
  gameName?: string;
}

export function GameLoading({ gameName }: GameLoadingProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      }}
    >
      {/* Animated Orange */}
      <motion.div
        className="relative mb-8"
        animate={{
          y: [0, -20, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: 'rgba(249, 115, 22, 0.4)',
            transform: 'scale(1.5)',
          }}
        />
        {/* Orange emoji */}
        <span className="relative text-7xl">🍊</span>
      </motion.div>

      {/* Loading text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h2
          className="text-xl font-bold mb-2"
          style={{
            background: 'linear-gradient(90deg, #F97316, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {gameName ? `Loading ${gameName}` : 'Loading Game'}
        </h2>

        {/* Loading dots */}
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: '#F97316' }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Tip text */}
      <motion.p
        className="absolute bottom-8 text-sm text-center px-4 text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Tip: Tap quickly for better scores!
      </motion.p>
    </div>
  );
}

export default GameLoading;
