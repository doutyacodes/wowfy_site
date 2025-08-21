import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { userSessions, sessionChallengeLocks, users, userPointsHistory } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../../lib/auth';

export async function POST(request, { params }) {
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

    // Verify session belongs to user and is active
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
        { error: 'Session not found or already ended' },
        { status: 404 }
      );
    }

    const sessionRecord = session[0];

    // Release any challenge locks held by this user for this table
    await db
      .delete(sessionChallengeLocks)
      .where(
        and(
          eq(sessionChallengeLocks.tableId, sessionRecord.tableId),
          eq(sessionChallengeLocks.lockedByUser, decoded.userId)
        )
      );

    // Get user data to check if guest
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

    // End the session
    await db
      .update(userSessions)
      .set({
        isActive: 'no',
        endedAt: new Date()
      })
      .where(eq(userSessions.id, parseInt(sessionId)));

    // If not a guest user, transfer points to user's total
    if (userRecord.isGuest === 'no' && sessionRecord.pointsEarned > 0) {
      // Update user's total points
      await db
        .update(users)
        .set({
          totalPoints: userRecord.totalPoints + sessionRecord.pointsEarned
        })
        .where(eq(users.id, decoded.userId));

      // Record points transaction
      await db
        .insert(userPointsHistory)
        .values({
          userId: decoded.userId,
          pointsChange: sessionRecord.pointsEarned,
          transactionType: 'challenge_completion',
          referenceType: 'session',
          referenceId: parseInt(sessionId),
          description: `Session completed - ${sessionRecord.pointsEarned} points earned`
        });
    }

    return NextResponse.json({
      message: 'Session ended successfully',
      pointsEarned: sessionRecord.pointsEarned,
      tempPoints: sessionRecord.tempPoints,
      transferredToAccount: userRecord.isGuest === 'no' && sessionRecord.pointsEarned > 0
    });

  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}