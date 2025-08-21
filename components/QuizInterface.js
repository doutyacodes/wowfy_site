'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizInterface({ quizData, challenge, onComplete, onClose }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [totalStartTime, setTotalStartTime] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Start total timer when quiz begins
    setTotalStartTime(Date.now());
    setQuestionStartTime(Date.now());
  }, []);

  useEffect(() => {
    // Reset question timer when moving to next question
    if (currentQuestionIndex < quizData.questions.length) {
      setQuestionStartTime(Date.now());
      setSelectedOption(null);
    }
  }, [currentQuestionIndex]);

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleNextQuestion = () => {
    if (!selectedOption) return;

    const responseTime = Date.now() - questionStartTime;
    
    // Record answer
    const newAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: selectedOption,
      responseTimeMs: responseTime,
      questionOrder: currentQuestion.questionOrder
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Submit quiz
      handleQuizSubmit(updatedAnswers);
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleQuizSubmit = async (finalAnswers) => {
    setIsSubmitting(true);
    
    const totalTimeMs = Date.now() - totalStartTime;
    
    try {
      await onComplete({
        answers: finalAnswers,
        totalTimeMs: totalTimeMs
      });
    } catch (error) {
      console.error('Quiz submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ms) => {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const calculateCurrentScore = () => {
    if (!questionStartTime) return 1000;
    const elapsed = Date.now() - questionStartTime;
    const timeLimit = (currentQuestion.timeLimit || 30) * 1000; // Convert to ms
    const score = Math.max(0, 1000 - (elapsed * 1000 / timeLimit));
    return Math.round(score);
  };

  const [liveScore, setLiveScore] = useState(1000);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScore(calculateCurrentScore());
    }, 50); // Update every 50ms for smooth countdown

    return () => clearInterval(interval);
  }, [questionStartTime, currentQuestion]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Quiz Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{challenge.title}</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div>
              Question {currentQuestionIndex + 1} of {quizData.questions.length}
            </div>
            <div className="text-right">
              <div>Live Score: <span className="font-bold text-yellow-300">{liveScore}</span></div>
              <div>Time Limit: {currentQuestion.timeLimit || 30}s</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
              className="bg-yellow-300 h-2 rounded-full"
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                {currentQuestion.questionText}
              </h3>

              {currentQuestion.mediaUrl && (
                <div className="mb-6">
                  {currentQuestion.mediaType === 'image' && (
                    <img 
                      src={currentQuestion.mediaUrl} 
                      alt="Question media"
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  )}
                  {currentQuestion.mediaType === 'video' && (
                    <video 
                      src={currentQuestion.mediaUrl} 
                      controls
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  )}
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <motion.button
                    key={option.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleOptionSelect(option.id)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      selectedOption === option.id
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === option.id
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedOption === option.id && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-lg">{option.optionText}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Next Button */}
          <div className="mt-8 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              disabled={!selectedOption || isSubmitting}
              className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all ${
                !selectedOption || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </div>
              ) : isLastQuestion ? (
                'Submit Quiz'
              ) : (
                'Next Question'
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}