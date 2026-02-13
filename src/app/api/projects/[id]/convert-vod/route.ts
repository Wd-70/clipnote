import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { findChzzkVodByOpenDate } from '@/lib/utils/chzzk';

/**
 * POST /api/projects/{id}/convert-vod
 *
 * Converts a live stream project to a VOD project by finding
 * the matching VOD via openDate and updating the project.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let session = await auth();

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

    const { id } = await params;
    const db = await getDB();

    const project = await db.Project.findById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!project.isLive) {
      return NextResponse.json(
        { error: 'Project is not a live stream' },
        { status: 400 }
      );
    }

    if (!project.liveChannelId || !project.liveOpenDate) {
      return NextResponse.json(
        { error: 'Missing live stream metadata' },
        { status: 400 }
      );
    }

    const vodMatch = await findChzzkVodByOpenDate(
      project.liveChannelId,
      project.liveOpenDate
    );

    if (!vodMatch) {
      return NextResponse.json(
        { error: 'VOD not found yet' },
        { status: 404 }
      );
    }

    // Update the project to point to the VOD
    const updatedProject = await db.Project.findByIdAndUpdate(
      id,
      {
        videoUrl: `https://chzzk.naver.com/video/${vodMatch.videoNo}`,
        videoId: vodMatch.videoNo.toString(),
        isLive: false,
        duration: vodMatch.duration || undefined,
      },
      { new: true }
    );

    return NextResponse.json({
      data: updatedProject,
      vodInfo: {
        videoNo: vodMatch.videoNo,
        title: vodMatch.title,
        duration: vodMatch.duration,
      },
    });
  } catch (error) {
    console.error('[API /api/projects/[id]/convert-vod]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
