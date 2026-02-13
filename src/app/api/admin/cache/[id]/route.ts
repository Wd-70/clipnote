import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDB();

    const cache = await db.AnalysisCache.findById(id);
    if (!cache) {
      return NextResponse.json({ error: 'Cache entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        _id: cache._id,
        videoId: cache.videoId,
        platform: cache.platform,
        duration: cache.duration,
        analysisResult: cache.analysisResult,
        cachedAt: cache.cachedAt,
      },
    });
  } catch (error) {
    console.error('[API admin/cache/[id] GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDB();

    const cache = await db.AnalysisCache.findById(id);
    if (!cache) {
      return NextResponse.json({ error: 'Cache entry not found' }, { status: 404 });
    }

    await db.AnalysisCache.findByIdAndDelete(id);

    return NextResponse.json({ data: { message: 'Cache entry deleted' } });
  } catch (error) {
    console.error('[API admin/cache/[id] DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
