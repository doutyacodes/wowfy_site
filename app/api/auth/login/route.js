import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { users } from '../../../../lib/schema';
import { comparePassword, generateToken } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const userRecord = user[0];

    if (userRecord.isGuest === 'yes') {
      return NextResponse.json(
        { error: 'Guest accounts cannot login with password. Please upgrade your account first.' },
        { status: 401 }
      );
    }

    if (!userRecord.password) {
      return NextResponse.json(
        { error: 'Account has no password set' },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, userRecord.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = generateToken({ 
      userId: userRecord.id, 
      username: userRecord.username,
      isGuest: userRecord.isGuest === 'yes'
    });

    const userResponse = {
      id: userRecord.id,
      username: userRecord.username,
      isGuest: userRecord.isGuest === 'yes',
      isVerified: userRecord.isVerified === 'yes',
      totalPoints: userRecord.totalPoints,
    };

    return NextResponse.json({
      token,
      user: userResponse,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}