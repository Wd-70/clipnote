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

    // Find user by ID or email
    let user = JsonDB.User.findById(session.user.id);

    // Fallback: find by email if ID doesn't match
    if (!user && session.user.email) {
      user = JsonDB.User.findOne({ email: session.user.email });
    }

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
