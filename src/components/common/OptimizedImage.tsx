/**
 * Optimized Image
 *
 * Progressive image loading with lazy loading, blur placeholder,
 * and intersection observer for performance.
 */

import React, { useState, useRef, useEffect } from 'react';
import './OptimizedImage.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  /** Optional low-res placeholder (if not provided, uses skeleton) */
  placeholderSrc?: string;
  /** Margin before lazy load triggers (default: '100px') */
  rootMargin?: string;
  /** Aspect ratio for placeholder (e.g., '16/9', '1/1') */
  aspectRatio?: string;
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  /** Called when image finishes loading */
  onLoad?: () => void;
  /** Called on load error */
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderSrc,
  rootMargin = '400px',
  aspectRatio,
  objectFit = 'cover',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    aspectRatio,
  };

  const containerClasses = [
    'optimized-image',
    className,
    isLoaded ? 'loaded' : '',
    hasError ? 'error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={containerStyle}
    >
      {/* Skeleton/Placeholder */}
      {!isLoaded && !hasError && (
        <div className="optimized-image-placeholder">
          {placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt=""
              className="placeholder-img"
              aria-hidden="true"
            />
          ) : (
            <div className="placeholder-skeleton" />
          )}
        </div>
      )}

      {/* Full image (lazy loaded) */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`optimized-image-full ${isLoaded ? 'visible' : ''}`}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="optimized-image-error">
          <span>Failed to load</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
