/**
 * Bottom Sheet
 *
 * iOS-style bottom sheet with drag-to-dismiss gesture.
 * Uses Framer Motion for smooth spring animations.
 */

import React, { useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useReducedMotion,
} from 'framer-motion';
import type { PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Height of the sheet: 'auto', 'half', 'full' */
  height?: 'auto' | 'half' | 'full';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
}) => {
  const controls = useDragControls();
  const prefersReducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with high velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const getHeightStyle = () => {
    switch (height) {
      case 'full':
        return { maxHeight: '90vh', minHeight: '80vh' };
      case 'half':
        return { maxHeight: '50vh', minHeight: '40vh' };
      default:
        return { maxHeight: '90vh' };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="bottom-sheet"
            style={getHeightStyle()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', damping: 30, stiffness: 300 }
            }
            drag="y"
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div
              className="bottom-sheet-handle"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="bottom-sheet-handle-bar" />
            </div>

            {/* Optional title */}
            {title && (
              <div
                style={{
                  padding: '0 20px 16px',
                  borderBottom: '1px solid var(--color-white-10)',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                  }}
                >
                  {title}
                </h3>
              </div>
            )}

            {/* Content */}
            <div className="bottom-sheet-content" ref={contentRef}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
