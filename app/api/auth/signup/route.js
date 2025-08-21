import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { users } from '../../../../lib/schema';
import { hashPassword, generateToken, validateUsername, validatePassword } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { username, password, isGuest = false } = await request.json();

    const usernameErrors = validateUsername(username);
    if (usernameErrors.length > 0) {
      return NextResponse.json(
        { error: usernameErrors[0] },
        { status: 400 }
      );
    }

    if (!isGuest) {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        return NextResponse.json(
          { error: passwordErrors[0] },
          { status: 400 }
        );
      }
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        isGuest: isGuest ? 'yes' : 'no',
        isVerified: isGuest ? 'no' : 'yes',
        totalPoints: 0,
        status: 'active',
      })
      .execute();

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        isGuest: users.isGuest,
        isVerified: users.isVerified,
        totalPoints: users.totalPoints,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, newUser.insertId))
      .limit(1);

    const token = generateToken({ 
      userId: user[0].id, 
      username: user[0].username,
      isGuest: user[0].isGuest === 'yes'
    });

    return NextResponse.json({
      token,
      user: {
        ...user[0],
        isGuest: user[0].isGuest === 'yes',
        isVerified: user[0].isVerified === 'yes',
      },
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}