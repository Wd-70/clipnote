import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth, getDevSession } from '@/auth';
import { JsonDB } from '@/lib/db/json-db';

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
function findOrCreateUser(sessionUser: SessionUser) {
  // Try to find by ID first
  let user = JsonDB.User.findById(sessionUser.id);

  // Fallback: find by email
  if (!user && sessionUser.email) {
    user = JsonDB.User.findOne({ email: sessionUser.email });
  }

  // Auto-create user if not found (they are authenticated via OAuth)
  if (!user && sessionUser.email) {
    console.log('[API /user/export] Creating new user:', sessionUser.email);

    // Create user with specific ID to match session
    const usersFile = path.join(process.cwd(), '.dev-db', 'users.json');
    const items = fs.existsSync(usersFile)
      ? JSON.parse(fs.readFileSync(usersFile, 'utf-8'))
      : [];

    const newUser = {
      _id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name || '',
      image: sessionUser.image || '',
      points: 0,
      role: 'FREE' as const,
      savedChannels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.push(newUser);
    fs.writeFileSync(usersFile, JSON.stringify(items, null, 2));

    return newUser;
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

    const user = findOrCreateUser(session.user);

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
