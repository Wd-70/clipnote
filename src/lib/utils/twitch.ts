/**
 * Twitch API utilities
 * 
 * Note: Twitch API requires Client ID and OAuth token for metadata access.
 * Video playback uses the official Twitch Embed Player (no API key needed).
 */

export interface TwitchVideoInfo {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  channelName: string;
  channelId: string;
  viewCount: number;
  publishDate: string;
}

interface TwitchApiVideo {
  id: string;
  stream_id: string | null;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: string;
  view_count: number;
  language: string;
  type: string;
  duration: string; // Format: "3h2m1s" or "1h30m" etc.
}

interface TwitchApiResponse {
  data: TwitchApiVideo[];
}

/**
 * Parse Twitch duration string to seconds
 * Format: "3h2m1s", "1h30m", "45m30s", "30s"
 */
function parseTwitchDuration(duration: string): number {
  let seconds = 0;
  
  const hours = duration.match(/(\d+)h/);
  const minutes = duration.match(/(\d+)m/);
  const secs = duration.match(/(\d+)s/);
  
  if (hours) seconds += parseInt(hours[1]) * 3600;
  if (minutes) seconds += parseInt(minutes[1]) * 60;
  if (secs) seconds += parseInt(secs[1]);
  
  return seconds;
}

/**
 * Fetch video information from Twitch API
 * 
 * Requires TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN environment variables.
 * If not configured, returns null (video will still play via Embed Player).
 */
export async function fetchTwitchVideoInfo(videoId: string): Promise<TwitchVideoInfo | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = process.env.TWITCH_ACCESS_TOKEN;

  // If credentials not configured, return null silently
  if (!clientId || !accessToken) {
    console.log('[Twitch API] Credentials not configured, skipping metadata fetch');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/videos?id=${videoId}`,
      {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[Twitch API] Failed to fetch video info:', response.status);
      return null;
    }

    const data: TwitchApiResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.warn('[Twitch API] Video not found:', videoId);
      return null;
    }

    const video = data.data[0];
    
    // Convert thumbnail URL template to actual URL
    // Twitch returns: https://.../%{width}x%{height}/...
    const thumbnailUrl = video.thumbnail_url
      .replace('%{width}', '640')
      .replace('%{height}', '360');

    return {
      title: video.title,
      description: video.description,
      thumbnailUrl,
      duration: parseTwitchDuration(video.duration),
      channelName: video.user_name,
      channelId: video.user_id,
      viewCount: video.view_count,
      publishDate: video.published_at,
    };
  } catch (error) {
    console.error('[Twitch API] Error fetching video info:', error);
    return null;
  }
}

/**
 * Get Twitch embed URL with parent parameter
 * @param videoId - Twitch video ID
 * @param parent - Parent domain (required by Twitch)
 */
export function getTwitchEmbedUrl(videoId: string, parent: string): string {
  return `https://player.twitch.tv/?video=${videoId}&parent=${parent}`;
}

/**
 * Get Twitch video page URL
 */
export function getTwitchVideoUrl(videoId: string): string {
  return `https://www.twitch.tv/videos/${videoId}`;
}
