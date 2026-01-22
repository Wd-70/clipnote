/**
 * YouTube Data API utilities
 */

interface YouTubeVideoInfo {
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  channelTitle: string;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch video information from YouTube Data API
 * Requires YOUTUBE_API_KEY environment variable
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('[YouTube API] YOUTUBE_API_KEY not configured');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[YouTube API] Failed to fetch video info:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.warn('[YouTube API] No video found for ID:', videoId);
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse ISO 8601 duration (e.g., "PT15M33S" -> 933 seconds)
    const duration = parseISO8601Duration(contentDetails.duration);

    return {
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      duration,
      channelTitle: snippet.channelTitle,
    };
  } catch (error) {
    console.error('[YouTube API] Error fetching video info:', error);
    return null;
  }
}

/**
 * Parse ISO 8601 duration format to seconds
 * Example: "PT15M33S" -> 933
 * Example: "PT1H2M10S" -> 3730
 */
function parseISO8601Duration(duration: string): number {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}
