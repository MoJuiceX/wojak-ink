/**
 * ImageWithPlaceholder
 *
 * Lazy-loaded image with blur placeholder effect.
 * Provides smooth loading experience on slow connections.
 */

import React, { useState, useRef, useEffect } from 'react';

interface ImageWithPlaceholderProps {
  src: string;
  alt: string;
  /** Optional low-res placeholder image URL */
  placeholder?: string;
  className?: string;
  /** Aspect ratio for the container (e.g., "1/1", "16/9") */
  aspectRatio?: string;
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

export const ImageWithPlaceholder: React.FC<ImageWithPlaceholderProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  aspectRatio = '1/1',
  objectFit = 'cover',
  onLoad,
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already cached
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      queueMicrotask(() => {
        setLoaded(true);
        onLoad?.();
      });
    }
  }, [src, onLoad]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Generate a placeholder color from the src (deterministic)
  const placeholderColor = `hsl(${(src.charCodeAt(0) * 7) % 360}, 30%, 20%)`;

  return (
    <div
      className={`image-container ${className}`}
      style={{
        aspectRatio,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: placeholderColor,
      }}
    >
      {/* Blur placeholder */}
      {!loaded && !error && (
        <div
          className={`blur-placeholder ${loaded ? 'hidden' : ''}`}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: placeholder ? `url(${placeholder})` : undefined,
            backgroundColor: !placeholder ? placeholderColor : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: placeholder ? 'blur(20px)' : 'none',
            transform: 'scale(1.1)',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Loading shimmer effect */}
      {!loaded && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, transparent 0%, var(--color-white-10) 50%, transparent 100%)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-black-50)',
            color: 'var(--color-white-50)',
            fontSize: '2rem',
          }}
        >
          ⚠️
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
};

export default ImageWithPlaceholder;
