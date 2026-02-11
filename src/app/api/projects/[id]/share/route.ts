import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBProject } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Generate short unique share ID
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/projects/[id]/share - Get share info for a project
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    // Get the project
    const project = await db.Project.findOne({
      _id: id,
      userId,
    }) as DBProject | null;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Return share info
    return NextResponse.json({
      data: {
        isShared: project.isShared ?? false,
        shareId: project.shareId,
        shareViewCount: project.shareViewCount ?? 0,
        shareUrl: project.shareId && project.isShared
          ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${project.shareId}`
          : null,
      }
    });
  } catch (error) {
    console.error('[API /api/projects/[id]/share GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/share - Toggle share status ON/OFF
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { isShared } = body;

    if (typeof isShared !== 'boolean') {
      return NextResponse.json({ error: 'isShared must be a boolean' }, { status: 400 });
    }

    const db = await getDB();

    // Get the project
    const project = await db.Project.findOne({
      _id: id,
      userId,
    }) as DBProject | null;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If enabling share and no shareId exists, generate one
    let shareId = project.shareId;
    if (isShared && !shareId) {
      shareId = generateShareId();
      // Ensure uniqueness
      let attempts = 0;
      while (await db.Project.findOne({ shareId }) && attempts < 10) {
        shareId = generateShareId();
        attempts++;
      }
    }

    // Update the project
    const updatedProject = await db.Project.findOneAndUpdate(
      { _id: id, userId },
      {
        isShared,
        shareId,
        updatedAt: new Date().toISOString(),
      }
    ) as DBProject | null;

    if (!updatedProject) {
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        isShared: updatedProject.isShared ?? false,
        shareId: updatedProject.shareId,
        shareViewCount: updatedProject.shareViewCount ?? 0,
        shareUrl: updatedProject.shareId && updatedProject.isShared
          ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${updatedProject.shareId}`
          : null,
      },
      message: isShared ? 'Share enabled' : 'Share disabled'
    });
  } catch (error) {
    console.error('[API /api/projects/[id]/share PATCH]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/share - Enable share (for backward compatibility)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    // Get the project
    const project = await db.Project.findOne({
      _id: id,
      userId,
    }) as DBProject | null;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If already shared, just return the info
    if (project.isShared && project.shareId) {
      return NextResponse.json({
        data: {
          isShared: true,
          shareId: project.shareId,
          shareViewCount: project.shareViewCount ?? 0,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${project.shareId}`,
        },
        message: 'Share link already exists'
      });
    }

    // Generate shareId if needed
    let shareId = project.shareId;
    if (!shareId) {
      shareId = generateShareId();
      let attempts = 0;
      while (await db.Project.findOne({ shareId }) && attempts < 10) {
        shareId = generateShareId();
        attempts++;
      }
    }

    // Enable share
    const updatedProject = await db.Project.findOneAndUpdate(
      { _id: id, userId },
      {
        isShared: true,
        shareId,
        updatedAt: new Date().toISOString(),
      }
    ) as DBProject | null;

    if (!updatedProject) {
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        isShared: true,
        shareId: updatedProject.shareId,
        shareViewCount: updatedProject.shareViewCount ?? 0,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${updatedProject.shareId}`,
      },
      message: 'Share link created successfully'
    });
  } catch (error) {
    console.error('[API /api/projects/[id]/share POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/share - Disable share (for backward compatibility)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    // Dev mode: use dev-user-id if no session
    const userId = session?.user?.id || (process.env.NODE_ENV === 'development' ? 'dev-user-id' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();

    // Disable share (keep shareId for potential re-enable)
    const updatedProject = await db.Project.findOneAndUpdate(
      { _id: id, userId },
      {
        isShared: false,
        updatedAt: new Date().toISOString(),
      }
    ) as DBProject | null;

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Share link disabled successfully' });
  } catch (error) {
    console.error('[API /api/projects/[id]/share DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
