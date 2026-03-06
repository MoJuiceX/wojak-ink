/**
 * Mock Media Data
 *
 * Mock data for videos and music during development.
 */

import type { VideoItem, MusicTrack, VideoCategory } from '@/types/media';

// ============ Music Videos ============

export const MOCK_VIDEOS: VideoItem[] = [
  {
    id: 'pokemon-tang-gang',
    title: 'Pokemon Tang Gang',
    description: 'Tang Gang meets Pokemon in this epic music video',
    videoUrl: '/assets/videos/pokemon-tang-gang.mp4',
    thumbnailUrl: '/assets/videos/TN_pokemon-tang-gang.webp',
    duration: 180,
    durationFormatted: '3:00',
    uploadDate: new Date('2024-01-15'),
    viewCount: 12500,
    category: 'music-video',
    tags: ['official', 'pokemon', 'tang-gang'],
    hasCaptions: false,
    hasAudioDescription: false,
  },
  {
    id: 'hit-yah-neckbeard-punk',
    title: 'Hit Yah Neckbeard Punk',
    description: 'The neckbeard anthem for the Tang Gang community',
    videoUrl: '/assets/videos/hit-yah-neckbeard-punk.mp4',
    thumbnailUrl: '/assets/videos/TN_hit-yah-neckbeard-punk.webp',
    duration: 150,
    durationFormatted: '2:30',
    uploadDate: new Date('2024-02-20'),
    viewCount: 8500,
    category: 'music-video',
    tags: ['neckbeard', 'punk', 'tang-gang'],
    hasCaptions: false,
    hasAudioDescription: false,
  },
  {
    id: 'multi-billion-dao',
    title: 'Multi Billion DAO',
    description: 'The DAO anthem - reaching for billions',
    videoUrl: '/assets/videos/multi-billion-dao.mp4',
    thumbnailUrl: '/assets/videos/TN_multi-billion-dao.webp',
    duration: 200,
    durationFormatted: '3:20',
    uploadDate: new Date('2024-03-10'),
    viewCount: 9500,
    category: 'music-video',
    tags: ['dao', 'billions', 'tang-gang'],
    hasCaptions: false,
    hasAudioDescription: false,
  },
  {
    id: 'wiznerd-music',
    title: 'Wiznerd Music',
    description: 'The wizard nerd strikes again',
    videoUrl: '/assets/videos/wiznerd-music.mp4',
    thumbnailUrl: '/assets/videos/TN_wiznerd-music.webp',
    duration: 240,
    durationFormatted: '4:00',
    uploadDate: new Date('2024-04-01'),
    viewCount: 7200,
    category: 'music-video',
    tags: ['wizard', 'nerd', 'tang-gang'],
    hasCaptions: false,
    hasAudioDescription: false,
  },
];

// ============ Music Tracks ============

export const MOCK_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Wojak Music',
    artist: 'Tang Gang Studios',
    album: 'Wojak Vibes Vol. 1',
    audioUrl: '/assets/music/wojakmusic1.mp3',
    duration: 225,
    durationFormatted: '3:45',
    coverArtUrl: '/assets/videos/TN_pokemon-tang-gang.webp',
    coverArtColors: {
      primary: '#ff6b00',
      secondary: '#ff8c00',
    },
    genre: 'Electronic',
    mood: ['energetic', 'hype'],
    bpm: 128,
  },
];

// ============ Helper Functions ============

/**
 * Get videos by category
 */
export function getVideosByCategory(category: VideoCategory | 'all'): VideoItem[] {
  if (category === 'all') return MOCK_VIDEOS;
  return MOCK_VIDEOS.filter((video) => video.category === category);
}

/**
 * Get video by ID
 */
export function getVideoById(id: string): VideoItem | undefined {
  return MOCK_VIDEOS.find((video) => video.id === id);
}

/**
 * Get track by ID
 */
export function getTrackById(id: string): MusicTrack | undefined {
  return MOCK_TRACKS.find((track) => track.id === id);
}

/**
 * Get all video categories
 */
export function getVideoCategories(): { value: VideoCategory | 'all'; label: string }[] {
  return [
    { value: 'all', label: 'All' },
    { value: 'music-video', label: 'Music Videos' },
  ];
}

/**
 * Format duration from seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format view count
 */
export function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
