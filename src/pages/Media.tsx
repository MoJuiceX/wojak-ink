/**
 * Media Hub Page
 *
 * Music videos and music player.
 * Games have been moved to /games route.
 */

import { useCallback } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import { useLayout } from '@/hooks/useLayout';
import { useMedia } from '@/contexts/MediaContext';
import { VideosGrid } from '@/components/media/video/VideosGrid';
import { MusicPlayer } from '@/components/media/music/MusicPlayer';
import { useMediaContent } from '@/hooks/data/useMediaData';
import type { VideoItem } from '@/types/media';

export default function Media() {
  const { isDesktop } = useLayout();
  const { setVideoQueue } = useMedia();

  // Fetch media content using TanStack Query
  const { videos = [], tracks = [], isLoading } = useMediaContent();

  const handleVideoSelect = useCallback(
    (video: VideoItem) => {
      // Set the full video queue so auto-play next works
      const videoIndex = videos.findIndex(v => v.id === video.id);
      setVideoQueue(videos, videoIndex >= 0 ? videoIndex : 0);
    },
    [videos, setVideoQueue]
  );

  // Use consistent 16px padding to match grid gap
  const pagePadding = 16;

  return (
    <PageTransition>
      <PageSEO
        title="Media"
        description="Browse Wojak.ink media, games, and community content."
        path="/media"
      />
      <div className="min-h-full" style={{ padding: pagePadding }}>
        <div
          className="space-y-8 pb-24 pt-4"
          style={{ maxWidth: isDesktop ? '1200px' : undefined, margin: '0 auto' }}
        >
          {/* Videos Section */}
          <VideosGrid
            videos={videos}
            onVideoSelect={handleVideoSelect}
            isLoading={isLoading}
          />

          {/* Divider */}
          <div
            className="h-px"
            style={{ background: 'var(--color-border)' }}
          />

          {/* Music Section */}
          <MusicPlayer tracks={tracks} defaultExpanded={isDesktop} isLoading={isLoading} />
        </div>
      </div>
    </PageTransition>
  );
}
