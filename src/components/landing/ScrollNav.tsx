/**
 * Scroll Navigation
 *
 * Fixed side navigation dots for quick section jumping.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Section {
  id: string;
  label: string;
}

interface ScrollNavProps {
  sections: Section[];
  activeSection: number;
  onNavigate: (index: number) => void;
}

export const ScrollNav: React.FC<ScrollNavProps> = ({
  sections,
  activeSection,
  onNavigate,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <nav className="scroll-nav" aria-label="Page sections">
      {sections.map((section, index) => (
        <motion.button
          type="button"
          key={section.id}
          className={`scroll-nav-dot ${activeSection === index ? 'active' : ''}`}
          onClick={() => onNavigate(index)}
          whileHover={!prefersReducedMotion ? { scale: 1.3 } : {}}
          whileTap={!prefersReducedMotion ? { scale: 0.9 } : {}}
          aria-label={`Go to ${section.label} section`}
          aria-current={activeSection === index ? 'true' : undefined}
        >
          <span className="dot-label">{section.label}</span>
        </motion.button>
      ))}
    </nav>
  );
};

export default ScrollNav;
