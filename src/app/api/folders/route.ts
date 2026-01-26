import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBFolder } from '@/lib/db/adapter';

// GET /api/folders - List user's folders
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
    const parentId = searchParams.get('parentId'); // null = root level

    const db = await getDB();
    let folders = db.Folder.find({ userId: session.user.id }) as unknown as DBFolder[];

    // Filter by parentId if specified
    if (parentId === 'root' || parentId === 'null' || parentId === '') {
      folders = folders.filter((f) => !f.parentId);
    } else if (parentId) {
      folders = folders.filter((f) => f.parentId === parentId);
    }

    // Sort by order, then by name
    folders.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ data: folders });
  } catch (error) {
    console.error('[API /api/folders GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/folders - Create new folder
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, parentId, color, icon } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Folder name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const db = await getDB();
    
    // Calculate depth based on parent
    let depth = 0;
    if (parentId) {
      const parentFolder = db.Folder.findById(parentId) as unknown as DBFolder | null;
      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }
      // Verify parent belongs to user
      if (parentFolder.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        );
      }
      depth = (parentFolder.depth || 0) + 1;
      
      // Enforce max depth of 3 levels (0, 1, 2)
      if (depth > 2) {
        return NextResponse.json(
          { error: 'Maximum folder depth (3 levels) exceeded' },
          { status: 400 }
        );
      }
    }

    // Get the highest order number for siblings
    let siblings = db.Folder.find({ userId: session.user.id }) as unknown as DBFolder[];
    if (parentId) {
      siblings = siblings.filter((f) => f.parentId === parentId);
    } else {
      siblings = siblings.filter((f) => !f.parentId);
    }
    const maxOrder = siblings.length > 0 
      ? Math.max(...siblings.map((f) => f.order || 0)) 
      : -1;

    const folder = db.Folder.create({
      userId: session.user.id,
      name: name.trim(),
      parentId: parentId || null,
      color: color || null,
      icon: icon || null,
      order: maxOrder + 1,
      depth,
    });

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    console.error('[API /api/folders POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
