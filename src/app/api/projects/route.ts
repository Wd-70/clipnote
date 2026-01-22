import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { parseVideoUrl } from '@/lib/utils/video';
import { extractYouTubeVideoId, fetchYouTubeVideoInfo } from '@/lib/utils/youtube';

// GET /api/projects - List user's projects
export async function GET() {
  try {
    let session = await auth();
    
    // DEVELOPMENT MODE: Use dev user if no session
    if (process.env.NODE_ENV === 'development' && !session?.user?.id) {
      session = {
        user: {
          id: 'dev-user-id',
          email: 'dev@clipnote.local',
          name: 'Development User',
        } as any,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const projects = db.Project.find({ userId: session.user.id });

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error('[API /api/projects GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    let session = await auth();
    
    // DEVELOPMENT MODE: Use dev user if no session
    if (process.env.NODE_ENV === 'development' && !session?.user?.id) {
      console.log('[API POST /api/projects] Dev mode: Using dev-user-id');
      session = {
        user: {
          id: 'dev-user-id',
          email: 'dev@clipnote.local',
          name: 'Development User',
        } as any,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    
    console.log('[API POST /api/projects] Session:', JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
      console.log('[API POST /api/projects] No session found - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { videoUrl, title } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    const videoInfo = parseVideoUrl(videoUrl);

    if (!videoInfo || videoInfo.platform === 'UNKNOWN') {
      return NextResponse.json(
        { error: 'Invalid video URL. Supported platforms: YouTube, Chzzk' },
        { status: 400 }
      );
    }

    const db = await getDB();
    console.log('[API POST /api/projects] Creating project for userId:', session.user.id);
    
    // If no title provided, try to fetch from YouTube API
    let projectTitle = title;
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    
    if (!projectTitle && videoInfo.platform === 'YOUTUBE') {
      console.log('[API POST /api/projects] No title provided, fetching from YouTube API...');
      const youtubeInfo = await fetchYouTubeVideoInfo(videoInfo.videoId);
      
      if (youtubeInfo) {
        projectTitle = youtubeInfo.title;
        thumbnailUrl = youtubeInfo.thumbnailUrl;
        duration = youtubeInfo.duration;
        console.log('[API POST /api/projects] Fetched YouTube title:', projectTitle);
      } else {
        console.warn('[API POST /api/projects] Failed to fetch YouTube info, using default title');
        projectTitle = 'Untitled Project';
      }
    } else if (!projectTitle) {
      projectTitle = 'Untitled Project';
    }
    
    const project = db.Project.create({
      userId: session.user.id,
      videoUrl,
      platform: videoInfo.platform,
      videoId: videoInfo.videoId,
      title: projectTitle,
      thumbnailUrl,
      duration,
      notes: [],
      isAutoCollected: false,
    });

    console.log('[API POST /api/projects] Project created successfully');
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('[API /api/projects POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
