import { NavLink } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Swords } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/swipe', label: 'Vote', end: true },
  { to: '/swipe/dashboard', label: 'Dashboard', end: false },
  { to: '/swipe/battles', label: 'Battles', end: false },
  { to: '/swipe/leaderboard', label: 'Leaderboard', end: false },
  { to: '/swipe/activity', label: 'Activity', end: false },
];

export function SwipeNav() {
  const { isRegistered } = useGame();

  if (!isRegistered) return null;

  return (
    <nav
      className="hide-scrollbar"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'var(--color-bg)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          })}
        >
          {item.label}
        </NavLink>
      ))}
      {/* Divider + Arena cross-link */}
      <div style={{
        width: 1,
        background: 'var(--color-border)',
        margin: '8px 4px',
        flexShrink: 0,
      }} />
      <NavLink
        to="/arena"
        style={{
          padding: '12px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          borderBottom: '2px solid transparent',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'color 150ms',
        }}
      >
        <Swords size={14} />
        Arena
      </NavLink>
    </nav>
  );
}
