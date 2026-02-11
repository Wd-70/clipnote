import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDB } from '@/lib/db/adapter';
import { chargePointsLimiter, rateLimitResponse } from '@/lib/rate-limit';

// Points pricing structure
const POINTS_PACKAGES = {
  small: { price: 1000, points: 200, bonus: 0 },
  medium: { price: 3000, points: 600, bonus: 50 },
  large: { price: 5000, points: 1000, bonus: 100 },
  pro: { price: 10000, points: 2000, bonus: 300 },
};

type PackageType = keyof typeof POINTS_PACKAGES;

// POST /api/points/charge - Credit points after payment verification
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = rateLimitResponse(chargePointsLimiter, session.user.id);
    if (limited) return limited;

    const body = await req.json();
    const { paymentId, packageType, impUid } = body as {
      paymentId?: string;
      packageType: PackageType;
      impUid?: string; // Portone payment UID
    };

    // Validate package type
    if (!packageType || !POINTS_PACKAGES[packageType]) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    const selectedPackage = POINTS_PACKAGES[packageType];
    const totalPoints = selectedPackage.points + selectedPackage.bonus;

    const db = await getDB();

    // In production, verify payment with Portone API here
    // For now, we'll trust the request (development mode)
    if (process.env.NODE_ENV === 'production' && impUid) {
      // TODO: Verify payment with Portone API
      // const verifyResponse = await fetch('https://api.iamport.kr/payments/' + impUid);
      // Verify amount matches packageType price
    }

    // Update user points
    const updatedUser = await db.User.findByIdAndUpdate(
      session.user.id,
      { $inc: { points: totalPoints } }
    ) as { points: number; _id?: string } | null;

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        pointsAdded: totalPoints,
        newBalance: updatedUser.points,
        package: packageType,
      },
      message: `${totalPoints} 포인트가 충전되었습니다!`,
    });
  } catch (error) {
    console.error('[API /api/points/charge]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/points/charge - Get available packages
export async function GET() {
  return NextResponse.json({
    data: {
      packages: POINTS_PACKAGES,
      currency: 'KRW',
      pointValue: 5, // 1 point = 5 KRW
    },
  });
}
