import { NavLink } from 'react-router-dom';
import { Heart } from 'lucide-react';
import './ArenaNav.css';

const NAV_ITEMS = [
  { to: '/fight-club/battle', label: 'Battle', end: true },
  { to: '/fight-club/rankings', label: 'Rankings', end: false },
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
      <NavLink to="/fight-club/vote" className="arena-nav-link arena-nav-link--swipe">
        <Heart size={14} />
        Vote
      </NavLink>
    </nav>
  );
}
