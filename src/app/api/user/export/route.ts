import { NextResponse } from 'next/server';
import { auth, getDevSession } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { exportLimiter, rateLimitResponse } from '@/lib/rate-limit';

// Check if mock auth is enabled (same logic as auth.ts)
const hasGoogleAuth = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const useMockAuth = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

/**
 * Get session with mock auth fallback
 */
async function getSession(): Promise<{ user: SessionUser } | null> {
  const session = await auth();
  if (session?.user?.id) return session as { user: SessionUser };

  // In mock auth mode, use dev session
  if (useMockAuth) {
    const devSession = await getDevSession();
    return devSession as { user: SessionUser } | null;
  }

  return null;
}

/**
 * Find or create user based on session
 */
async function findOrCreateUser(sessionUser: SessionUser) {
  const db = await getDB();

  // Try to find by ID first (may fail with CastError if ID is not a valid ObjectId)
  let user = null;
  try {
    user = await db.User.findById(sessionUser.id);
  } catch {
    // ID format not compatible with MongoDB ObjectId — skip to email lookup
  }

  // Fallback: find by email
  if (!user && sessionUser.email) {
    user = await db.User.findOne({ email: sessionUser.email });
  }

  // Auto-create user if not found (they are authenticated via OAuth)
  if (!user && sessionUser.email) {
    console.log('[API /user/export] Creating new user:', sessionUser.email);
    user = await db.User.create({
      email: sessionUser.email,
      name: sessionUser.name || '',
      image: sessionUser.image || '',
      points: 0,
      role: 'FREE',
      savedChannels: [],
    });
  }

  return user;
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

    const limited = rateLimitResponse(exportLimiter, session.user.id);
    if (limited) return limited;

    const user = await findOrCreateUser(session.user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const db = await getDB();

    // Get all user's projects
    const projects = await db.Project.find({ userId: user._id! });

    // Get all user's folders
    const folders = await db.Folder.find({ userId: user._id! });

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
      folders: folders.map((folder: any) => ({
        id: folder._id,
        name: folder.name,
        parentId: folder.parentId,
        color: folder.color,
        icon: folder.icon,
        order: folder.order,
        createdAt: folder.createdAt,
      })),
      projects: projects.map((project: any) => ({
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
