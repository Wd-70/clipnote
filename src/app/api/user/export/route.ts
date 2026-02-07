import { NextResponse } from 'next/server';
import { auth, getDevSession } from '@/auth';
import { JsonDB } from '@/lib/db/json-db';

// Check if mock auth is enabled (same logic as auth.ts)
const hasGoogleAuth = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const useMockAuth = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

/**
 * Get session with mock auth fallback
 */
async function getSession() {
  const session = await auth();
  if (session?.user?.id) return session;

  // In mock auth mode, use dev session
  if (useMockAuth) {
    return await getDevSession();
  }

  return null;
}

/**
 * GET /api/user/export - Export all user data
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user
    let user = JsonDB.User.findById(session.user.id);
    if (!user && session.user.email) {
      user = JsonDB.User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all user's projects
    const projects = JsonDB.Project.find({ userId: user._id! });

    // Get all user's folders
    const folders = JsonDB.Folder.find({ userId: user._id! });

    // Export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        points: user.points,
        role: user.role,
        createdAt: user.createdAt,
      },
      folders: folders.map((folder) => ({
        id: folder._id,
        name: folder.name,
        parentId: folder.parentId,
        color: folder.color,
        icon: folder.icon,
        order: folder.order,
        createdAt: folder.createdAt,
      })),
      projects: projects.map((project) => ({
        id: project._id,
        title: project.title,
        platform: project.platform,
        videoId: project.videoId,
        videoUrl: project.videoUrl,
        thumbnailUrl: project.thumbnailUrl,
        folderId: project.folderId,
        notes: project.notes,
        duration: project.duration,
        isAutoCollected: project.isAutoCollected,
        order: project.order,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('[API] Failed to export user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
