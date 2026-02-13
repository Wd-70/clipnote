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
    const role = searchParams.get('role') || '';
    const sort = searchParams.get('sort') || 'created-desc';

    const db = await getDB();

    let users = await db.User.find({});

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      users = users.filter((u: any) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q))
      );
    }

    // Filter by role
    if (role && ['FREE', 'PRO', 'ADMIN'].includes(role)) {
      users = users.filter((u: any) => u.role === role);
    }

    // Sort
    switch (sort) {
      case 'name-asc':
        users.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name-desc':
        users.sort((a: any, b: any) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'created-asc':
        users.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'points-desc':
        users.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
        break;
      case 'points-asc':
        users.sort((a: any, b: any) => (a.points || 0) - (b.points || 0));
        break;
      case 'created-desc':
      default:
        users.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedUsers = users.slice(offset, offset + limit);

    // Get project counts for each user
    const allProjects = await db.Project.find({});
    const projectCountMap: Record<string, number> = {};
    for (const p of allProjects) {
      const uid = String(p.userId);
      projectCountMap[uid] = (projectCountMap[uid] || 0) + 1;
    }

    const result = paginatedUsers.map((u: any) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      image: u.image,
      points: u.points,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      projectCount: projectCountMap[String(u._id)] || 0,
    }));

    return NextResponse.json({
      data: {
        users: result,
        pagination: { total, page, totalPages, limit },
      },
    });
  } catch (error) {
    console.error('[API admin/users GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role, name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (role && ['FREE', 'PRO', 'ADMIN'].includes(role)) {
      update.role = role;
    }
    if (name !== undefined) {
      update.name = name;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const db = await getDB();
    const updatedUser = await db.User.findByIdAndUpdate(userId, update);

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error('[API admin/users PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
