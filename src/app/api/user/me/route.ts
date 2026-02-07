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
    console.log('[API /user/me] Creating new user:', sessionUser.email);

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
 * GET /api/user/me - Get current user's profile
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

    return NextResponse.json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        points: user.points,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[API] Failed to get user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/me - Update current user's profile
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    const user = findOrCreateUser(session.user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const updatedUser = JsonDB.User.findByIdAndUpdate(user._id!, {
      ...(name !== undefined && { name }),
      ...(image !== undefined && { image }),
    });

    return NextResponse.json({
      data: {
        id: updatedUser?._id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        image: updatedUser?.image,
        points: updatedUser?.points,
        role: updatedUser?.role,
      },
    });
  } catch (error) {
    console.error('[API] Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
