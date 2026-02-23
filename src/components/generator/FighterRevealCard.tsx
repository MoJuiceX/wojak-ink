/**
 * FighterRevealCard — Animated Post-Mint Identity Reveal
 *
 * Shows combat identity (type, nature, ability, 4 attacks) for the first time
 * after a successful mint. Uses sequenced animations for the "mystery box" moment.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Sparkles } from 'lucide-react';

// Type color map for visual flair
const TYPE_COLOR_MAP: Record<string, string> = {
  NEUTRAL: '#a0a0b0',
  FIRE: '#ef4444',
  WATER: '#3b82f6',
  ELECTRIC: '#eab308',
  GRASS: '#22c55e',
  ICE: '#67e8f9',
  MARTIAL: '#f97316',
  VENOM: '#a855f7',
  EARTH: '#a16207',
  AIR: '#7dd3fc',
  PSYCHE: '#ec4899',
  INSECT: '#84cc16',
  STONE: '#78716c',
  GHOST: '#6366f1',
  DRAGON: '#7c3aed',
  SHADOW: '#1e293b',
  METAL: '#94a3b8',
  MYSTIC: '#f9a8d4',
};

interface CombatMove {
  id: string;
  name: string;
  power: number;
  accuracy: number;
  category: string;
  description: string;
}

interface FighterRevealProps {
  mintNumber: number;
  customName?: string;
  combat: {
    type: string;
    nature: string;
    ability: string;
    moves: CombatMove[];
  };
  imageUrl?: string;
}

export function FighterRevealCard({ mintNumber, customName, combat, imageUrl }: FighterRevealProps) {
  const [revealStep, setRevealStep] = useState(0);
  // Step 0: Image
  // Step 1: Name
  // Step 2: Type badge
  // Step 3: Nature + Ability
  // Step 4-7: Moves one by one
  // Step 8: Complete

  useEffect(() => {
    // Auto-advance through reveal steps
    const timings = [500, 800, 1200, 1600, 2000, 2300, 2600, 2900, 3200];
    const timers = timings.map((delay, idx) =>
      setTimeout(() => setRevealStep(idx + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const typeColor = TYPE_COLOR_MAP[combat.type] || 'var(--color-primary)';
  const displayName = customName || `Wojak #${mintNumber}`;

  return (
    <div className="fighter-reveal-card">
      {/* Type-colored glow background */}
      <div
        className="fighter-reveal-glow"
        style={{
          background: `radial-gradient(circle at center, ${typeColor}15 0%, transparent 70%)`,
        }}
      />

      {/* Wojak Image */}
      <AnimatePresence>
        {revealStep >= 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fighter-reveal-image"
          >
            {imageUrl ? (
              <img src={imageUrl} alt={displayName} />
            ) : (
              <div className="fighter-reveal-placeholder">
                <Swords size={48} style={{ color: typeColor }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name */}
      {revealStep >= 1 && (
        <motion.h3
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fighter-reveal-name"
        >
          {displayName}
        </motion.h3>
      )}

      {/* Type Badge */}
      {revealStep >= 2 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fighter-reveal-type"
          style={{
            background: `${typeColor}20`,
            borderColor: typeColor,
            color: typeColor,
          }}
        >
          <Sparkles size={14} />
          {combat.type}
        </motion.div>
      )}

      {/* Nature + Ability */}
      {revealStep >= 3 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fighter-reveal-traits"
        >
          <span className="text-secondary text-sm">
            {combat.nature} · {combat.ability}
          </span>
        </motion.div>
      )}

      {/* Attacks - reveal one by one */}
      <div className="fighter-reveal-moves">
        {combat.moves.map((move, idx) => (
          revealStep >= (4 + idx) && (
            <motion.div
              key={move.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`fighter-reveal-move ${move.category === 'status' ? 'fighter-reveal-move-skill' : ''}`}
            >
              <div className="flex items-center gap-2">
                {move.category === 'status' ? (
                  <Shield size={14} className="text-cyan" />
                ) : (
                  <Swords size={14} style={{ color: typeColor }} />
                )}
                <span className="font-medium text-sm">{move.name}</span>
              </div>
              <div className="flex gap-2 text-xs text-secondary">
                {move.power > 0 && <span>Pow {move.power}</span>}
                <span>Acc {move.accuracy}%</span>
                <span className="text-muted">
                  {move.category === 'physical' ? 'PHY' : move.category === 'special' ? 'SPC' : 'SKILL'}
                </span>
              </div>
            </motion.div>
          )
        ))}
      </div>

      {revealStep >= 8 && <div className="fighter-reveal-cta" aria-hidden="true" />}
    </div>
  );
}
