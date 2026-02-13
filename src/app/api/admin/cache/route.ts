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
    const caches = await db.AnalysisCache.find({});

    const result = caches.map((c: any) => ({
      _id: c._id,
      videoId: c.videoId,
      platform: c.platform,
      duration: c.duration,
      highlightCount: c.analysisResult?.highlights?.length || 0,
      summary: c.analysisResult?.summary || '',
      cachedAt: c.cachedAt,
    }));

    // Sort by cachedAt desc
    result.sort((a: any, b: any) =>
      new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
    );

    return NextResponse.json({ data: { caches: result } });
  } catch (error) {
    console.error('[API admin/cache GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDB();
    await db.AnalysisCache.deleteMany({});

    return NextResponse.json({ data: { message: 'All cache cleared' } });
  } catch (error) {
    console.error('[API admin/cache DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
