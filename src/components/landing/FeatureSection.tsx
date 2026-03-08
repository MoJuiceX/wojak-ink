/**
 * Feature Section
 *
 * Reusable section component for showcasing features
 * with scroll-triggered animations.
 */

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

interface FeatureSectionProps {
  title: string;
  description: React.ReactNode;
  icon: string;
  ctaText: string;
  onCTA: () => void;
  children: React.ReactNode;
  reverse?: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  title,
  description,
  icon,
  ctaText,
  onCTA,
  children,
  reverse = false,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const prefersReducedMotion = useReducedMotion();

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: reverse ? 50 : -50 },
        animate: isInView ? { opacity: 1, x: 0 } : {},
        transition: { duration: 0.6, ease: 'easeOut' as const },
      };

  const visualAnimationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: reverse ? -50 : 50 },
        animate: isInView ? { opacity: 1, x: 0 } : {},
        transition: { duration: 0.6, ease: 'easeOut' as const, delay: 0.2 },
      };

  return (
    <div
      ref={ref}
      className={`feature-section-container ${reverse ? 'reverse' : ''}`}
    >
      <motion.div className="feature-content" {...animationProps}>
        <span className="feature-icon">{icon}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <motion.button
          type="button"
          className="feature-cta"
          onClick={onCTA}
          whileHover={!prefersReducedMotion ? { scale: 1.05, x: 5 } : {}}
          whileTap={!prefersReducedMotion ? { scale: 0.95 } : {}}
        >
          {ctaText} <span>→</span>
        </motion.button>
      </motion.div>

      <motion.div className="feature-visual" {...visualAnimationProps}>
        {children}
      </motion.div>
    </div>
  );
};

export default FeatureSection;
