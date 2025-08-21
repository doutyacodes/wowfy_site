import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { userSessions, sessionChallengeLocks, users } from '../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifyToken } from '../../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;
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

    // Verify session belongs to user
    const session = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, parseInt(sessionId)),
          eq(userSessions.userId, decoded.userId),
          eq(userSessions.isActive, 'yes')
        )
      )
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all active locks for this table
    const locks = await db
      .select({
        id: sessionChallengeLocks.id,
        challengeId: sessionChallengeLocks.challengeId,
        lockedByUser: sessionChallengeLocks.lockedByUser,
        sessionId: sessionChallengeLocks.sessionId,
        lockedAt: sessionChallengeLocks.lockedAt,
        expiresAt: sessionChallengeLocks.expiresAt,
        username: users.username
      })
      .from(sessionChallengeLocks)
      .leftJoin(users, eq(sessionChallengeLocks.lockedByUser, users.id))
      .where(
        and(
          eq(sessionChallengeLocks.tableId, session[0].tableId),
          gt(sessionChallengeLocks.expiresAt, new Date())
        )
      );

    return NextResponse.json({
      locks: locks
    });

  } catch (error) {
    console.error('Locks fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}