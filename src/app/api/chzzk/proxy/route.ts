import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/chzzk/proxy?url=ENCODED_M3U8_URL
 * 
 * Proxies Chzzk HLS playlists and rewrites relative paths to include auth tokens.
 * This is necessary because Chzzk ABR_HLS videos require _lsu_sa_ token on ALL requests
 * (master playlist, segment playlists, TS segments), but HLS.js doesn't automatically
 * propagate query parameters to relative paths.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const encodedUrl = searchParams.get('url');

    if (!encodedUrl) {
      return NextResponse.json(
        { error: 'url parameter is required' },
        { status: 400 }
      );
    }

    const targetUrl = decodeURIComponent(encodedUrl);

    // Fetch the original playlist
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': 'https://chzzk.naver.com/',
      },
    });

    if (!response.ok) {
      console.error('[Chzzk Proxy] Failed to fetch playlist:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch playlist' },
        { status: response.status }
      );
    }

    const content = await response.text();

    // Parse the URL to extract base path and auth token
    const url = new URL(targetUrl);
    const authToken = url.searchParams.get('_lsu_sa_');
    const basePath = url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/'));

    if (!authToken) {
      // If no auth token, return as-is (might be Live Rewind type)
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Rewrite relative paths to absolute paths with auth token
    const lines = content.split('\n');
    const rewrittenLines = lines.map(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        return line;
      }

      // If it's already an absolute URL, return as-is
      if (line.startsWith('http://') || line.startsWith('https://')) {
        return line;
      }

      // Relative path - convert to absolute with auth token
      const absoluteUrl = `${basePath}/${line.trim()}?_lsu_sa_=${authToken}`;
      return absoluteUrl;
    });

    const rewrittenContent = rewrittenLines.join('\n');

    return new NextResponse(rewrittenContent, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[Chzzk Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
