import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { parseVideoUrl } from '@/lib/utils/video';
import { fetchYouTubeVideoInfo } from '@/lib/utils/youtube';
import { fetchChzzkVideoInfo } from '@/lib/utils/chzzk';
import { fetchTwitchVideoInfo } from '@/lib/utils/twitch';

// GET /api/projects - List user's projects
// Query params: folderId, sort
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    const sort = searchParams.get('sort') || 'created-desc';
    const search = searchParams.get('search')?.trim().toLowerCase();

    const db = await getDB();
    let projects = await db.Project.find({ userId: session.user.id }) as any[];

    // Filter by search query (case-insensitive, matches title/videoUrl/notes)
    if (search) {
      projects = projects.filter((p: any) => {
        const title = (p.title || '').toLowerCase();
        const videoUrl = (p.videoUrl || '').toLowerCase();
        const notes = Array.isArray(p.notes)
          ? p.notes.map((n: any) => (typeof n === 'string' ? n : n.text || '')).join(' ').toLowerCase()
          : typeof p.notes === 'string' ? p.notes.toLowerCase() : '';
        return title.includes(search) || videoUrl.includes(search) || notes.includes(search);
      });
    }

    // Filter by folderId if specified
    if (folderId === 'root' || folderId === 'null' || folderId === '') {
      projects = projects.filter((p: any) => !p.folderId);
    } else if (folderId) {
      projects = projects.filter((p: any) => p.folderId === folderId);
    }

    // Sort based on sort parameter
    switch (sort) {
      case 'name-asc':
        projects.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'name-desc':
        projects.sort((a: any, b: any) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'created-asc':
        projects.sort((a: any, b: any) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        break;
      case 'manual':
        projects.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        break;
      case 'created-desc':
      default:
        projects.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
    }

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
    const { videoUrl, title, folderId } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    const videoInfo = parseVideoUrl(videoUrl);

    if (!videoInfo || videoInfo.platform === 'UNKNOWN') {
      return NextResponse.json(
        { error: 'Invalid video URL. Supported platforms: YouTube, Chzzk, Twitch' },
        { status: 400 }
      );
    }

    const db = await getDB();
    console.log('[API POST /api/projects] Creating project for userId:', session.user.id);
    
    // If no title provided, try to fetch from platform API
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
    } else if (!projectTitle && videoInfo.platform === 'CHZZK') {
      console.log('[API POST /api/projects] No title provided, fetching from Chzzk API...');
      const chzzkInfo = await fetchChzzkVideoInfo(videoInfo.videoId);
      
      if (chzzkInfo) {
        projectTitle = chzzkInfo.title;
        thumbnailUrl = chzzkInfo.thumbnailUrl;
        duration = chzzkInfo.duration;
        console.log('[API POST /api/projects] Fetched Chzzk title:', projectTitle);
      } else {
        console.warn('[API POST /api/projects] Failed to fetch Chzzk info, using default title');
        projectTitle = 'Untitled Project';
      }
    } else if (!projectTitle && videoInfo.platform === 'TWITCH') {
      console.log('[API POST /api/projects] No title provided, fetching from Twitch API...');
      const twitchInfo = await fetchTwitchVideoInfo(videoInfo.videoId);
      
      if (twitchInfo) {
        projectTitle = twitchInfo.title;
        thumbnailUrl = twitchInfo.thumbnailUrl;
        duration = twitchInfo.duration;
        console.log('[API POST /api/projects] Fetched Twitch title:', projectTitle);
      } else {
        // Twitch API requires credentials, so fallback to default title is normal
        console.log('[API POST /api/projects] Twitch API not configured or video not found, using default title');
        projectTitle = 'Untitled Project';
      }
    } else if (!projectTitle) {
      projectTitle = 'Untitled Project';
    }
    
    // Generate a share ID for the new project (public by default)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shareId = '';
    for (let i = 0; i < 10; i++) {
      shareId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    let attempts = 0;
    while (await db.Project.findOne({ shareId }) && attempts < 10) {
      shareId = '';
      for (let i = 0; i < 10; i++) {
        shareId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    }

    const project = await db.Project.create({
      userId: session.user.id,
      videoUrl,
      platform: videoInfo.platform,
      videoId: videoInfo.videoId,
      title: projectTitle,
      thumbnailUrl,
      duration,
      notes: [],
      isAutoCollected: false,
      folderId: folderId || undefined,
      isShared: true,
      shareId,
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
