import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const platform = searchParams.get('platform') || '';
    const shared = searchParams.get('shared') || '';
    const owner = searchParams.get('owner') || '';
    const channel = searchParams.get('channel') || '';
    const sort = searchParams.get('sort') || 'created-desc';

    const db = await getDB();

    // Get user emails for join
    const users = await db.User.find({});
    const userMap: Record<string, string> = {};
    for (const u of users) {
      userMap[String(u._id)] = u.email;
    }

    let projects = await db.Project.find({});

    // Collect distinct filter options before filtering
    const ownerSet = new Set<string>();
    const channelSet = new Set<string>();
    for (const p of projects) {
      const email = userMap[String(p.userId)] || 'Unknown';
      ownerSet.add(email);
      if (p.channelName) channelSet.add(p.channelName);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter((p: any) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.videoId && p.videoId.toLowerCase().includes(q))
      );
    }

    // Filter by platform
    if (platform && ['YOUTUBE', 'CHZZK', 'TWITCH'].includes(platform)) {
      projects = projects.filter((p: any) => p.platform === platform);
    }

    // Filter by shared status
    if (shared === 'true') {
      projects = projects.filter((p: any) => p.isShared);
    } else if (shared === 'false') {
      projects = projects.filter((p: any) => !p.isShared);
    }

    // Filter by owner email
    if (owner) {
      projects = projects.filter((p: any) => userMap[String(p.userId)] === owner);
    }

    // Filter by channel name
    if (channel) {
      projects = projects.filter((p: any) => p.channelName === channel);
    }

    // Sort
    switch (sort) {
      case 'title-asc':
        projects.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        projects.sort((a: any, b: any) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'created-asc':
        projects.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'views-desc':
        projects.sort((a: any, b: any) => (b.shareViewCount || 0) - (a.shareViewCount || 0));
        break;
      case 'created-desc':
      default:
        projects.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    const total = projects.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedProjects = projects.slice(offset, offset + limit);

    const result = paginatedProjects.map((p: any) => {
      const notes = p.notes;
      const clipCount = Array.isArray(notes) ? notes.length : 0;

      return {
        _id: p._id,
        title: p.title,
        videoId: p.videoId,
        videoUrl: p.videoUrl,
        platform: p.platform,
        thumbnailUrl: p.thumbnailUrl,
        isShared: p.isShared,
        shareViewCount: p.shareViewCount || 0,
        clipCount,
        channelName: p.channelName || '',
        userId: p.userId,
        ownerEmail: userMap[String(p.userId)] || 'Unknown',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return NextResponse.json({
      data: {
        projects: result,
        pagination: { total, page, totalPages, limit },
        filters: {
          owners: Array.from(ownerSet).sort(),
          channels: Array.from(channelSet).sort(),
        },
      },
    });
  } catch (error) {
    console.error('[API admin/projects GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
