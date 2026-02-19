/**
 * NavItem Component
 *
 * Individual navigation item used in Sidebar and MobileNavigation.
 * Shows icon, optional label, and badge indicator.
 */

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useHaptic } from '@/hooks/useHaptic';
import { useNavigationPreload } from '@/hooks/usePreloadCoordinator';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  isActive: boolean;
  onClick: () => void;
  showLabel?: boolean;
  badge?: number | 'dot';
  disabled?: boolean;
  tooltip?: string;
  variant?: 'sidebar' | 'mobile';
  className?: string;
  path?: string; // For navigation preloading
  featured?: boolean; // Special styling for featured items (e.g., BigPulp)
}

export const NavItem = memo(function NavItem({
  icon: Icon,
  label,
  shortLabel,
  isActive,
  onClick,
  showLabel = true,
  badge,
  disabled = false,
  tooltip,
  variant = 'sidebar',
  className = '',
  path,
  featured = false,
}: NavItemProps) {
  void shortLabel; // Reserved for collapsed sidebar mode
  const prefersReducedMotion = usePrefersReducedMotion();
  const haptic = useHaptic();
  const [showTooltip, setShowTooltip] = useState(false);
  const { onMouseEnter: onPreloadHover } = useNavigationPreload(path || '');

  const handleClick = () => {
    if (disabled) return;
    haptic.tap();
    onClick();
  };

  // Combined hover handler for sidebar: tooltip + preload
  const handleSidebarMouseEnter = useCallback(() => {
    if (tooltip) setShowTooltip(true);
    if (path) onPreloadHover();
  }, [tooltip, path, onPreloadHover]);

  if (variant === 'mobile') {
    // Featured mobile item (BigPulp) gets elevated FAB-style treatment
    if (featured) {
      return (
        <motion.button
          type="button"
          className={`
            flex flex-col items-center justify-center gap-1 flex-1 py-2
            transition-colors duration-150 relative
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          style={{
            color: '#F97316',
          }}
          onClick={handleClick}
          whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.95 }}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={disabled}
          role="tab"
          aria-selected={isActive}
        >
          {/* FAB-style elevated icon wrapper */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              marginTop: -16,
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              borderRadius: '50%',
              boxShadow: '0 4px 20px var(--color-primary-40), 0 0 30px var(--color-primary-20)',
              border: '3px solid rgba(10, 10, 10, 0.95)',
            }}
          >
            {/* Subtle glow pulse - no jarring ring animation */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, var(--color-primary-30) 0%, transparent 70%)',
              }}
              animate={
                !prefersReducedMotion
                  ? {
                      opacity: [0.5, 1, 0.5],
                    }
                  : {}
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              animate={
                !prefersReducedMotion
                  ? { y: [0, -2, 0] }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                filter: 'drop-shadow(0 2px 4px var(--color-black-30))',
              }}
            >
              <Icon size={26} color="white" aria-hidden="true" />
            </motion.div>
          </div>
        </motion.button>
      );
    }

    // Regular mobile item
    return (
      <motion.button
        type="button"
        className={`
          flex flex-col items-center justify-center gap-1 flex-1 py-2
          transition-colors duration-150 relative
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          color: isActive
            ? '#F97316'
            : 'rgba(255, 255, 255, 0.5)',
        }}
        onClick={handleClick}
        whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.9 }}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled}
        role="tab"
        aria-selected={isActive}
      >
        <div className="relative">
          <motion.div
            animate={
              isActive && !prefersReducedMotion ? { scale: 1.1 } : { scale: 1 }
            }
            transition={{ duration: 0.15 }}
            style={{
              // Icon glow when active
              filter: isActive ? 'drop-shadow(0 0 8px #F97316)' : 'none',
            }}
          >
            <Icon size={24} aria-hidden="true" />
          </motion.div>

          {/* Badge with glow */}
          {badge && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center"
              style={{
                background: '#F97316',
                minWidth: badge === 'dot' ? 8 : 16,
                height: badge === 'dot' ? 8 : 16,
                borderRadius: badge === 'dot' ? 4 : 8,
                fontSize: 10,
                fontWeight: 600,
                color: 'white',
                boxShadow: '0 0 8px var(--color-primary-50)',
              }}
              aria-label={
                badge === 'dot'
                  ? 'New'
                  : `${badge} notification${badge === 1 ? '' : 's'}`
              }
            >
              {badge !== 'dot' && badge}
            </span>
          )}
        </div>
      </motion.button>
    );
  }

  // Sidebar variant
  return (
    <motion.button
      type="button"
      className={`
        relative flex items-center w-full rounded-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${featured ? 'nav-item-featured' : ''}
        ${className}
      `}
      style={{
        height: 48,
        paddingLeft: 12,
        paddingRight: 12,
        background: featured
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)'
          : isActive
            ? 'var(--color-surface)'
            : 'transparent',
        color: featured || isActive
          ? 'var(--color-primary)'
          : 'var(--color-text-secondary)',
      }}
      onClick={handleClick}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      whileHover={
        disabled
          ? undefined
          : {
              background: isActive
                ? 'var(--color-surface)'
                : 'var(--color-surface-hover)',
            }
      }
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.98 }}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            className="absolute left-full ml-2 px-2 py-1 rounded-md whitespace-nowrap pointer-events-none text-secondary"
            style={{
              background: 'var(--color-elevated)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              zIndex: 100,
            }}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Active indicator bar with enhanced glow */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-1/2 w-[3px] rounded-r-full"
          style={{
            background: '#F97316',
            boxShadow: '0 0 15px #F97316, 0 0 30px var(--color-primary-30)',
          }}
          initial={prefersReducedMotion ? { height: 24 } : { height: 0 }}
          animate={{ height: 32, y: '-50%' }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      )}

      {/* Icon - fixed width container to prevent movement during sidebar animation */}
      <motion.div
        className={`flex items-center justify-center flex-shrink-0 relative ${featured ? 'nav-icon-featured' : ''}`}
        style={{
          width: 24,
          height: 24,
          // Icon glow when active or featured
          filter: (isActive || featured) ? 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' : 'none',
        }}
        animate={
          featured && !prefersReducedMotion
            ? { y: [0, -3, 0] }
            : {}
        }
        transition={
          featured
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      >
        <Icon size={24} aria-hidden="true" />

        {/* Badge (collapsed state) */}
        {badge && !showLabel && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center"
            style={{
              background: 'var(--color-primary)',
              minWidth: badge === 'dot' ? 6 : 14,
              height: badge === 'dot' ? 6 : 14,
              borderRadius: badge === 'dot' ? 3 : 7,
              fontSize: 9,
              fontWeight: 600,
              color: 'white',
            }}
            aria-label={
              badge === 'dot'
                ? 'New'
                : `${badge} notification${badge === 1 ? '' : 's'}`
            }
          >
            {badge !== 'dot' && badge}
          </span>
        )}
      </motion.div>

      {/* Label and badge (expanded state) */}
      <AnimatePresence>
        {showLabel && (
          <motion.div
            className="flex items-center justify-between flex-1 ml-3 overflow-hidden"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
          <span
            className="font-medium truncate"
            style={{
              fontSize: '1.05rem',
              textShadow: isActive ? 'var(--glow-subtle)' : 'none',
            }}
          >
            {label}
          </span>

          {/* Badge */}
          {badge && (
            <span
              className="ml-2 flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--color-primary)',
                minWidth: badge === 'dot' ? 8 : 18,
                height: badge === 'dot' ? 8 : 18,
                borderRadius: badge === 'dot' ? 4 : 9,
                fontSize: 10,
                fontWeight: 600,
                color: 'white',
              }}
              aria-label={
                badge === 'dot'
                  ? 'New'
                  : `${badge} notification${badge === 1 ? '' : 's'}`
              }
            >
              {badge !== 'dot' && badge}
            </span>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

export default NavItem;
