import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBProject, DBFolder } from '@/lib/db/adapter';

// POST /api/projects/bulk - Bulk operations on projects
// Actions: delete, move
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
    const { action, projectIds, folderId } = body;

    if (!action || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and projectIds are required' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Validate all project IDs belong to user
    const allProjects = db.Project.find({ userId: session.user.id }) as unknown as DBProject[];
    const userProjectIds = new Set(allProjects.map((p) => p._id));
    
    for (const id of projectIds) {
      if (!userProjectIds.has(id)) {
        return NextResponse.json(
          { error: 'One or more projects not found' },
          { status: 404 }
        );
      }
    }

    switch (action) {
      case 'delete': {
        let deletedCount = 0;
        for (const id of projectIds) {
          const result = db.Project.findByIdAndDelete(id);
          if (result) deletedCount++;
        }
        return NextResponse.json({
          data: { deleted: true, count: deletedCount },
        });
      }

      case 'move': {
        // Validate target folder (or null for root)
        if (folderId !== null && folderId !== undefined) {
          const folder = db.Folder.findById(folderId) as unknown as DBFolder | null;
          if (!folder || folder.userId !== session.user.id) {
            return NextResponse.json(
              { error: 'Target folder not found' },
              { status: 404 }
            );
          }
        }

        // Get max order in target folder
        const projectsInTarget = allProjects.filter((p) => 
          folderId ? p.folderId === folderId : !p.folderId
        );
        let maxOrder = projectsInTarget.length > 0
          ? Math.max(...projectsInTarget.map((p) => p.order || 0))
          : -1;

        let movedCount = 0;
        for (const id of projectIds) {
          maxOrder++;
          const result = db.Project.findByIdAndUpdate(id, {
            folderId: folderId || null,
            order: maxOrder,
          });
          if (result) movedCount++;
        }

        return NextResponse.json({
          data: { moved: true, count: movedCount, folderId: folderId || null },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "delete" or "move"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API /api/projects/bulk POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
