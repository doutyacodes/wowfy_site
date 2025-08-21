import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { users } from '../../../../lib/schema';
import { verifyToken } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        isGuest: users.isGuest,
        isVerified: users.isVerified,
        totalPoints: users.totalPoints,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...user[0],
      isGuest: user[0].isGuest === 'yes',
      isVerified: user[0].isVerified === 'yes',
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}