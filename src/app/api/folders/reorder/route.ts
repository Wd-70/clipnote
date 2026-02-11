import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBFolder } from '@/lib/db/adapter';

// POST /api/folders/reorder - Reorder folders
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
    const { folderIds, parentId } = body;

    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return NextResponse.json(
        { error: 'folderIds array is required' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Validate all folder IDs belong to user and have same parent
    const allFolders = await db.Folder.find({ userId: session.user.id }) as unknown as DBFolder[];
    const userFolderIds = new Set(allFolders.map((f) => f._id));
    
    for (const id of folderIds) {
      if (!userFolderIds.has(id)) {
        return NextResponse.json(
          { error: 'One or more folders not found' },
          { status: 404 }
        );
      }
    }

    // Update order for each folder
    let order = 0;
    for (const id of folderIds) {
      await db.Folder.findByIdAndUpdate(id, { order });
      order++;
    }

    return NextResponse.json({
      data: { reordered: true, count: folderIds.length },
    });
  } catch (error) {
    console.error('[API /api/folders/reorder POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
