/**
 * SkipLink Component
 *
 * Accessibility skip link for keyboard navigation.
 * Hidden until focused, allows users to skip to main content.
 */

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[200]
        px-4 py-2 rounded-lg
        font-medium text-sm
        transition-all duration-200
        focus:outline-none focus:ring-2
      "
      style={{
        background: 'var(--color-primary)',
        color: 'white',
        boxShadow: 'var(--glow-primary)',
      }}
    >
      {children}
    </a>
  );
}

export default SkipLink;
