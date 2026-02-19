import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, TrendingUp, Trophy, Flame } from 'lucide-react';

interface FightClubHeroProps {
  isHolder: boolean;  // Has Farmers Plot
  hasWojaks: boolean; // Has minted Wojaks
}

export function FightClubHero({ hasWojaks }: FightClubHeroProps) {
  return (
    <div className="fight-club-hero">
      {/* Background glow effect */}
      <div className="fight-club-hero-glow" />

      {/* Main heading */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fight-club-hero-title"
      >
        <Swords size={28} className="text-primary" />
        <h1>Fight Club</h1>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="fight-club-hero-tagline"
      >
        Create your fighter. Climb the ranks. Sell at the top.
      </motion.p>

      {/* Value loop — 4 steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="fight-club-hero-loop"
      >
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'var(--color-primary-15)' }}>
            <Flame size={18} className="text-primary" />
          </div>
          <span className="hero-loop-label">Create</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
            <Swords size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <span className="hero-loop-label">Battle</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-cyan)' }} />
          </div>
          <span className="hero-loop-label">Climb</span>
        </div>
        <span className="hero-loop-arrow">→</span>
        <div className="hero-loop-step">
          <div className="hero-loop-icon" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
            <Trophy size={18} style={{ color: '#eab308' }} />
          </div>
          <span className="hero-loop-label">Profit</span>
        </div>
      </motion.div>

      {/* CTA — context-dependent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="fight-club-hero-cta"
      >
        {!hasWojaks ? (
          <Link to="/generator" className="btn btn-primary flex items-center gap-2">
            <Flame size={16} />
            Create Your Fighter
          </Link>
        ) : (
          <p className="text-xs text-secondary">
            You have fighters ready. Choose a tab below to get started.
          </p>
        )}
      </motion.div>
    </div>
  );
}
