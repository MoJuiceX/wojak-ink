/**
 * Vote counter badge for cards
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VoteCounterProps {
  donutCount: number;
  poopCount: number;
}

export function VoteCounter({ donutCount, poopCount }: VoteCounterProps) {
  const [donutBounce, setDonutBounce] = useState(false);
  const [poopBounce, setPoopBounce] = useState(false);
  const prevDonutRef = useRef(donutCount);
  const prevPoopRef = useRef(poopCount);

  useEffect(() => {
    if (donutCount > prevDonutRef.current) {
      // Schedule state update via microtask to avoid synchronous setState warning
      queueMicrotask(() => setDonutBounce(true));
      const timer = setTimeout(() => setDonutBounce(false), 400);
      prevDonutRef.current = donutCount;
      return () => clearTimeout(timer);
    }
    prevDonutRef.current = donutCount;
  }, [donutCount]);

  useEffect(() => {
    if (poopCount > prevPoopRef.current) {
      // Schedule state update via microtask to avoid synchronous setState warning
      queueMicrotask(() => setPoopBounce(true));
      const timer = setTimeout(() => setPoopBounce(false), 400);
      prevPoopRef.current = poopCount;
      return () => clearTimeout(timer);
    }
    prevPoopRef.current = poopCount;
  }, [poopCount]);

  return (
    <div className="vote-counter">
      <motion.span
        className="vote-counter-item"
        animate={donutBounce ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        🍩 {donutCount}
      </motion.span>
      <span className="vote-counter-divider">|</span>
      <motion.span
        className="vote-counter-item"
        animate={poopBounce ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        💩 {poopCount}
      </motion.span>
    </div>
  );
}
