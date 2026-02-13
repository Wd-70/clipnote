import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDB();

    const [users, projects, caches] = await Promise.all([
      db.User.find({}),
      db.Project.find({}),
      db.AnalysisCache.find({}),
    ]);

    const totalUsers = users.length;
    const totalProjects = projects.length;
    const totalSharedProjects = projects.filter((p: any) => p.isShared).length;
    const totalPointsInCirculation = users.reduce((sum: number, u: any) => sum + (u.points || 0), 0);
    const totalCacheEntries = caches.length;

    // Users by role
    const usersByRole: Record<string, number> = {};
    for (const u of users) {
      const role = u.role || 'FREE';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    }

    // Projects by platform
    const projectsByPlatform: Record<string, number> = {};
    for (const p of projects) {
      const platform = p.platform || 'UNKNOWN';
      projectsByPlatform[platform] = (projectsByPlatform[platform] || 0) + 1;
    }

    // Today's new entries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const newUsersToday = users.filter((u: any) => {
      const created = new Date(u.createdAt);
      return created >= todayStart;
    }).length;

    const newProjectsToday = projects.filter((p: any) => {
      const created = new Date(p.createdAt);
      return created >= todayStart;
    }).length;

    // Recent entries (last 10)
    const sortByCreatedDesc = (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    const recentUsers = [...users]
      .sort(sortByCreatedDesc)
      .slice(0, 10)
      .map((u: any) => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        points: u.points,
        createdAt: u.createdAt,
      }));

    const recentProjects = [...projects]
      .sort(sortByCreatedDesc)
      .slice(0, 10)
      .map((p: any) => ({
        _id: p._id,
        title: p.title,
        platform: p.platform,
        videoId: p.videoId,
        isShared: p.isShared,
        createdAt: p.createdAt,
      }));

    return NextResponse.json({
      data: {
        totalUsers,
        totalProjects,
        totalSharedProjects,
        totalPointsInCirculation,
        totalCacheEntries,
        usersByRole,
        projectsByPlatform,
        recentUsers,
        recentProjects,
        newUsersToday,
        newProjectsToday,
      },
    });
  } catch (error) {
    console.error('[API admin/stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
