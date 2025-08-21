import { NextResponse } from 'next/server';
import { db } from '../../../../../../../lib/db';
import { userSessions, sessionChallengeLocks, challenges, quizQuestions, quizOptions, userChallengeAttempts } from '../../../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifyToken } from '../../../../../../../lib/auth';

export async function POST(request, { params }) {
  try {
    const { sessionId, challengeId } = params;
    
    console.log('Start challenge params:', { sessionId, challengeId });
    
    if (!challengeId || challengeId === 'undefined' || isNaN(parseInt(challengeId))) {
      return NextResponse.json(
        { error: 'Invalid challenge ID' },
        { status: 400 }
      );
    }
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
        { error: 'Session not found or not active' },
        { status: 404 }
      );
    }

    const sessionRecord = session[0];

    // Check if challenge exists and is active
    const challenge = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.id, parseInt(challengeId)),
          eq(challenges.isActive, 'yes')
        )
      )
      .limit(1);

    if (challenge.length === 0) {
      return NextResponse.json(
        { error: 'Challenge not found or not active' },
        { status: 404 }
      );
    }

    const challengeRecord = challenge[0];

    // Check if user has already completed this challenge (globally, not just this session)
    const previousAttempt = await db
      .select()
      .from(userChallengeAttempts)
      .where(
        and(
          eq(userChallengeAttempts.userId, decoded.userId),
          eq(userChallengeAttempts.challengeId, parseInt(challengeId)),
          eq(userChallengeAttempts.status, 'completed')
        )
      )
      .limit(1);

    if (previousAttempt.length > 0) {
      return NextResponse.json(
        { error: 'You have already completed this challenge. Each challenge can only be completed once per user.' },
        { status: 409 }
      );
    }

    // Check if this challenge is already locked by another user at this table
    const existingLock = await db
      .select()
      .from(sessionChallengeLocks)
      .where(
        and(
          eq(sessionChallengeLocks.tableId, sessionRecord.tableId),
          eq(sessionChallengeLocks.challengeId, parseInt(challengeId)),
          gt(sessionChallengeLocks.expiresAt, new Date())
        )
      )
      .limit(1);

    if (existingLock.length > 0 && existingLock[0].lockedByUser !== decoded.userId) {
      return NextResponse.json(
        { error: 'Challenge is currently being attempted by another user at your table' },
        { status: 409 }
      );
    }

    // If already locked by this user, return the existing lock
    if (existingLock.length > 0 && existingLock[0].lockedByUser === decoded.userId) {
      return NextResponse.json({
        message: 'Challenge already started',
        challenge: challengeRecord,
        lockExpiresAt: existingLock[0].expiresAt
      });
    }

    // Create a new lock for this challenge
    const lockDuration = challengeRecord.timeLimit || 30; // Default 30 minutes if no time limit
    const expiresAt = new Date(Date.now() + lockDuration * 60 * 1000);

    await db
      .insert(sessionChallengeLocks)
      .values({
        tableId: sessionRecord.tableId,
        challengeId: parseInt(challengeId),
        lockedByUser: decoded.userId,
        sessionId: parseInt(sessionId),
        expiresAt: expiresAt
      });

    // If it's a quiz challenge, get questions and options
    let quizData = null;
    if (challengeRecord.challengeType === 'quiz') {
      const questions = await db
        .select({
          id: quizQuestions.id,
          questionText: quizQuestions.questionText,
          questionType: quizQuestions.questionType,
          questionOrder: quizQuestions.questionOrder,
          points: quizQuestions.points,
          timeLimit: quizQuestions.timeLimit,
          mediaUrl: quizQuestions.mediaUrl,
          mediaType: quizQuestions.mediaType
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.challengeId, parseInt(challengeId)))
        .orderBy(quizQuestions.questionOrder);

      // Get options for each question
      for (let question of questions) {
        const options = await db
          .select({
            id: quizOptions.id,
            optionText: quizOptions.optionText,
            optionOrder: quizOptions.optionOrder,
            // Don't return isCorrect to frontend
          })
          .from(quizOptions)
          .where(eq(quizOptions.questionId, question.id))
          .orderBy(quizOptions.optionOrder);

        question.options = options;
      }

      quizData = {
        questions: questions,
        totalQuestions: questions.length,
        scoringInfo: {
          maxPointsPerQuestion: 1000,
          scoringFormula: "1000 points - (responseTime * 1000 / timeLimit)"
        }
      };
    }

    return NextResponse.json({
      message: 'Challenge started successfully',
      challenge: challengeRecord,
      lockExpiresAt: expiresAt,
      quizData: quizData,
      challengeType: challengeRecord.challengeType
    });

  } catch (error) {
    console.error('Start challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}