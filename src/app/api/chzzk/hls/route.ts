import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/chzzk/hls?videoId=VIDEO_ID
 * 
 * Fetches HLS streaming URL for a Chzzk VOD video.
 * This is required because Chzzk embed iframes don't support external control.
 * 
 * Supports two types of Chzzk VODs:
 * 1. Live Rewind (vodStatus: NONE) - HLS URL in liveRewindPlaybackJson
 * 2. ABR HLS (vodStatus: ABR_HLS) - Requires separate neonplayer API call
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

    const content = data.content;
    const vodStatus = content?.vodStatus;

    // Case 1: ABR_HLS - Use neonplayer VOD API
    if (vodStatus === 'ABR_HLS') {
      const videoUuid = content.videoId; // UUID format video ID
      const inKey = content.inKey;

      if (!videoUuid || !inKey) {
        console.error('[Chzzk HLS API] Missing videoId or inKey for ABR_HLS video');
        return NextResponse.json(
          { error: 'Video playback credentials not available' },
          { status: 404 }
        );
      }

      // Fetch from neonplayer VOD API
      const neonplayerUrl = `https://apis.naver.com/neonplayer/vodplay/v1/playback/${videoUuid}?key=${inKey}&env=real&lc=en_US&cpl=en_US`;
      
      const neonplayerResponse = await fetch(neonplayerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': `https://chzzk.naver.com/video/${videoId}`,
        },
      });

      if (!neonplayerResponse.ok) {
        console.error('[Chzzk HLS API] Neonplayer API failed:', neonplayerResponse.status);
        return NextResponse.json(
          { error: 'Failed to fetch video playback from Neonplayer' },
          { status: neonplayerResponse.status }
        );
      }

      const neonplayerData = await neonplayerResponse.json();

      // Extract HLS URL from neonplayer response
      // The response contains adaptationSet with m3u attribute in otherAttributes
      const hlsUrl = extractHlsFromNeonplayer(neonplayerData);

      if (!hlsUrl) {
        console.error('[Chzzk HLS API] Could not extract HLS URL from neonplayer response');
        return NextResponse.json(
          { error: 'HLS stream not available for this video' },
          { status: 404 }
        );
      }

      // ABR_HLS videos require auth tokens on ALL requests (playlist + segments)
      // We need to proxy through our endpoint to rewrite relative paths
      const proxyUrl = `/api/chzzk/proxy?url=${encodeURIComponent(hlsUrl)}`;

      return NextResponse.json({
        hlsUrl: proxyUrl,
        duration: content.duration || 0,
        videoTitle: content.videoTitle,
        thumbnailUrl: content.thumbnailImageUrl,
        vodType: 'ABR_HLS',
      });
    }

    // Case 2: Live Rewind (NONE, UPLOAD, etc.) - Use liveRewindPlaybackJson
    if (!content?.liveRewindPlaybackJson) {
      console.error('[Chzzk HLS API] No playback data found for vodStatus:', vodStatus);
      return NextResponse.json(
        { error: 'Video playback data not available' },
        { status: 404 }
      );
    }

    // Parse the playback JSON to extract HLS URL
    const playbackData = JSON.parse(content.liveRewindPlaybackJson);
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
      duration: playbackData.meta?.duration || content.duration || 0,
      videoTitle: content.videoTitle,
      thumbnailUrl: content.thumbnailImageUrl,
      vodType: 'LIVE_REWIND',
    });
  } catch (error) {
    console.error('[Chzzk HLS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract HLS URL from neonplayer DASH-like response
 * 
 * IMPORTANT: We must return individual representation m3u URLs (not master playlist)
 * because the master playlist contains relative paths without auth tokens,
 * causing 400 errors when HLS.js tries to load segment playlists.
 * 
 * Each representation's m3u URL already includes the _lsu_sa_ auth token.
 */
interface NeonplayerRepresentation {
  width?: number;
  height?: number;
  bandwidth?: number;
  otherAttributes?: {
    m3u?: string;
  };
}

interface NeonplayerAdaptationSet {
  mimeType?: string;
  otherAttributes?: {
    m3u?: string;
  };
  representation?: NeonplayerRepresentation[];
}

interface NeonplayerPeriod {
  adaptationSet?: NeonplayerAdaptationSet[];
}

interface NeonplayerResponse {
  period?: NeonplayerPeriod[];
}

function extractHlsFromNeonplayer(data: NeonplayerResponse): string | null {
  try {
    // Look for adaptationSet with mimeType "video/mp2t" (HLS container)
    for (const period of data.period || []) {
      for (const adaptationSet of period.adaptationSet || []) {
        // Check if this adaptationSet has HLS (video/mp2t)
        if (adaptationSet.mimeType === 'video/mp2t') {
          const representations = adaptationSet.representation || [];
          
          if (representations.length > 0) {
            // Sort by height (resolution) descending, fallback to bandwidth
            // Prefer 720p for balance between quality and performance
            // But if 720p not available, get highest available
            const sorted = [...representations].sort((a, b) => {
              const heightA = a.height || 0;
              const heightB = b.height || 0;
              if (heightA !== heightB) return heightB - heightA;
              return (b.bandwidth || 0) - (a.bandwidth || 0);
            });

            // Try to find 720p first (good balance), otherwise get highest
            const preferred = sorted.find(r => r.height === 720) || sorted[0];
            
            if (preferred?.otherAttributes?.m3u) {
              return preferred.otherAttributes.m3u;
            }

            // Fallback: get any representation with m3u
            for (const rep of sorted) {
              if (rep.otherAttributes?.m3u) {
                return rep.otherAttributes.m3u;
              }
            }
          }
          
          // Last resort: master playlist (may not work due to auth token issue)
          if (adaptationSet.otherAttributes?.m3u) {
            console.warn('[Chzzk HLS API] Using master playlist as fallback - may have auth issues');
            return adaptationSet.otherAttributes.m3u;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Chzzk HLS API] Error extracting HLS URL:', error);
    return null;
  }
}
