// Wojak Swipe entry card — shown on GamesHub to promote the swipe game.
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WojakSwipeCard() {
  return (
    <Link
      to="/swipe"
      className="card-static p-4 flex items-center gap-4"
      style={{ borderLeft: '3px solid var(--color-primary)', marginBottom: 16, textDecoration: 'none' }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 107, 0, 0.12)',
          flexShrink: 0,
        }}
      >
        <Heart size={22} style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="flex flex-col gap-1" style={{ flex: 1 }}>
        <span className="font-bold" style={{ fontSize: 15 }}>Wojak Swipe</span>
        <span className="text-secondary" style={{ fontSize: 13 }}>Rate Wojaks, earn XP, and discover the community's favorites</span>
      </div>
      <span className="badge badge-success" style={{ fontSize: 11 }}>NEW</span>
    </Link>
  );
}
