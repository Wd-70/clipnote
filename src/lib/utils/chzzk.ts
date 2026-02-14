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
    videoImageUrl?: string; // Some videos use this
    thumbnailImageUrl?: string; // Some videos use this (more common)
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
      // Try thumbnailImageUrl first (more common), fallback to videoImageUrl
      thumbnailUrl: video.thumbnailImageUrl || video.videoImageUrl || '',
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

// =========================================================================
// Live Stream API
// =========================================================================

export interface ChzzkLiveInfo {
  liveId: string;
  title: string;
  channelName: string;
  channelId: string;
  openDate: string;
  status: string;
  hlsUrl: string | null;
  thumbnailUrl: string;
}

export interface ChzzkVodMatch {
  videoNo: number;
  videoId: string;
  title: string;
  duration: number;
}

/**
 * Fetch live stream status and details for a channel
 */
export async function fetchChzzkLiveInfo(channelId: string): Promise<ChzzkLiveInfo | null> {
  try {
    const url = `https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Chzzk Live API] Failed to fetch live info:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code !== 200 || !data.content) {
      console.warn('[Chzzk Live API] API error:', data.message || 'Unknown error');
      return null;
    }

    const content = data.content;

    // Extract HLS URL from livePlaybackJson
    let hlsUrl: string | null = null;
    if (content.livePlaybackJson) {
      try {
        const playback = JSON.parse(content.livePlaybackJson);
        const hlsMedia = playback.media?.find((m: { mediaId: string }) => m.mediaId === 'HLS');
        if (hlsMedia?.path) {
          hlsUrl = hlsMedia.path;
        }
      } catch (e) {
        console.error('[Chzzk Live API] Failed to parse livePlaybackJson:', e);
      }
    }

    return {
      liveId: content.liveId?.toString() || '',
      title: content.liveTitle || '',
      channelName: content.channel?.channelName || '',
      channelId: content.channel?.channelId || channelId,
      openDate: content.openDate || '',
      status: content.status || 'CLOSE',
      hlsUrl,
      thumbnailUrl: (content.liveImageUrl?.replace('{type}', '720') || content.channel?.channelImageUrl || ''),
    };
  } catch (error) {
    console.error('[Chzzk Live API] Error fetching live info:', error);
    return null;
  }
}

/**
 * Find VOD matching a specific live broadcast by openDate.
 *
 * The channel videos list API (v1) does NOT include liveOpenDate,
 * so we fetch candidate videos from the list and then check each
 * one via the individual video detail API (v3) which does include it.
 */
export async function findChzzkVodByOpenDate(
  channelId: string,
  openDate: string
): Promise<ChzzkVodMatch | null> {
  try {
    const url = `https://api.chzzk.naver.com/service/v1/channels/${channelId}/videos?sortType=LATEST&page=0&size=10`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Chzzk VOD API] Failed to fetch videos:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code !== 200 || !data.content) {
      return null;
    }

    const videos = data.content.data || [];

    // Check each video's detail to find matching liveOpenDate
    for (const video of videos) {
      if (!video.videoNo) continue;

      const detailUrl = `https://api.chzzk.naver.com/service/v3/videos/${video.videoNo}`;
      const detailRes = await fetch(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!detailRes.ok) continue;

      const detailData = await detailRes.json();
      if (detailData.code !== 200 || !detailData.content) continue;

      if (detailData.content.liveOpenDate === openDate) {
        return {
          videoNo: video.videoNo,
          videoId: video.videoId || detailData.content.videoId,
          title: video.videoTitle || detailData.content.videoTitle,
          duration: video.duration || detailData.content.duration || 0,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Chzzk VOD API] Error finding VOD:', error);
    return null;
  }
}
