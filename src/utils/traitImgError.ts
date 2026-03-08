/**
 * Shared image error handler for generator trait grid cards.
 *
 * Strategy:
 *  1. On first failure → retry once with a cache-busting query param.
 *  2. On second failure → hide the image (opacity 0) so the card still
 *     renders its label overlay without an ugly broken-image icon.
 *
 * This guards against stale CDN caches and transient network errors
 * that can occur during or right after a deployment.
 */
export function handleTraitImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.dataset.retried) {
    // First failure — retry with cache bust
    img.dataset.retried = '1';
    const sep = img.src.includes('?') ? '&' : '?';
    img.src = `${img.src}${sep}cb=${Date.now()}`;
  } else {
    // Second failure — hide gracefully
    img.style.opacity = '0';
  }
}
