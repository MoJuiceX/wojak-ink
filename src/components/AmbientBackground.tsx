import { useEffect, useState } from 'react';

export function AmbientBackground() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on desktop
    const checkWidth = () => setIsVisible(window.innerWidth >= 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--orange" />
      <div className="ambient-orb ambient-orb--purple" />
      <div className="ambient-orb ambient-orb--pink" />
    </div>
  );
}
