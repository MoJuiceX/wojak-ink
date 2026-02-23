/**
 * Progressive Image Component
 *
 * Blur → Full resolution progressive loading with:
 * - Lazy loading (loading="lazy")
 * - WebP + PNG fallback
 * - IPFS URL caching
 * - Automatic blur-up effect
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCachedIPFSUrl, getOptimalImageUrl } from '@/utils/imageFormat';
import './ProgressiveImage.css';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  blur?: boolean;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  eager?: boolean;
}

/**
 * Generate a minimal blur hash image (solid color placeholder)
 */
function generateBlurPlaceholder(url: string): string {
  // Create a 1x1 pixel placeholder using a hash of the URL
  const hash = url.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const hue = (hash % 360);
  const saturation = 40 + (hash % 40);
  const lightness = 60 + (hash % 20);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
      <rect fill="hsl(${hue}, ${saturation}%, ${lightness}%)" width="1" height="1"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * ProgressiveImage Component
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  blur = true,
  width,
  height,
  objectFit = 'cover',
  onLoad,
  onError,
  eager = false,
}) => {
  const [imageUrl, setImageUrl] = useState(src);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle IPFS URLs and determine optimal format
  useEffect(() => {
    if (!src) return;

    let cancelled = false;

    (async () => {
      try {
        // Handle IPFS URLs
        let url = src;
        if (src.includes('Qm') && src.length === 46) {
          // It's an IPFS hash
          url = getCachedIPFSUrl(src);
        }

        // Get optimal format (WebP + fallback)
        const { primary, fallback } = await getOptimalImageUrl(url);

        if (!cancelled) {
          setPrimaryUrl(primary);
          setFallbackUrl(fallback);
          setImageUrl(primary);
        }
      } catch (error) {
        console.warn('Error processing image URL:', error);
        if (!cancelled) {
          setImageUrl(src);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const blurUrl = blur ? generateBlurPlaceholder(imageUrl) : undefined;

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    // Try fallback if primary failed
    if (primaryUrl && fallbackUrl && imageUrl === primaryUrl) {
      setImageUrl(fallbackUrl);
      return;
    }

    setHasError(true);
    onError?.();
  };

  return (
    <motion.div
      className={`progressive-image-wrapper ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {blurUrl && !isLoaded && (
        <motion.img
          src={blurUrl}
          alt={alt}
          className="progressive-image-blur"
          style={{
            width: '100%',
            height: '100%',
            objectFit,
          }}
          aria-hidden="true"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      <motion.img
        src={imageUrl}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        className={`progressive-image-main ${isLoaded ? 'loaded' : ''} ${
          hasError ? 'error' : ''
        }`}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
        }}
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {hasError && (
        <div
          className="progressive-image-error"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-error, #ef4444)',
          }}
        >
          <span style={{ color: 'white', fontSize: '0.875rem' }}>
            Image failed to load
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default ProgressiveImage;
