import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getDB } from '@/lib/db/adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-zero number' },
        { status: 400 }
      );
    }

    const db = await getDB();

    const user = await db.User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = (user.points || 0) + amount;
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Resulting balance would be negative' },
        { status: 400 }
      );
    }

    const updatedUser = await db.User.findByIdAndUpdate(id, {
      points: newBalance,
    });

    console.log(
      `[admin] Points adjusted for ${user.email}: ${amount > 0 ? '+' : ''}${amount} (reason: ${reason || 'N/A'})`
    );

    return NextResponse.json({
      data: {
        userId: id,
        previousBalance: user.points,
        adjustment: amount,
        newBalance,
        reason: reason || '',
      },
    });
  } catch (error) {
    console.error('[API admin/users/[id]/points POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
