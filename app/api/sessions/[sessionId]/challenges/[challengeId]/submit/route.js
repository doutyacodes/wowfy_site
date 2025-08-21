import { NextResponse } from 'next/server';
import { db } from '../../../../../../../lib/db';
import { 
  userSessions, 
  sessionChallengeLocks, 
  challenges, 
  quizQuestions, 
  quizOptions,
  userChallengeAttempts,
  challengeLeaderboard,
  users,
  purchaseChallenges
} from '../../../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifyToken } from '../../../../../../../lib/auth';

export async function POST(request, { params }) {
  try {
    const { sessionId, challengeId } = params;
    const body = await request.json();
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

    // Verify challenge exists and user has an active lock
    const lock = await db
      .select()
      .from(sessionChallengeLocks)
      .where(
        and(
          eq(sessionChallengeLocks.tableId, sessionRecord.tableId),
          eq(sessionChallengeLocks.challengeId, parseInt(challengeId)),
          eq(sessionChallengeLocks.lockedByUser, decoded.userId),
          gt(sessionChallengeLocks.expiresAt, new Date())
        )
      )
      .limit(1);

    if (lock.length === 0) {
      return NextResponse.json(
        { error: 'No active challenge lock found' },
        { status: 403 }
      );
    }

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

    const challengeRecord = challenge[0];

    if (challengeRecord.challengeType === 'quiz') {
      // Handle quiz submission
      return await handleQuizSubmission(body, sessionRecord, challengeRecord, decoded, parseInt(sessionId), parseInt(challengeId));
    } else {
      // Handle other challenge types (purchase, photo, etc.)
      return await handleOtherChallengeSubmission(body, sessionRecord, challengeRecord, decoded, parseInt(sessionId), parseInt(challengeId));
    }

  } catch (error) {
    console.error('Submit challenge error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleQuizSubmission(body, sessionRecord, challengeRecord, decoded, sessionId, challengeId) {
  const { answers, totalTimeMs } = body;

  if (!answers || !Array.isArray(answers) || !totalTimeMs) {
    return NextResponse.json(
      { error: 'Invalid quiz submission data' },
      { status: 400 }
    );
  }

  // Get all questions with correct answers
  const questions = await db
    .select({
      id: quizQuestions.id,
      points: quizQuestions.points,
      timeLimit: quizQuestions.timeLimit,
      questionOrder: quizQuestions.questionOrder
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.challengeId, challengeId))
    .orderBy(quizQuestions.questionOrder);

  let totalScore = 0;
  let correctAnswers = 0;
  const questionResults = [];

  // Calculate score for each question
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    const question = questions[i];
    
    if (!question) continue;

    // Get correct option for this question
    const correctOption = await db
      .select()
      .from(quizOptions)
      .where(
        and(
          eq(quizOptions.questionId, question.id),
          eq(quizOptions.isCorrect, 'yes')
        )
      )
      .limit(1);

    const isCorrect = correctOption.length > 0 && correctOption[0].id === answer.selectedOptionId;
    
    if (isCorrect) {
      correctAnswers++;
      
      // Calculate score based on timing: 1000 - (responseTime * 1000 / timeLimit)
      const timeLimit = question.timeLimit || 30; // seconds
      const responseTimeSeconds = answer.responseTimeMs / 1000;
      const timeScore = Math.max(0, 1000 - (responseTimeSeconds * 1000 / timeLimit));
      
      totalScore += Math.round(timeScore);
    }

    questionResults.push({
      questionId: question.id,
      questionOrder: question.questionOrder,
      selectedOptionId: answer.selectedOptionId,
      responseTimeMs: answer.responseTimeMs,
      isCorrect: isCorrect,
      scoreEarned: isCorrect ? Math.round(1000 - (answer.responseTimeMs / 1000 * 1000 / (question.timeLimit || 30))) : 0
    });
  }

  // User gets challenge points if at least one answer is correct
  const challengePointsEarned = correctAnswers > 0 ? challengeRecord.pointsReward : 0;

  // Record the attempt
  const [attemptResult] = await db
    .insert(userChallengeAttempts)
    .values({
      userId: decoded.userId,
      sessionId: sessionId,
      challengeId: challengeId,
      pageId: sessionRecord.pageId,
      status: 'completed',
      pointsEarned: challengePointsEarned,
      completionData: JSON.stringify({
        answers: questionResults,
        totalTimeMs: totalTimeMs,
        totalScore: totalScore,
        correctAnswers: correctAnswers,
        totalQuestions: questions.length
      }),
      completedAt: new Date()
    });

  // Add to leaderboard
  await db
    .insert(challengeLeaderboard)
    .values({
      challengeId: challengeId,
      userId: decoded.userId,
      sessionId: sessionId,
      pageId: sessionRecord.pageId,
      completionTimeMs: totalTimeMs,
      totalScore: totalScore,
      correctAnswers: correctAnswers,
      totalQuestions: questions.length
    });

  // Update session points
  await db
    .update(userSessions)
    .set({
      pointsEarned: sessionRecord.pointsEarned + challengePointsEarned,
      tempPoints: sessionRecord.tempPoints + challengePointsEarned
    })
    .where(eq(userSessions.id, sessionId));

  // Release the lock
  await db
    .delete(sessionChallengeLocks)
    .where(
      and(
        eq(sessionChallengeLocks.tableId, sessionRecord.tableId),
        eq(sessionChallengeLocks.challengeId, challengeId),
        eq(sessionChallengeLocks.lockedByUser, decoded.userId)
      )
    );

  return NextResponse.json({
    success: true,
    totalScore: totalScore,
    correctAnswers: correctAnswers,
    totalQuestions: questions.length,
    challengePointsEarned: challengePointsEarned,
    totalTimeMs: totalTimeMs,
    questionResults: questionResults,
    message: correctAnswers > 0 ? 
      `Great job! You scored ${totalScore} points and earned ${challengePointsEarned} challenge points!` :
      `Better luck next time! You need at least one correct answer to earn challenge points.`
  });
}

async function handleOtherChallengeSubmission(body, sessionRecord, challengeRecord, decoded, sessionId, challengeId) {
  const { moderatorCode, submissionType } = body;

  if (!moderatorCode || !submissionType) {
    return NextResponse.json(
      { error: 'Moderator code and submission type required' },
      { status: 400 }
    );
  }

  // For purchase challenges, verify against purchase_challenges table
  if (challengeRecord.challengeType === 'purchase') {
    const purchaseChallenge = await db
      .select()
      .from(purchaseChallenges)
      .where(
        and(
          eq(purchaseChallenges.challengeId, challengeId),
          eq(purchaseChallenges.moderatorCode, moderatorCode.toUpperCase()),
          eq(purchaseChallenges.isActive, 'yes')
        )
      )
      .limit(1);

    if (purchaseChallenge.length === 0) {
      return NextResponse.json(
        { error: 'Invalid moderator code' },
        { status: 400 }
      );
    }
  } else {
    // For other challenge types, use a simple verification (you can enhance this)
    // For now, accept codes like "MOD_[CHALLENGEID]" 
    const expectedCode = `MOD_${challengeId}`;
    if (moderatorCode.toUpperCase() !== expectedCode) {
      return NextResponse.json(
        { error: 'Invalid moderator code' },
        { status: 400 }
      );
    }
  }

  // Record the attempt
  await db
    .insert(userChallengeAttempts)
    .values({
      userId: decoded.userId,
      sessionId: sessionId,
      challengeId: challengeId,
      pageId: sessionRecord.pageId,
      status: 'completed',
      pointsEarned: challengeRecord.pointsReward,
      moderatorCode: moderatorCode,
      completionData: JSON.stringify({
        submissionType: submissionType,
        verifiedAt: new Date()
      }),
      completedAt: new Date()
    });

  // Update session points
  await db
    .update(userSessions)
    .set({
      pointsEarned: sessionRecord.pointsEarned + challengeRecord.pointsReward,
      tempPoints: sessionRecord.tempPoints + challengeRecord.pointsReward
    })
    .where(eq(userSessions.id, sessionId));

  // Release the lock
  await db
    .delete(sessionChallengeLocks)
    .where(
      and(
        eq(sessionChallengeLocks.tableId, sessionRecord.tableId),
        eq(sessionChallengeLocks.challengeId, challengeId),
        eq(sessionChallengeLocks.lockedByUser, decoded.userId)
      )
    );

  return NextResponse.json({
    success: true,
    challengePointsEarned: challengeRecord.pointsReward,
    message: `Challenge completed! You earned ${challengeRecord.pointsReward} points.`
  });
}