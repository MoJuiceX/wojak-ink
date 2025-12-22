import { useState } from 'react'

/**
 * Unified icon renderer for StartMenu and DesktopIcons
 * Supports multiple icon types: img (string path), component, emoji
 * 
 * @param {Object} props
 * @param {Object|string|null} props.icon - Icon descriptor or legacy format
 * @param {string} props.className - Optional CSS class
 * @param {Object} props.style - Optional inline styles
 * @param {number} props.size - Icon size in pixels (default: 32)
 */
export default function AppIcon({ icon, className = '', style = {}, size = 32 }) {
  const [hasAttemptedFallback, setHasAttemptedFallback] = useState(false)

  // Normalize icon descriptor
  let iconDescriptor = icon

  // Backward compatibility: handle legacy formats
  if (typeof icon === 'string') {
    // Legacy: string path -> treat as img type
    iconDescriptor = { type: 'img', src: icon }
  } else if (icon === null || icon === undefined) {
    // Legacy: null -> return null (caller should handle fallback)
    return null
  }

  // Handle different icon types
  if (iconDescriptor.type === 'emoji') {
    // For StartMenu, add emoji-specific class when start-menu-item-icon is used
    const emojiClassName = className.includes('start-menu-item-icon')
      ? `${className} start-menu-emoji-icon`
      : className

    return (
      <span
        className={emojiClassName}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${size * 0.75}px`,
          ...style,
        }}
        aria-hidden="true"
      >
        {iconDescriptor.value}
      </span>
    )
  }

  if (iconDescriptor.type === 'component') {
    const Component = iconDescriptor.Component
    return (
      <Component
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          ...style,
        }}
      />
    )
  }

  if (iconDescriptor.type === 'img') {
    const handleError = (e) => {
      if (!hasAttemptedFallback) {
        // First error - try fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AppIcon] failed to load', { 
            src: iconDescriptor.src, 
            attemptedFallback: hasAttemptedFallback,
            iconType: iconDescriptor.type 
          })
        }
        setHasAttemptedFallback(true)
        // Directly set fallback src to avoid re-render delay
        e.target.src = '/icon/application-0.png'
      } else {
        // Fallback also failed - hide image to prevent infinite loop
        e.target.style.display = 'none'
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AppIcon] fallback icon also failed to load', {
            originalSrc: iconDescriptor.src,
            fallbackSrc: '/icon/application-0.png'
          })
        }
      }
    }

    // Use fallback src if we've already attempted it
    const src = hasAttemptedFallback ? '/icon/application-0.png' : iconDescriptor.src

    return (
      <img
        src={src}
        alt=""
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          imageRendering: 'pixelated',
          ...style,
        }}
        onError={handleError}
      />
    )
  }

  // Unknown type - return null
  if (process.env.NODE_ENV === 'development') {
    console.warn('Unknown icon type:', iconDescriptor.type)
  }
  return null
}

