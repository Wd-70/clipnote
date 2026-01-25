import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/chzzk/hls?videoId=VIDEO_ID
 * 
 * Fetches HLS streaming URL for a Chzzk VOD video.
 * This is required because Chzzk embed iframes don't support external control.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // Add cache-busting parameter like the browser does
    const dt = Date.now().toString(36).substring(0, 5);
    
    const response = await fetch(
      `https://api.chzzk.naver.com/service/v3/videos/${videoId}?dt=${dt}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://chzzk.naver.com/video/${videoId}`,
          'front-client-platform-type': 'PC',
          'front-client-product-type': 'web',
        },
        // Cache for 5 minutes
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error('[Chzzk HLS API] Failed to fetch video info:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch video info from Chzzk' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.code !== 200) {
      console.error('[Chzzk HLS API] API error:', data.message);
      return NextResponse.json(
        { error: data.message || 'Chzzk API error' },
        { status: 400 }
      );
    }

    if (!data.content?.liveRewindPlaybackJson) {
      console.error('[Chzzk HLS API] No playback data found');
      return NextResponse.json(
        { error: 'Video playback data not available' },
        { status: 404 }
      );
    }

    // Parse the playback JSON to extract HLS URL
    const playbackData = JSON.parse(data.content.liveRewindPlaybackJson);
    const hlsMedia = playbackData.media?.find((m: { mediaId: string }) => m.mediaId === 'HLS');

    if (!hlsMedia?.path) {
      console.error('[Chzzk HLS API] HLS stream not found in playback data');
      return NextResponse.json(
        { error: 'HLS stream not available for this video' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hlsUrl: hlsMedia.path,
      duration: playbackData.meta?.duration || data.content.duration || 0,
      videoTitle: data.content.videoTitle,
      thumbnailUrl: data.content.thumbnailImageUrl,
    });
  } catch (error) {
    console.error('[Chzzk HLS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
