/**
 * More Menu Component
 *
 * Full-screen slide-up overlay for secondary navigation on mobile.
 * - Covers the entire viewport including behind the bottom nav
 * - Body scroll is locked while open
 * - Menu content scrolls independently if it exceeds viewport
 * - Swipe-to-dismiss gesture supported
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  ShoppingBag,
  Users,
  Landmark,
  Settings,
  User,
  MessageCircle,
  Lightbulb,
  Gamepad2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  description: string;
  route: string;
  badge?: string;
  iconColor: string;
  iconBg: string;
}

// Reordered: BigPulp first (AI feature), Account, Games (moved from bottom nav), then actions, community, settings last
const menuItems: MenuItem[] = [
  {
    icon: Lightbulb,
    label: 'BigPulp',
    description: 'Chat with the AI oracle',
    route: '/bigpulp',
    badge: 'AI',
    iconColor: '#fbbf24',
    iconBg: 'rgba(251, 191, 36, 0.15)',
  },
  {
    icon: User,
    label: 'Account',
    description: 'Your profile',
    route: '/account',
    iconColor: '#60a5fa',
    iconBg: 'rgba(96, 165, 250, 0.15)',
  },
  {
    icon: Gamepad2,
    label: 'Games',
    description: 'Arcade games and leaderboards',
    route: '/games',
    iconColor: '#22c55e',
    iconBg: 'rgba(34, 197, 94, 0.15)',
  },
  {
    icon: ShoppingBag,
    label: 'Shop',
    description: 'Spend your oranges and gems',
    route: '/shop',
    iconColor: '#f97316',
    iconBg: 'var(--color-primary-15)',
  },
  {
    icon: MessageCircle,
    label: 'Chat Rooms',
    description: 'Join holder conversations',
    route: '/chat',
    iconColor: '#10b981',
    iconBg: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: Users,
    label: 'Guild',
    description: 'Join or create a guild',
    route: '/guild',
    badge: 'Soon',
    iconColor: '#a78bfa',
    iconBg: 'rgba(167, 139, 250, 0.15)',
  },
  {
    icon: Landmark,
    label: 'Treasury',
    description: 'Community wallet',
    route: '/treasury',
    iconColor: '#34d399',
    iconBg: 'rgba(52, 211, 153, 0.15)',
  },
  {
    icon: Settings,
    label: 'Settings',
    description: 'Theme, audio, and more',
    route: '/settings',
    iconColor: '#94a3b8',
    iconBg: 'rgba(148, 163, 184, 0.12)',
  },
];

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreMenu({ isOpen, onClose }: MoreMenuProps) {
  const navigate = useNavigate();

  // Lock body scroll while menu is open (robust iOS fix)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const original = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      top: document.body.style.top,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    return () => {
      document.body.style.overflow = original.overflow;
      document.body.style.position = original.position;
      document.body.style.width = original.width;
      document.body.style.top = original.top;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleItemClick = (route: string) => {
    navigate(route);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle drag end - close if dragged down enough
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.velocity.y > 300 || info.offset.y > 100;
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Full-screen backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998]"
            style={{
              background: 'var(--color-black-70)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
          />

          {/* Full-screen sheet — covers entire viewport, scrollable content */}
          <motion.div
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{
              background: '#1a1a24',
            }}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'tween',
              duration: 0.25,
              ease: [0.32, 0.72, 0, 1],
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
          >
            {/* Top safe area + drag handle + header */}
            <div
              className="flex-shrink-0"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              }}
            >
              {/* Drag handle */}
              <div
                className="flex justify-center pb-1"
                style={{ touchAction: 'none' }}
              >
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'var(--color-white-25)' }}
                />
              </div>

              {/* Header with close button */}
              <div className="px-5 pt-1 pb-3 flex items-center justify-between">
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  Menu
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--color-white-5)' }}
                  aria-label="Close menu"
                >
                  <X size={16} style={{ color: 'var(--color-white-60)' }} />
                </button>
              </div>
            </div>

            {/* Scrollable menu items */}
            <nav
              className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-1.5"
              style={{
                touchAction: 'pan-y',
                overscrollBehavior: 'contain',
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              }}
              role="menu"
              aria-label="Secondary navigation"
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isDisabled = item.badge === 'Soon';
                const isSpecialBadge = item.badge && item.badge !== 'Soon';

                return (
                  <button
                    key={item.route}
                    type="button"
                    role="menuitem"
                    aria-label={`${item.label} - ${item.description}`}
                    className="flex items-center gap-3 p-3 rounded-xl w-full text-left active:scale-[0.98] transition-transform"
                    style={{
                      background: 'var(--color-white-5)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      opacity: isDisabled ? 0.45 : 1,
                    }}
                    onClick={() => !isDisabled && handleItemClick(item.route)}
                    disabled={isDisabled}
                  >
                    {/* Icon */}
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-xl"
                      style={{
                        background: item.iconBg,
                      }}
                    >
                      <Icon
                        size={22}
                        style={{ color: item.iconColor }}
                        strokeWidth={2}
                      />
                    </div>

                    {/* Text */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold text-[15px]"
                          style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                            style={{
                              background: isSpecialBadge
                                ? 'rgba(245, 158, 11, 0.2)'
                                : 'rgba(167, 139, 250, 0.2)',
                              color: isSpecialBadge ? '#f59e0b' : '#a78bfa',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[13px]"
                        style={{ color: 'var(--color-white-40)' }}
                      >
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MoreMenu;
