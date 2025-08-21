import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { userSessions, challenges, pageChallenges, pages, userChallengeAttempts } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
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

    // Get page-specific challenges (simplified query to debug)
    const pageSpecificChallenges = await db
      .select()
      .from(challenges)
      .innerJoin(pageChallenges, eq(challenges.id, pageChallenges.challengeId))
      .where(
        and(
          eq(pageChallenges.pageId, session[0].pageId),
          eq(challenges.isActive, 'yes')
        )
      );

    // Get global challenges (simplified query to debug)
    const globalChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.isGlobal, 'yes'),
          eq(challenges.isActive, 'yes')
        )
      );

    // Combine and deduplicate challenges
    const allChallenges = [...pageSpecificChallenges, ...globalChallenges];
    
    const uniqueChallenges = allChallenges.filter((challenge, index, self) => 
      index === self.findIndex(c => c.id === challenge.id)
    );

    console.log('Returning challenges:', uniqueChallenges.length);
    
    // Get user's completed challenges to mark them as completed
    const completedChallenges = await db
      .select({
        challengeId: userChallengeAttempts.challengeId
      })
      .from(userChallengeAttempts)
      .where(
        and(
          eq(userChallengeAttempts.userId, decoded.userId),
          eq(userChallengeAttempts.status, 'completed')
        )
      );

    const completedChallengeIds = new Set(completedChallenges.map(c => c.challengeId));
    
    // Simplified response for debugging
    const response = {
      challenges: uniqueChallenges.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        challengeType: challenge.challengeType,
        difficultyLevel: challenge.difficultyLevel,
        pointsReward: challenge.pointsReward,
        timeLimit: challenge.timeLimit,
        maxAttempts: challenge.maxAttempts,
        requiresModerator: challenge.requiresModerator,
        isCompleted: completedChallengeIds.has(challenge.id)
      }))
    };
    
    console.log('Response data:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Challenges fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}