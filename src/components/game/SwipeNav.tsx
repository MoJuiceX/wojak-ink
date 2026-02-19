import { NavLink } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import './SwipeNav.css';

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
    <nav className="swipe-nav hide-scrollbar">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `swipe-nav-link${isActive ? ' swipe-nav-link--active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="swipe-nav-divider" />
      <NavLink to="/arena" className="swipe-nav-link swipe-nav-link--cross">
        <Swords size={14} />
        Arena
      </NavLink>
    </nav>
  );
}
