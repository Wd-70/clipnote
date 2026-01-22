import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { analyzeVideoContent, calculatePointsRequired } from '@/lib/ai/gemini';
import type { VideoPlatform } from '@/types';

// POST /api/analyze - Analyze video with AI
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { videoId, platform, videoUrl, duration } = body as {
      videoId: string;
      platform: VideoPlatform;
      videoUrl: string;
      duration: number;
    };

    if (!videoId || !platform || !duration) {
      return NextResponse.json(
        { error: 'videoId, platform, and duration are required' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Step 1: Check cache first (100% profit margin)
    const cachedAnalysis = db.AnalysisCache.findOne({
      videoId,
      platform: platform as 'YOUTUBE' | 'CHZZK',
    }) as { analysisResult: { summary: string; highlights: Array<{ start: number; end: number; reason: string; score: number }> } } | null;

    if (cachedAnalysis) {
      return NextResponse.json({
        data: cachedAnalysis.analysisResult,
        cached: true,
        message: 'Analysis retrieved from cache',
      });
    }

    // Step 2: Calculate points required
    const pointsRequired = calculatePointsRequired(duration);

    // Step 3: Check user has sufficient points
    const user = db.User.findById(session.user.id) as { points: number; _id?: string } | null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.points < pointsRequired) {
      return NextResponse.json(
        {
          error: 'Insufficient points',
          required: pointsRequired,
          current: user.points,
        },
        { status: 402 }
      );
    }

    // Step 4: Deduct points BEFORE AI call (prevent abuse)
    db.User.updateOne(
      { _id: session.user.id },
      { $inc: { points: -pointsRequired } }
    );

    try {
      // Step 5: Call Gemini AI for analysis
      const analysisResult = await analyzeVideoContent(
        videoUrl || `https://youtube.com/watch?v=${videoId}`,
        duration
      );

      // Step 6: Cache the result for future requests
      db.AnalysisCache.create({
        videoId,
        platform: platform as 'YOUTUBE' | 'CHZZK',
        duration,
        analysisResult,
      });

      return NextResponse.json({
        data: analysisResult,
        cached: false,
        pointsUsed: pointsRequired,
        message: 'Analysis completed successfully',
      });
    } catch (aiError) {
      // Refund points if AI fails
      db.User.updateOne(
        { _id: session.user.id },
        { $inc: { points: pointsRequired } }
      );

      console.error('[API /api/analyze] AI Error:', aiError);
      return NextResponse.json(
        { error: 'AI analysis failed. Points have been refunded.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API /api/analyze]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
