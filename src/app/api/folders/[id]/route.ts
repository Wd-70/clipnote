import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB, DBFolder, DBProject } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/folders/[id] - Get single folder with children count
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const db = await getDB();
    const folder = await db.Folder.findById(id) as unknown as DBFolder | null;

    if (!folder || folder.userId !== session.user.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Get children folders count
    const allFolders = await db.Folder.find({ userId: session.user.id }) as unknown as DBFolder[];
    const childrenCount = allFolders.filter((f) => f.parentId === id).length;

    // Get projects count in this folder
    const allProjects = await db.Project.find({ userId: session.user.id }) as unknown as DBProject[];
    const projectsCount = allProjects.filter((p) => p.folderId === id).length;

    return NextResponse.json({
      data: {
        ...folder,
        childrenCount,
        projectsCount,
      },
    });
  } catch (error) {
    console.error('[API /api/folders/[id] GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/folders/[id] - Update folder (name, color, icon, order)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const db = await getDB();
    const folder = await db.Folder.findById(id) as unknown as DBFolder | null;

    if (!folder || folder.userId !== session.user.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, color, icon, order, parentId } = body;

    const updateData: Partial<DBFolder> = {};

    // Validate and set name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Folder name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Folder name must be 100 characters or less' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Set optional fields
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;

    // Handle parent change (move folder)
    if (parentId !== undefined && parentId !== folder.parentId) {
      // Check for circular reference
      if (parentId === id) {
        return NextResponse.json(
          { error: 'Cannot move folder into itself' },
          { status: 400 }
        );
      }

      // Validate new parent exists and belongs to user
      if (parentId) {
        const newParent = await db.Folder.findById(parentId) as unknown as DBFolder | null;
        if (!newParent || newParent.userId !== session.user.id) {
          return NextResponse.json(
            { error: 'Parent folder not found' },
            { status: 404 }
          );
        }

        // Check for circular reference (moving into descendant)
        const isDescendant = await checkIsDescendant(db, id, parentId, session.user.id);
        if (isDescendant) {
          return NextResponse.json(
            { error: 'Cannot move folder into its own descendant' },
            { status: 400 }
          );
        }

        // Calculate new depth
        const newDepth = (newParent.depth || 0) + 1;

        // Check max depth including children
        const maxChildDepth = await getMaxChildDepth(db, id, session.user.id);
        if (newDepth + maxChildDepth > 2) {
          return NextResponse.json(
            { error: 'Maximum folder depth (3 levels) would be exceeded' },
            { status: 400 }
          );
        }

        updateData.parentId = parentId;
        updateData.depth = newDepth;

        // Update all descendants' depths
        await updateDescendantDepths(db, id, newDepth, session.user.id);
      } else {
        // Moving to root
        updateData.parentId = null;
        updateData.depth = 0;

        // Update all descendants' depths
        await updateDescendantDepths(db, id, 0, session.user.id);
      }
    }

    const updatedFolder = await db.Folder.findByIdAndUpdate(id, updateData);

    return NextResponse.json({ data: updatedFolder });
  } catch (error) {
    console.error('[API /api/folders/[id] PATCH]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - Delete folder (recursive: delete all contents)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    const db = await getDB();
    const folder = await db.Folder.findById(id) as unknown as DBFolder | null;

    if (!folder || folder.userId !== session.user.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Get all descendant folder IDs (recursive)
    const descendantIds = await getAllDescendantIds(db, id, session.user.id);
    const allFolderIds = [id, ...descendantIds];

    // Delete all projects in these folders
    for (const folderId of allFolderIds) {
      const projects = await db.Project.find({ userId: session.user.id }) as unknown as DBProject[];
      const projectsInFolder = projects.filter((p) => p.folderId === folderId);
      for (const project of projectsInFolder) {
        if (project._id) {
          await db.Project.findByIdAndDelete(project._id);
        }
      }
    }

    // Delete all descendant folders (children first, then parents)
    for (const folderId of descendantIds.reverse()) {
      await db.Folder.findByIdAndDelete(folderId);
    }

    // Delete the folder itself
    await db.Folder.findByIdAndDelete(id);

    return NextResponse.json({
      data: {
        deleted: true,
        foldersDeleted: allFolderIds.length,
      }
    });
  } catch (error) {
    console.error('[API /api/folders/[id] DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Check if targetId is a descendant of folderId
async function checkIsDescendant(
  db: any,
  folderId: string,
  targetId: string,
  userId: string
): Promise<boolean> {
  const allFolders = await db.Folder.find({ userId }) as unknown as DBFolder[];

  let currentId: string | null | undefined = targetId;
  while (currentId) {
    if (currentId === folderId) return true;
    const folder = allFolders.find((f) => f._id === currentId);
    currentId = folder?.parentId;
  }

  return false;
}

// Helper: Get max depth of children relative to folder
async function getMaxChildDepth(
  db: any,
  folderId: string,
  userId: string
): Promise<number> {
  const allFolders = await db.Folder.find({ userId }) as unknown as DBFolder[];
  const folderDepth = allFolders.find((f) => f._id === folderId)?.depth || 0;

  let maxDepth = 0;
  const descendants = getAllDescendantsSync(allFolders, folderId);

  for (const desc of descendants) {
    const relativeDepth = (desc.depth || 0) - folderDepth;
    if (relativeDepth > maxDepth) maxDepth = relativeDepth;
  }

  return maxDepth;
}

// Helper: Get all descendants synchronously
function getAllDescendantsSync(allFolders: DBFolder[], folderId: string): DBFolder[] {
  const children = allFolders.filter((f) => f.parentId === folderId);
  const descendants: DBFolder[] = [...children];

  for (const child of children) {
    if (child._id) {
      descendants.push(...getAllDescendantsSync(allFolders, child._id));
    }
  }

  return descendants;
}

// Helper: Get all descendant IDs
async function getAllDescendantIds(
  db: any,
  folderId: string,
  userId: string
): Promise<string[]> {
  const allFolders = await db.Folder.find({ userId }) as unknown as DBFolder[];
  const descendants = getAllDescendantsSync(allFolders, folderId);
  return descendants.map((d) => d._id).filter((id): id is string => !!id);
}

// Helper: Update depths of all descendants
async function updateDescendantDepths(
  db: any,
  folderId: string,
  newParentDepth: number,
  userId: string
): Promise<void> {
  const allFolders = await db.Folder.find({ userId }) as unknown as DBFolder[];
  const folder = allFolders.find((f) => f._id === folderId);
  if (!folder) return;

  const oldDepth = folder.depth || 0;
  const depthDiff = (newParentDepth + 1) - oldDepth;

  const descendants = getAllDescendantsSync(allFolders, folderId);

  for (const desc of descendants) {
    if (desc._id) {
      await db.Folder.findByIdAndUpdate(desc._id, {
        depth: (desc.depth || 0) + depthDiff,
      });
    }
  }
}
