import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (String(admin._id) === id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 403 }
      );
    }

    const db = await getDB();

    const user = await db.User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cascade delete: Projects → Folders → User
    await db.Project.deleteMany({ userId: id });
    await db.Folder.deleteMany({ userId: id });
    await db.User.findByIdAndDelete(id);

    return NextResponse.json({ data: { message: 'User deleted' } });
  } catch (error) {
    console.error('[API admin/users/[id] DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
