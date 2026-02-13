import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { parseVideoUrl } from '@/lib/utils/video';
import { fetchYouTubeVideoInfo } from '@/lib/utils/youtube';
import { fetchChzzkVideoInfo, fetchChzzkLiveInfo } from '@/lib/utils/chzzk';
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
    
    // Fetch video metadata from platform API (always, for channel info + thumbnail + duration)
    let projectTitle = title;
    let thumbnailUrl: string | undefined;
    let duration: number | undefined;
    let channelId: string | undefined;
    let channelName: string | undefined;
    let isLive = false;
    let liveChannelId: string | undefined;
    let liveOpenDate: string | undefined;

    // Handle Chzzk live stream URLs
    if (videoInfo.isLive && videoInfo.platform === 'CHZZK') {
      console.log('[API POST /api/projects] Fetching Chzzk live info...');
      const liveInfo = await fetchChzzkLiveInfo(videoInfo.videoId);

      if (!liveInfo || liveInfo.status !== 'OPEN') {
        return NextResponse.json(
          { error: 'This channel is not currently live' },
          { status: 400 }
        );
      }

      isLive = true;
      liveChannelId = videoInfo.videoId;
      liveOpenDate = liveInfo.openDate;
      if (!projectTitle) projectTitle = liveInfo.title;
      thumbnailUrl = liveInfo.thumbnailUrl;
      channelId = liveInfo.channelId;
      channelName = liveInfo.channelName;
      console.log('[API POST /api/projects] Live stream detected - channel:', channelName);
    } else if (videoInfo.platform === 'YOUTUBE') {
      console.log('[API POST /api/projects] Fetching metadata from YouTube API...');
      const youtubeInfo = await fetchYouTubeVideoInfo(videoInfo.videoId);

      if (youtubeInfo) {
        if (!projectTitle) projectTitle = youtubeInfo.title;
        thumbnailUrl = youtubeInfo.thumbnailUrl;
        duration = youtubeInfo.duration;
        channelId = youtubeInfo.channelId;
        channelName = youtubeInfo.channelTitle;
        console.log('[API POST /api/projects] Fetched YouTube info - channel:', channelName);
      }
    } else if (videoInfo.platform === 'CHZZK') {
      console.log('[API POST /api/projects] Fetching metadata from Chzzk API...');
      const chzzkInfo = await fetchChzzkVideoInfo(videoInfo.videoId);

      if (chzzkInfo) {
        if (!projectTitle) projectTitle = chzzkInfo.title;
        thumbnailUrl = chzzkInfo.thumbnailUrl;
        duration = chzzkInfo.duration;
        channelId = chzzkInfo.channelId;
        channelName = chzzkInfo.channelName;
        console.log('[API POST /api/projects] Fetched Chzzk info - channel:', channelName);
      }
    } else if (videoInfo.platform === 'TWITCH') {
      console.log('[API POST /api/projects] Fetching metadata from Twitch API...');
      const twitchInfo = await fetchTwitchVideoInfo(videoInfo.videoId);

      if (twitchInfo) {
        if (!projectTitle) projectTitle = twitchInfo.title;
        thumbnailUrl = twitchInfo.thumbnailUrl;
        duration = twitchInfo.duration;
        channelId = twitchInfo.channelId;
        channelName = twitchInfo.channelName;
        console.log('[API POST /api/projects] Fetched Twitch info - channel:', channelName);
      }
    }

    if (!projectTitle) {
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
      channelId: channelId || undefined,
      channelName: channelName || undefined,
      notes: [],
      isAutoCollected: false,
      folderId: folderId || undefined,
      isShared: true,
      shareId,
      ...(isLive && {
        isLive: true,
        liveChannelId,
        liveOpenDate,
      }),
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
