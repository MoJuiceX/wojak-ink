import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/arena', label: 'Battle', end: true },
  { to: '/arena/leaderboard', label: 'Leaderboard', end: false },
];

export function ArenaNav() {
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
    </nav>
  );
}
