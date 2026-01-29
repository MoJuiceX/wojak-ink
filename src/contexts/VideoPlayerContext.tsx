/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface VideoItem {
  id: string;
  title: string;
  platform: 'local' | 'youtube';
  videoFile: string;
  thumbnail?: string;
  author?: string;
}

// Music videos playlist
const MUSIC_VIDEOS: VideoItem[] = [
  {
    id: '1',
    title: 'HIT YAH! Neckbeard Punk Tactics',
    platform: 'local',
    videoFile: '/assets/videos/hit-yah-neckbeard-punk.mp4',
    thumbnail: '/assets/videos/TN_hit-yah-neckbeard-punk.png',
    author: '@yamidotmp3'
  },
  {
    id: '2',
    title: 'Pokemon Tang Gang - Gotta Trade em All!',
    platform: 'local',
    videoFile: '/assets/videos/pokemon-tang-gang.mp4',
    thumbnail: '/assets/videos/TN_pokemon-tang-gang.png',
    author: '@yamidotmp3'
  },
  {
    id: '3',
    title: 'Multi-Billion DAO Marketing Agency',
    platform: 'local',
    videoFile: '/assets/videos/multi-billion-dao.mp4',
    thumbnail: '/assets/videos/TN_multi-billion-dao.png',
    author: '@OrangeGooey'
  },
  {
    id: '4',
    title: 'WizNerd Music',
    platform: 'local',
    videoFile: '/assets/videos/wiznerd-music.mov',
    thumbnail: '/assets/videos/TN_wiznerd-music.png',
    author: '@WizNerd'
  },
];

interface VideoPlayerContextType {
  currentVideo: VideoItem | null;
  nextVideo: VideoItem | null;
  isOpen: boolean;
  openVideo: (video: VideoItem) => void;
  closeVideo: () => void;
  playNext: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export const VideoPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Compute next video based on current video
  const nextVideo = React.useMemo(() => {
    if (!currentVideo) return null;
    const currentIndex = MUSIC_VIDEOS.findIndex(v => v.id === currentVideo.id);
    if (currentIndex === -1) return null;
    const nextIndex = (currentIndex + 1) % MUSIC_VIDEOS.length;
    return MUSIC_VIDEOS[nextIndex];
  }, [currentVideo]);

  const openVideo = useCallback((video: VideoItem) => {
    setCurrentVideo(video);
    setIsOpen(true);
  }, []);

  const closeVideo = useCallback(() => {
    setIsOpen(false);
    setCurrentVideo(null);
  }, []);

  const playNext = useCallback(() => {
    if (!currentVideo) return;

    // Find current video index in playlist
    const currentIndex = MUSIC_VIDEOS.findIndex(v => v.id === currentVideo.id);
    if (currentIndex === -1) {
      // Not in playlist, just loop current video
      return;
    }

    // Get next video (loop back to start if at end)
    const nextIndex = (currentIndex + 1) % MUSIC_VIDEOS.length;
    const nextVid = MUSIC_VIDEOS[nextIndex];
    setCurrentVideo(nextVid);
  }, [currentVideo]);

  return (
    <VideoPlayerContext.Provider value={{ currentVideo, nextVideo, isOpen, openVideo, closeVideo, playNext }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

export { MUSIC_VIDEOS };

export const useVideoPlayer = () => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider');
  }
  return context;
};
