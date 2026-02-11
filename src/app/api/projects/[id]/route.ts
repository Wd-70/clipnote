import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get single project
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
    const project = await db.Project.findOne({
      _id: id,
      userId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('[API /api/projects/[id] GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project (notes, title)
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
    const { notes, title } = body;

    const db = await getDB();
    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (title !== undefined) updateData.title = title;

    const project = await db.Project.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('[API /api/projects/[id] PATCH]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
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
    const project = await db.Project.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[API /api/projects/[id] DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
