/**
 * Desktop Layout Configuration
 *
 * Design tokens specific to desktop gallery optimization.
 */

export const DESKTOP_LAYOUT = {
  // Grid configuration
  grid: {
    gap: 24, // px between cards
    gapLarge: 32, // px at >=1440px
    paddingX: 48, // px horizontal page padding
    paddingXLarge: 64, // px at >=1440px
    maxWidth: 1400, // px max content width (default)
  },

  // Card dimensions
  card: {
    minWidth: 200, // px minimum card width
    maxWidth: 320, // px maximum card width
    aspectRatio: '1 / 1.15', // image + label area
    imageAspect: '1 / 1', // square image
    borderRadius: 16, // px
    labelHeight: 56, // px for name + count
  },

  // Explorer panel
  panel: {
    width: 600, // px base width
    widthLarge: 640, // px at >=1440px
    widthXL: 720, // px at >=1920px
    padding: 32, // px internal padding
    paddingTop: 24, // px top padding (below close button)
    headerHeight: 56, // px top bar height
    thumbnailStripWidth: 88, // px width of thumbnail sidebar
    thumbnailSize: 64, // px thumbnail dimensions
    thumbnailGap: 12, // px between thumbnails
    imageMaxHeight: '50vh', // max height for main image
  },

  // Overlay
  overlay: {
    background: 'rgba(0, 0, 0, 0.85)',
    blur: 20, // px backdrop blur - frosted glass
  },

  // Spacing
  spacing: {
    sectionGap: 32, // px between major sections
    cardPadding: 16, // px inside cards
    infoCardGap: 24, // px between info card sections
  },

  // Z-index (extends layout system)
  zIndex: {
    overlay: 60,
    panel: 70,
    panelThumbnails: 71,
    panelClose: 72,
  },

  // Transitions
  transitions: {
    panelSlide: {
      duration: 350, // ms
      easing: [0.32, 0.72, 0, 1], // Custom ease-out curve
    },
    overlayFade: {
      duration: 250, // ms
      easing: 'ease-out',
    },
    thumbnailScale: {
      duration: 200,
      easing: [0.4, 0, 0.2, 1],
    },
  },

  // Card hover effects
  cardHover: {
    liftY: -8, // px vertical lift
    liftYPressed: -4, // px reduced lift when pressed
    imageScale: 1.03, // image scale on hover
    pressedScale: 0.99, // card scale when pressed
    borderColor: 'rgba(255, 107, 0, 0.5)', // orange glow border
    shadow: {
      default: '0 2px 8px rgba(0, 0, 0, 0.1)',
      hover: [
        '0 12px 40px rgba(0, 0, 0, 0.15)',
        '0 0 0 1px rgba(255, 107, 0, 0.1)',
        '0 0 30px rgba(255, 107, 0, 0.1)',
      ].join(', '),
    },
  },
} as const;

export type DesktopLayoutConfig = typeof DESKTOP_LAYOUT;
