import { NextResponse } from 'next/server';
import { db } from '../../../../../../../lib/db';
import { challengeLeaderboard, users, challenges } from '../../../../../../../lib/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyToken } from '../../../../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    const { challengeId } = params;
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

    // Get challenge info
    const challenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, parseInt(challengeId)))
      .limit(1);

    if (challenge.length === 0) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Get leaderboard data
    const leaderboardData = await db
      .select({
        id: challengeLeaderboard.id,
        userId: challengeLeaderboard.userId,
        username: users.username,
        completionTimeMs: challengeLeaderboard.completionTimeMs,
        totalScore: challengeLeaderboard.totalScore,
        correctAnswers: challengeLeaderboard.correctAnswers,
        totalQuestions: challengeLeaderboard.totalQuestions,
        completedAt: challengeLeaderboard.completedAt
      })
      .from(challengeLeaderboard)
      .leftJoin(users, eq(challengeLeaderboard.userId, users.id))
      .where(eq(challengeLeaderboard.challengeId, parseInt(challengeId)))
      .orderBy(
        desc(challengeLeaderboard.totalScore),
        challengeLeaderboard.completionTimeMs
      )
      .limit(50); // Top 50 entries

    // Add rank to each entry
    const rankedLeaderboard = leaderboardData.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      completionTimeFormatted: formatTime(entry.completionTimeMs)
    }));

    return NextResponse.json({
      challenge: {
        id: challenge[0].id,
        title: challenge[0].title,
        challengeType: challenge[0].challengeType
      },
      leaderboard: rankedLeaderboard,
      totalEntries: leaderboardData.length
    });

  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}.${Math.floor(ms / 100)}s`;
  } else {
    return `${seconds}.${Math.floor(ms / 100)}s`;
  }
}