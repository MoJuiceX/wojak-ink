import { NavLink } from 'react-router-dom';
import { Heart } from 'lucide-react';
import './ArenaNav.css';

const NAV_ITEMS = [
  { to: '/arena', label: 'Battle', end: true },
  { to: '/arena/leaderboard', label: 'Leaderboard', end: false },
];

export function ArenaNav() {
  return (
    <nav className="arena-nav hide-scrollbar">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `arena-nav-link${isActive ? ' arena-nav-link--active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="arena-nav-divider" />
      <NavLink to="/swipe" className="arena-nav-link arena-nav-link--swipe">
        <Heart size={14} />
        Swipe
      </NavLink>
    </nav>
  );
}
