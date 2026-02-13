import { auth, getDevSession } from '@/auth';
import { getDB } from '@/lib/db/adapter';

const hasGoogleAuth = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const useMockAuth = process.env.NODE_ENV === 'development' && !hasGoogleAuth;

/**
 * Verify the current user is an ADMIN.
 * Returns the admin user document or null if not admin.
 * Always checks DB (not JWT) so role changes take effect immediately.
 */
export async function requireAdmin() {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId && useMockAuth) {
      const devSession = await getDevSession();
      userId = devSession?.user?.id;
    }

    if (!userId) return null;

    const db = await getDB();

    let user = null;
    try {
      user = await db.User.findById(userId);
    } catch {
      // ID format not compatible — skip
    }

    if (!user && session?.user?.email) {
      user = await db.User.findOne({ email: session.user.email });
    }

    if (!user || user.role !== 'ADMIN') return null;

    return user;
  } catch (error) {
    console.error('[admin-auth] Error:', error);
    return null;
  }
}
