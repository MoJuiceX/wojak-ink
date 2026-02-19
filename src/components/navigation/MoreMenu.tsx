/**
 * More Menu Component
 *
 * Premium slide-up sheet for secondary navigation on mobile.
 * Supports swipe-to-dismiss gesture.
 */

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

// Reordered: BigPulp first (AI feature), Account, then actions, community, settings last
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
          {/* Backdrop */}
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

          {/* Sheet - positioned above the bottom nav (80px) */}
          <motion.div
            className="fixed left-0 right-0 z-[9999] glass-strong"
            style={{
              bottom: 80, // Above the mobile navigation bar
              background: '#1a1a24', // Solid dark background
              borderTop: '1px solid var(--color-white-8)',
              borderRadius: '20px 20px 0 0',
              maxHeight: 'calc(100vh - 160px)',
              boxShadow: '0 -8px 32px var(--color-black-50)',
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
            {/* Drag handle */}
            <div 
              className="flex justify-center pt-3 pb-1"
              style={{ touchAction: 'none' }}
            >
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'var(--color-white-25)' }}
              />
            </div>

            {/* Header */}
            <div className="px-5 pt-1 pb-3">
              <h2 
                className="text-base font-semibold"
                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
              >
                Menu
              </h2>
            </div>

            {/* Menu items */}
            <nav 
              className="px-3 pb-4 flex flex-col gap-1.5"
              style={{ touchAction: 'pan-y' }}
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
