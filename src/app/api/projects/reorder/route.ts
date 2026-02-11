import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBProject } from '@/lib/db/adapter';

// POST /api/projects/reorder - Reorder projects within a folder
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { projectIds, folderId } = body;

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'projectIds array is required' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Validate all project IDs belong to user
    const allProjects = await db.Project.find({ userId: session.user.id }) as unknown as DBProject[];
    const userProjectIds = new Set(allProjects.map((p) => p._id));
    
    for (const id of projectIds) {
      if (!userProjectIds.has(id)) {
        return NextResponse.json(
          { error: 'One or more projects not found' },
          { status: 404 }
        );
      }
    }

    // Update order for each project
    let order = 0;
    for (const id of projectIds) {
      await db.Project.findByIdAndUpdate(id, { order });
      order++;
    }

    return NextResponse.json({
      data: { reordered: true, count: projectIds.length },
    });
  } catch (error) {
    console.error('[API /api/projects/reorder POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
