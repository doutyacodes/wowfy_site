// Quiz scoring system based on time performance
// Base points: 1000 per question
// Time-based reduction: points decrease linearly with time taken

export function calculateQuizScore(timeAllottedSeconds, timeElapsedMilliseconds, basePoints = 1000) {
  // Convert time allotted to milliseconds
  const timeAllottedMs = timeAllottedSeconds * 1000;
  
  // Ensure elapsed time doesn't exceed allotted time
  const actualElapsedMs = Math.min(timeElapsedMilliseconds, timeAllottedMs);
  
  // Calculate score based on time performance
  // Formula: basePoints - (basePoints * (actualElapsedMs / timeAllottedMs))
  // If answered in 1 second out of 10 seconds: 1000 - (1000 * (1000/10000)) = 1000 - 100 = 900 points
  
  const timeRatio = actualElapsedMs / timeAllottedMs;
  const pointsLost = Math.floor(basePoints * timeRatio);
  const finalScore = Math.max(0, basePoints - pointsLost);
  
  return {
    basePoints,
    timeAllottedSeconds,
    timeElapsedMilliseconds: actualElapsedMs,
    timeRatio: parseFloat(timeRatio.toFixed(4)),
    pointsLost,
    finalScore,
    timeBonus: finalScore > basePoints * 0.8 ? 'Excellent' : 
               finalScore > basePoints * 0.6 ? 'Good' : 
               finalScore > basePoints * 0.4 ? 'Average' : 'Needs Improvement'
  };
}

// Calculate total quiz score for multiple questions
export function calculateTotalQuizScore(questionScores) {
  const totalBase = questionScores.reduce((sum, q) => sum + q.basePoints, 0);
  const totalFinal = questionScores.reduce((sum, q) => sum + q.finalScore, 0);
  const averageTimeRatio = questionScores.reduce((sum, q) => sum + q.timeRatio, 0) / questionScores.length;
  
  return {
    questionsCount: questionScores.length,
    totalBasePoints: totalBase,
    totalFinalScore: totalFinal,
    averageTimeRatio: parseFloat(averageTimeRatio.toFixed(4)),
    efficiency: parseFloat((totalFinal / totalBase * 100).toFixed(2)),
    grade: totalFinal >= totalBase * 0.9 ? 'A+' :
           totalFinal >= totalBase * 0.8 ? 'A' :
           totalFinal >= totalBase * 0.7 ? 'B' :
           totalFinal >= totalBase * 0.6 ? 'C' :
           totalFinal >= totalBase * 0.5 ? 'D' : 'F',
    questionScores
  };
}

// Validate quiz answer and calculate score
export function processQuizAnswer(question, selectedAnswer, timeElapsedMs) {
  const isCorrect = selectedAnswer === question.correctAnswer;
  const score = isCorrect ? 
    calculateQuizScore(question.timeLimit, timeElapsedMs, question.points) :
    { finalScore: 0, basePoints: question.points, timeElapsedMilliseconds: timeElapsedMs };
  
  return {
    questionId: question.id,
    selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect,
    ...score
  };
}

// Example usage and test function
export function testQuizScoring() {
  console.log('=== Quiz Scoring Test ===');
  
  // Test case 1: 10-second question answered in 1 second
  const test1 = calculateQuizScore(10, 1000, 1000);
  console.log('10s question, 1s answer:', test1);
  // Expected: ~900 points
  
  // Test case 2: 10-second question answered in 5 seconds
  const test2 = calculateQuizScore(10, 5000, 1000);
  console.log('10s question, 5s answer:', test2);
  // Expected: ~500 points
  
  // Test case 3: 10-second question answered in 10 seconds
  const test3 = calculateQuizScore(10, 10000, 1000);
  console.log('10s question, 10s answer:', test3);
  // Expected: ~0 points
  
  // Test case 4: Multiple questions
  const multipleQuestions = [
    calculateQuizScore(10, 2000, 1000), // 2s out of 10s
    calculateQuizScore(15, 5000, 1000), // 5s out of 15s
    calculateQuizScore(20, 8000, 1000), // 8s out of 20s
  ];
  
  const totalScore = calculateTotalQuizScore(multipleQuestions);
  console.log('Total quiz score:', totalScore);
  
  return { test1, test2, test3, totalScore };
}