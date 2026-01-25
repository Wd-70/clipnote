/**
 * Chzzk (치지직) API utilities
 * Chzzk is Naver's streaming platform (Korean Twitch alternative)
 */

export interface ChzzkVideoInfo {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  channelName: string;
  channelId: string;
  viewCount: number;
  publishDate: string;
}

interface ChzzkApiResponse {
  code: number;
  message?: string;
  content?: {
    videoNo: number;
    videoId: string;
    videoTitle: string;
    videoImageUrl: string;
    videoCategoryValue: string;
    duration: number; // in seconds
    publishDate: string;
    readCount: number;
    channel: {
      channelId: string;
      channelName: string;
      channelImageUrl: string;
    };
    liveOpenDate?: string;
    vodStatus?: string;
  };
}

/**
 * Fetch video information from Chzzk API
 * Note: Chzzk API doesn't require authentication for public video info
 */
export async function fetchChzzkVideoInfo(videoId: string): Promise<ChzzkVideoInfo | null> {
  try {
    const url = `https://api.chzzk.naver.com/service/v3/videos/${videoId}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Chzzk API] Failed to fetch video info:', response.status, response.statusText);
      return null;
    }

    const data: ChzzkApiResponse = await response.json();

    if (data.code !== 200 || !data.content) {
      console.warn('[Chzzk API] API error or no video found:', data.message || 'Unknown error');
      return null;
    }

    const video = data.content;

    return {
      title: video.videoTitle,
      description: video.videoCategoryValue || '',
      thumbnailUrl: video.videoImageUrl || '',
      duration: video.duration,
      channelName: video.channel.channelName,
      channelId: video.channel.channelId,
      viewCount: video.readCount,
      publishDate: video.publishDate,
    };
  } catch (error) {
    console.error('[Chzzk API] Error fetching video info:', error);
    return null;
  }
}

/**
 * Get Chzzk video thumbnail URL
 * Chzzk thumbnails are typically stored on NCloud CDN
 */
export function getChzzkThumbnail(thumbnailUrl: string): string {
  // Return as-is since Chzzk provides full URLs
  return thumbnailUrl;
}

/**
 * Get Chzzk embed URL for a video
 */
export function getChzzkEmbedUrl(videoId: string): string {
  return `https://chzzk.naver.com/embed/video/${videoId}`;
}

/**
 * Get Chzzk video page URL
 */
export function getChzzkVideoUrl(videoId: string): string {
  return `https://chzzk.naver.com/video/${videoId}`;
}
