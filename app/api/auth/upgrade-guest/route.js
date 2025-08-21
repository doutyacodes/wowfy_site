import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { users } from '../../../../lib/schema';
import { hashPassword, verifyToken, validatePassword } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { password } = await request.json();
    
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

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { error: passwordErrors[0] },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRecord = user[0];

    if (userRecord.isGuest !== 'yes') {
      return NextResponse.json(
        { error: 'Account is already verified' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        isGuest: 'no',
        isVerified: 'yes',
      })
      .where(eq(users.id, decoded.userId));

    const updatedUser = await db
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

    return NextResponse.json({
      user: {
        ...updatedUser[0],
        isGuest: updatedUser[0].isGuest === 'yes',
        isVerified: updatedUser[0].isVerified === 'yes',
      },
    });

  } catch (error) {
    console.error('Upgrade guest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}