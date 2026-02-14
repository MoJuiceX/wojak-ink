/**
 * TabNavigation Component
 *
 * Premium tab navigation with animated indicator and glass morphism.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, HelpCircle, List } from 'lucide-react';
import type { BigPulpTab } from '@/types/bigpulp';
import { TAB_TRANSITION } from '@/config/bigpulpAnimations';
import { useHaptic } from '@/hooks/useHaptic';

interface TabNavigationProps {
  activeTab: BigPulpTab;
  onTabChange: (tab: BigPulpTab) => void;
}

interface TabConfig {
  id: BigPulpTab;
  label: string;
  shortLabel: string; // For mobile
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'market', label: 'Market', shortLabel: 'Market', icon: BarChart3 },
  { id: 'ask', label: 'Ask BigPulp', shortLabel: 'BigPulp', icon: HelpCircle },
  { id: 'attributes', label: 'Attributes', shortLabel: 'Traits', icon: List },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const prefersReducedMotion = useReducedMotion();
  const haptic = useHaptic();
  const tabsRef = useRef<Map<BigPulpTab, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position
  useEffect(() => {
    const activeElement = tabsRef.current.get(activeTab);
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeTab]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          newIndex = currentIndex > 0 ? currentIndex - 1 : TABS.length - 1;
          break;
        case 'ArrowRight':
          newIndex = currentIndex < TABS.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      haptic.selection();
      const newTab = TABS[newIndex];
      onTabChange(newTab.id);
      tabsRef.current.get(newTab.id)?.focus();
    },
    [onTabChange, haptic]
  );

  return (
    <div
      className="relative"
      role="tablist"
      aria-label="Analysis sections"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Tab buttons */}
      <div className="flex p-2.5 gap-2.5">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              ref={(el) => {
                if (el) tabsRef.current.set(tab.id, el);
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`bigpulp-btn flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold transition-all relative rounded-lg ${isActive ? 'bigpulp-btn-active' : ''}`}
              style={{
                color: isActive
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-text-muted)',
                border: isActive
                  ? '1px solid var(--color-border-active)'
                  : '1px solid var(--color-border)',
                boxShadow: isActive
                  ? 'var(--glow-primary)'
                  : 'none',
              }}
              onClick={() => {
                haptic.tap();
                onTabChange(tab.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      scale: 1.02,
                      borderColor: 'var(--color-border-hover)',
                    }
              }
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            >
              <Icon
                size={18}
                style={{
                  opacity: isActive ? 1 : 0.7,
                }}
              />
              {/* Full label on desktop, short on mobile */}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              
              {/* Active glow effect */}
              {isActive && !prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    boxShadow: 'inset 0 0 12px var(--color-primary-muted)',
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Subtle animated glow under active tab */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--color-brand-primary), transparent)',
            boxShadow: '0 0 12px var(--color-brand-glow)',
            left: indicatorStyle.left + 8,
            width: indicatorStyle.width - 16,
          }}
          animate={{
            left: indicatorStyle.left + 8,
            width: indicatorStyle.width - 16,
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            left: prefersReducedMotion ? { duration: 0 } : TAB_TRANSITION,
            width: prefersReducedMotion ? { duration: 0 } : TAB_TRANSITION,
            opacity: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        />
      )}
    </div>
  );
}

export default TabNavigation;
