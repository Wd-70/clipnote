import type { VideoPlatform, VideoInfo } from '@/types';

/**
 * Detect video platform from URL
 */
export function detectPlatform(url: string): VideoPlatform {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (
      hostname.includes('youtube.com') ||
      hostname.includes('youtu.be') ||
      hostname.includes('youtube-nocookie.com')
    ) {
      return 'YOUTUBE';
    }

    if (hostname.includes('chzzk.naver.com')) {
      return 'CHZZK';
    }

    if (hostname.includes('twitch.tv')) {
      return 'TWITCH';
    }

    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Extract video ID from URL
 */
export function extractVideoId(url: string): string | null {
  const platform = detectPlatform(url);

  try {
    const urlObj = new URL(url);

    if (platform === 'YOUTUBE') {
      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v');
      }

      // youtu.be/VIDEO_ID
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }

      // youtube.com/embed/VIDEO_ID
      if (urlObj.pathname.includes('/embed/')) {
        return urlObj.pathname.split('/embed/')[1]?.split('?')[0] || null;
      }

      // youtube.com/v/VIDEO_ID
      if (urlObj.pathname.includes('/v/')) {
        return urlObj.pathname.split('/v/')[1]?.split('?')[0] || null;
      }
    }

    if (platform === 'CHZZK') {
      // chzzk.naver.com/video/VIDEO_ID
      const pathParts = urlObj.pathname.split('/');
      const videoIndex = pathParts.indexOf('video');
      if (videoIndex !== -1 && pathParts[videoIndex + 1]) {
        return pathParts[videoIndex + 1];
      }
      // chzzk.naver.com/live/CHANNEL_ID
      const liveIndex = pathParts.indexOf('live');
      if (liveIndex !== -1 && pathParts[liveIndex + 1]) {
        return pathParts[liveIndex + 1];
      }
    }

    if (platform === 'TWITCH') {
      // twitch.tv/videos/VIDEO_ID
      const pathParts = urlObj.pathname.split('/');
      const videosIndex = pathParts.indexOf('videos');
      if (videosIndex !== -1 && pathParts[videosIndex + 1]) {
        return pathParts[videosIndex + 1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse video URL and return video info
 */
/**
 * Check if a Chzzk URL is a live stream URL (/live/{channelId})
 */
export function isChzzkLiveUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('chzzk.naver.com') && urlObj.pathname.includes('/live/');
  } catch {
    return false;
  }
}

/**
 * Parse video URL and return video info
 */
export function parseVideoUrl(url: string): VideoInfo | null {
  const platform = detectPlatform(url);
  const videoId = extractVideoId(url);

  if (platform === 'UNKNOWN' || !videoId) {
    return null;
  }

  const isLive = platform === 'CHZZK' && isChzzkLiveUrl(url);

  return {
    platform,
    videoId,
    url,
    isLive: isLive || undefined,
  };
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'
): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get embed URL for video
 */
export function getEmbedUrl(platform: VideoPlatform, videoId: string): string {
  if (platform === 'YOUTUBE') {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (platform === 'CHZZK') {
    return `https://chzzk.naver.com/embed/video/${videoId}`;
  }

  if (platform === 'TWITCH') {
    // Note: parent parameter must be added dynamically based on deployment domain
    return `https://player.twitch.tv/?video=${videoId}`;
  }

  return '';
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
