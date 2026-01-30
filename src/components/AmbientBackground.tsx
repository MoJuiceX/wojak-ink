/**
 * Ambient Background
 *
 * 3 floating neon orbs with:
 * - Unique float paths across the viewport
 * - Color fading between cyberpunk neon colors
 * - Opacity breathing at different rates
 * - Page-aware intensity (subdued on content-heavy pages)
 * - Scroll parallax (orbs drift up as user scrolls)
 * - Mouse repel (orbs gently push away from cursor)
 * - Desktop only (hidden below 768px)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const CONTENT_HEAVY_ROUTES = [
  '/gallery',
  '/leaderboard',
  '/shop',
  '/account',
  '/profile',
  '/guild',
  '/treasury',
  '/drawer',
  '/bigpulp',
];

const MAX_REPEL = 30;
const REPEL_RADIUS = 400;

export function AmbientBackground() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const rafId = useRef(0);

  // Desktop-only visibility
  useEffect(() => {
    const checkWidth = () => setIsVisible(window.innerWidth >= 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Page-aware intensity
  const isSubdued = CONTENT_HEAVY_ROUTES.some(
    (route) =>
      location.pathname === route ||
      location.pathname.startsWith(route + '/')
  );

  // Scroll parallax — direct DOM, no React re-renders
  useEffect(() => {
    if (!isVisible) return;
    const onScroll = () => {
      if (containerRef.current) {
        const offset = Math.min(window.scrollY * 0.08, 200);
        containerRef.current.style.translate = `0px ${-offset}px`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isVisible]);

  // Mouse repel — rAF loop with throttled mousemove
  const updateRepel = useCallback(() => {
    const { x: mx, y: my } = mousePos.current;
    for (const orb of orbRefs.current) {
      if (!orb) continue;
      const rect = orb.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS && dist > 0) {
        const force = (1 - dist / REPEL_RADIUS) * MAX_REPEL;
        const rx = (dx / dist) * force;
        const ry = (dy / dist) * force;
        orb.style.translate = `${rx}px ${ry}px`;
      } else {
        orb.style.translate = '';
      }
    }
    rafId.current = requestAnimationFrame(updateRepel);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let lastMove = 0;
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMove < 32) return;
      lastMove = now;
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId.current = requestAnimationFrame(updateRepel);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [isVisible, updateRepel]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`ambient-background${isSubdued ? ' ambient-subdued' : ''}`}
      aria-hidden="true"
    >
      <div
        ref={(el) => { orbRefs.current[0] = el; }}
        className="ambient-orb ambient-orb--1"
      />
      <div
        ref={(el) => { orbRefs.current[1] = el; }}
        className="ambient-orb ambient-orb--2"
      />
      <div
        ref={(el) => { orbRefs.current[2] = el; }}
        className="ambient-orb ambient-orb--3"
      />
    </div>
  );
}
