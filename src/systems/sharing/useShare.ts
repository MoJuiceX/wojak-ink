/**
 * Share Hook
 *
 * Provides sharing functionality for game scores.
 * Uses Web Share API when available, with fallbacks.
 */

import { useCallback, useState } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { ShareData, ScoreShareData, SharePlatform } from './types';
import { generateScoreImage, generateScoreImageWithScreenshot, generateShareText, getShareUrl } from './ShareImageGenerator';

interface UseShareReturn {
  isSharing: boolean;
  shareSupported: boolean;
  shareScore: (data: ScoreShareData, screenshot?: string | null) => Promise<boolean>;
  shareToPlatform: (platform: SharePlatform, data: ShareData) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

export const useShare = (): UseShareReturn => {
  const { profile, isSignedIn } = useUserProfile();
  const [isSharing, setIsSharing] = useState(false);

  // Check if Web Share API is supported
  const shareSupported = typeof navigator !== 'undefined' && 'share' in navigator;

  // Share a score (with optional screenshot)
  const shareScore = useCallback(async (data: ScoreShareData, screenshot?: string | null): Promise<boolean> => {
    setIsSharing(true);

    try {
      // Add username to data if available
      const shareData: ScoreShareData = {
        ...data,
        username: profile?.displayName || profile?.xHandle || data.username
      };

      // Generate share text
      const text = generateShareText(shareData);
      const url = getShareUrl(shareData.gameId, isSignedIn ? 'user' : undefined);

      // Try native share with image
      if (navigator.share && navigator.canShare) {
        try {
          // Generate image (with screenshot if available)
          const imageBlob = screenshot
            ? await generateScoreImageWithScreenshot(shareData, screenshot)
            : await generateScoreImage(shareData);
          const imageFile = new File([imageBlob], 'wojak-score.png', { type: 'image/png' });

          const sharePayload = {
            title: `${shareData.gameName} Score`,
            text,
            url,
            files: [imageFile]
          };

          // Check if we can share files
          if (navigator.canShare(sharePayload)) {
            await navigator.share(sharePayload);
            trackShare('native-image', shareData.gameId);
            return true;
          }
        } catch (e) {
          // Fall through to text-only share
        }

        // Try text-only share
        try {
          await navigator.share({ title: `${shareData.gameName} Score`, text, url });
          trackShare('native-text', shareData.gameId);
          return true;
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.error('Share failed:', e);
          }
          return false;
        }
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      trackShare('clipboard', shareData.gameId);
      return true;

    } catch (error) {
      console.error('Share error:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [profile, isSignedIn]);

  // Share to specific platform
  const shareToPlatform = useCallback(async (
    platform: SharePlatform,
    data: ShareData
  ): Promise<boolean> => {
    const encodedText = encodeURIComponent(data.text);
    const encodedUrl = encodeURIComponent(data.url);

    let shareUrl: string;

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'copy':
        return copyToClipboard(`${data.text}\n\n${data.url}`);
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share(data);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      default:
        return false;
    }

    // Open share URL in new window
    window.open(shareUrl, '_blank', 'width=600,height=400');
    trackShare(platform, 'manual');
    return true;
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, []);

  return {
    isSharing,
    shareSupported,
    shareScore,
    shareToPlatform,
    copyToClipboard
  };
};

// Analytics tracking
function trackShare(_method: string, _gameId: string): void {
  // Could send to analytics service here
  // analytics.track('share', { method, gameId });
}

export default useShare;
