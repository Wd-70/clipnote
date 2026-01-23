import { NextRequest, NextResponse } from 'next/server';
import { getDB, DBSharedProject } from '@/lib/db/adapter';

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

// GET /api/share/[shareId] - Get shared project (public endpoint)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { shareId } = await params;

    const db = await getDB();
    
    // Find shared project by shareId
    const sharedProject = db.SharedProject.findOne({ shareId }) as DBSharedProject | null;

    if (!sharedProject) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check if expired
    if (sharedProject.expiresAt && new Date(sharedProject.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Increment view count
    db.SharedProject.findOneAndUpdate(
      { shareId },
      { $inc: { viewCount: 1 } }
    );

    return NextResponse.json({ data: sharedProject });
  } catch (error) {
    console.error('[API /api/share/[shareId] GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
