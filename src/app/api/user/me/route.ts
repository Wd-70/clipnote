import { NextResponse } from 'next/server';
import { auth, getDevSession } from '@/auth';
import { getDB } from '@/lib/db/adapter';

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
    console.log('[API /user/me] Creating new user:', sessionUser.email);
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

    const user = await findOrCreateUser(session.user);

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

    const user = await findOrCreateUser(session.user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const db = await getDB();

    // Update user
    const updatedUser = await db.User.findByIdAndUpdate(user._id!, {
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
