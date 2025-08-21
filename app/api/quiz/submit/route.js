import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { 
  userChallengeAttempts, 
  quizQuestions, 
  quizOptions, 
  challenges,
  userSessions,
  users,
  userPointsHistory
} from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../lib/auth';
import { calculateQuizScore, calculateTotalQuizScore, processQuizAnswer } from '../../../../lib/quizScoring';

export async function POST(request) {
  try {
    const { challengeId, sessionId, answers } = await request.json();
    
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

    if (!challengeId || !sessionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Challenge ID, session ID, and answers array are required' },
        { status: 400 }
      );
    }

    // Verify the challenge is a quiz type
    const challenge = await db
      .select()
      .from(challenges)
      .where(and(
        eq(challenges.id, challengeId),
        eq(challenges.challengeType, 'quiz'),
        eq(challenges.isActive, 'yes')
      ))
      .limit(1);

    if (challenge.length === 0) {
      return NextResponse.json(
        { error: 'Quiz challenge not found or inactive' },
        { status: 404 }
      );
    }

    const challengeRecord = challenge[0];

    // Verify user has an active session
    const session = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, decoded.userId),
        eq(userSessions.isActive, 'yes')
      ))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or inactive session' },
        { status: 404 }
      );
    }

    // Get quiz questions with correct answers
    const questions = await db
      .select({
        questionId: quizQuestions.id,
        questionText: quizQuestions.questionText,
        questionOrder: quizQuestions.questionOrder,
        points: quizQuestions.points,
        timeLimit: quizQuestions.timeLimit,
        correctOption: quizOptions.id,
      })
      .from(quizQuestions)
      .leftJoin(quizOptions, and(
        eq(quizQuestions.id, quizOptions.questionId),
        eq(quizOptions.isCorrect, 'yes')
      ))
      .where(eq(quizQuestions.challengeId, challengeId))
      .orderBy(quizQuestions.questionOrder);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this quiz' },
        { status: 404 }
      );
    }

    // Process each answer and calculate scores
    const questionScores = [];
    let totalCorrect = 0;
    let totalFinalScore = 0;

    for (const answer of answers) {
      const question = questions.find(q => q.questionId === answer.questionId);
      
      if (!question) {
        continue; // Skip invalid question IDs
      }

      const isCorrect = answer.selectedOptionId === question.correctOption;
      const timeElapsedMs = answer.timeElapsedMilliseconds || 0;
      
      // Calculate score based on time performance
      const score = isCorrect ? 
        calculateQuizScore(question.timeLimit, timeElapsedMs, question.points) :
        {
          basePoints: question.points,
          timeElapsedMilliseconds: timeElapsedMs,
          timeRatio: 1,
          pointsLost: question.points,
          finalScore: 0,
          timeBonus: 'Incorrect'
        };

      questionScores.push({
        questionId: question.questionId,
        selectedOptionId: answer.selectedOptionId,
        correctOptionId: question.correctOption,
        isCorrect,
        ...score
      });

      if (isCorrect) {
        totalCorrect++;
        totalFinalScore += score.finalScore;
      }
    }

    // Calculate total quiz score
    const totalScore = calculateTotalQuizScore(questionScores);

    // Check if user already attempted this challenge
    const existingAttempt = await db
      .select()
      .from(userChallengeAttempts)
      .where(and(
        eq(userChallengeAttempts.userId, decoded.userId),
        eq(userChallengeAttempts.challengeId, challengeId),
        eq(userChallengeAttempts.sessionId, sessionId)
      ))
      .limit(1);

    let attempt;
    const completionData = {
      answers: questionScores,
      totalScore,
      submittedAt: new Date().toISOString()
    };

    if (existingAttempt.length > 0) {
      // Update existing attempt
      await db
        .update(userChallengeAttempts)
        .set({
          status: 'completed',
          pointsEarned: totalScore.totalFinalScore,
          completionData: JSON.stringify(completionData),
          completedAt: new Date(),
        })
        .where(eq(userChallengeAttempts.id, existingAttempt[0].id));
      
      attempt = { id: existingAttempt[0].id };
    } else {
      // Create new attempt
      const [newAttempt] = await db
        .insert(userChallengeAttempts)
        .values({
          userId: decoded.userId,
          sessionId: sessionId,
          challengeId: challengeId,
          pageId: session[0].pageId,
          attemptNumber: 1,
          status: 'completed',
          pointsEarned: totalScore.totalFinalScore,
          completionData: JSON.stringify(completionData),
          completedAt: new Date(),
        });
      
      attempt = { id: newAttempt.insertId };
    }

    // Update user's total points
    await db
      .update(users)
      .set({
        totalPoints: db.raw(`total_points + ${totalScore.totalFinalScore}`)
      })
      .where(eq(users.id, decoded.userId));

    // Record points transaction
    await db
      .insert(userPointsHistory)
      .values({
        userId: decoded.userId,
        pointsChange: totalScore.totalFinalScore,
        transactionType: 'challenge_completion',
        referenceType: 'challenge',
        referenceId: challengeId,
        description: `Quiz completed: ${challengeRecord.title}`,
      });

    // Update session points
    await db
      .update(userSessions)
      .set({
        pointsEarned: db.raw(`points_earned + ${totalScore.totalFinalScore}`)
      })
      .where(eq(userSessions.id, sessionId));

    return NextResponse.json({
      message: 'Quiz submitted successfully',
      attempt: {
        id: attempt.id,
        challengeId,
        status: 'completed',
        pointsEarned: totalScore.totalFinalScore,
      },
      results: {
        totalQuestions: questions.length,
        correctAnswers: totalCorrect,
        totalScore: totalScore.totalFinalScore,
        maxPossibleScore: totalScore.totalBasePoints,
        efficiency: totalScore.efficiency,
        grade: totalScore.grade,
        questionResults: questionScores.map(q => ({
          questionId: q.questionId,
          isCorrect: q.isCorrect,
          points: q.finalScore,
          timeBonus: q.timeBonus,
          timeElapsed: q.timeElapsedMilliseconds
        }))
      }
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}