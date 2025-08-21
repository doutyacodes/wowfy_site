'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import QuizInterface from '../../../components/QuizInterface';
import ModeratorCodeModal from '../../../components/ModeratorCodeModal';

export default function SessionPage() {
  const [sessionData, setSessionData] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [tableLocks, setTableLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [showModeratorModal, setShowModeratorModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId;

  useEffect(() => {
    // Don't redirect if auth is still loading
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    fetchSessionData();
    // Set up polling for real-time updates
    const interval = setInterval(fetchTableLocks, 5000);
    return () => clearInterval(interval);
  }, [user, authLoading, sessionId, router]);

  const fetchSessionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [sessionRes, challengesRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/sessions/${sessionId}/challenges`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (sessionRes.ok && challengesRes.ok) {
        const sessionData = await sessionRes.json();
        const challengesData = await challengesRes.json();
        
        console.log('Loaded challenges:', challengesData.challenges);
        
        setSessionData(sessionData);
        // setChallenges(challengesData.challenges);
setChallenges(challengesData.challenges.filter((_, index) => index !== 0));
        await fetchTableLocks();
      } else {
        setError('Failed to load session data');
      }
    } catch (error) {
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableLocks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}/locks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTableLocks(data.locks);
      }
    } catch (error) {
      console.error('Failed to fetch table locks:', error);
    }
  };

  const handleChallengeStart = async (challengeId) => {
    console.log('Starting challenge with ID:', challengeId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}/challenges/${challengeId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveChallenge(data.challenge);
        
        if (data.challengeType === 'quiz' && data.quizData) {
          setQuizData(data.quizData);
        } else {
          // For non-quiz challenges, show moderator code modal
          setShowModeratorModal(true);
        }
        
        await fetchTableLocks();
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (error) {
      setError('Failed to start challenge');
    }
  };

  const handleQuizComplete = async (quizSubmission) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}/challenges/${activeChallenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizSubmission)
      });

      if (response.ok) {
        const result = await response.json();
        setError('');
        alert(`Quiz completed! ${result.message}`);
        setActiveChallenge(null);
        setQuizData(null);
        await fetchSessionData();
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (error) {
      setError('Failed to submit quiz');
    }
  };

  const handleChallengeSubmit = async (submissionData) => {
    setSubmittingChallenge(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}/challenges/${activeChallenge.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const result = await response.json();
        setError('');
        alert(`Challenge completed! ${result.message}`);
        setActiveChallenge(null);
        setShowModeratorModal(false);
        await fetchSessionData();
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (error) {
      setError('Failed to submit challenge');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleCloseChallenge = () => {
    setActiveChallenge(null);
    setQuizData(null);
    setShowModeratorModal(false);
  };

  const handleEndSession = async () => {
    setEndingSession(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        router.push('/');
      } else {
        setError('Failed to end session');
      }
    } catch (error) {
      setError('Failed to end session');
    } finally {
      setEndingSession(false);
    }
  };

  const getChallengeStatus = (challenge) => {
    if (challenge.isCompleted) {
      return 'completed';
    }
    
    const lock = tableLocks.find(lock => lock.challengeId === challenge.id);
    if (lock) {
      return lock.lockedByUser === user.id ? 'locked-by-me' : 'locked-by-other';
    }
    return 'available';
  };

  const getChallengeTypeIcon = (type) => {
    switch (type) {
      case 'quiz':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'purchase':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'photo':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        );
      case 'location':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading your session...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!user || !sessionData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Enhanced Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm"
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            WOWFY
          </Link>
          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Session Active</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Welcome, {user.username}</div>
              <div className="text-xs font-medium">
                {user.isGuest === 'yes' ? (
                  <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                    Guest ({sessionData.tempPoints || 0} temp points)
                  </span>
                ) : (
                  <span className="text-green-600">{sessionData.pointsEarned || 0} session points</span>
                )}
              </div>
            </div>
          </div>
        </nav>
      </motion.header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-gray-900">Table {sessionData.table?.tableNumber}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{sessionData.page?.name}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Challenge Arena</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Complete challenges to earn points. Only one person can attempt a challenge at your table at a time.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AnimatePresence>
            {challenges.map((challenge, index) => {
              const status = getChallengeStatus(challenge);
              const isCompleted = status === 'completed';
              const isLocked = status !== 'available' && status !== 'completed';
              const isLockedByMe = status === 'locked-by-me';
              const isLockedByOther = status === 'locked-by-other';
// console.log("challenge",challenge)
              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-50 border-2 border-green-300 opacity-75'
                      : isLockedByOther 
                      ? 'bg-gray-100 border-2 border-gray-300' 
                      : isLockedByMe
                      ? 'bg-blue-50 border-2 border-blue-300 shadow-blue-200'
                      : 'bg-white hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                  }`}
                  whileHover={!isLocked && !isCompleted ? { scale: 1.02 } : {}}
                >
                  {/* Challenge Type Badge */}
                  <div className={`absolute top-4 right-4 p-2 rounded-full ${
                    challenge.challengeType === 'quiz' ? 'bg-blue-100 text-blue-600' :
                    challenge.challengeType === 'purchase' ? 'bg-green-100 text-green-600' :
                    challenge.challengeType === 'photo' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {getChallengeTypeIcon(challenge.challengeType)}
                  </div>

                  {/* Status Indicator */}
                  {(isCompleted || isLocked) && (
                    <div className="absolute top-4 left-4">
                      {isCompleted ? (
                        <div className="flex items-center space-x-1 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Completed</span>
                        </div>
                      ) : isLockedByMe ? (
                        <div className="flex items-center space-x-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          <span>You're playing</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          <span>In use</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold mb-2 ${
                        isCompleted ? 'text-green-700' : 
                        isLockedByOther ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {challenge.title}
                      </h3>
                      <p className={`text-sm ${
                        isCompleted ? 'text-green-600' : 
                        isLockedByOther ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {challenge.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center space-x-2 ${
                        isCompleted ? 'text-green-600' :
                        isLockedByOther ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">
                          {challenge.timeLimit ? `${challenge.timeLimit} min` : 'No time limit'}
                        </span>
                      </div>
                      <div className={`font-bold ${
                        challenge.difficultyLevel === 'easy' ? 'text-green-600' :
                        challenge.difficultyLevel === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        +{challenge.pointsReward} pts
                      </div>
                    </div>

                    <motion.button
                      whileHover={!isLocked && !isCompleted ? { scale: 1.05 } : {}}
                      whileTap={!isLocked && !isCompleted ? { scale: 0.95 } : {}}
                      onClick={() => !isLocked && !isCompleted && handleChallengeStart(challenge.id)}
                      disabled={isLocked || isCompleted}
                      className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                        isCompleted
                          ? 'bg-green-200 text-green-700 cursor-not-allowed'
                          : isLockedByOther 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : isLockedByMe
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg'
                      }`}
                    >
                      {isCompleted ? '✓ Already Completed' :
                       isLockedByOther ? 'Challenge In Use' : 
                       isLockedByMe ? 'Continue Challenge' : 
                       'Start Challenge'}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Session Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center space-x-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEndSession}
            disabled={endingSession}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:from-red-700 hover:to-pink-700 transition-all disabled:opacity-50"
          >
            {endingSession ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ending Session...
              </div>
            ) : (
              'End Session'
            )}
          </motion.button>
        </motion.div>

        {/* Guest User Upgrade Prompt */}
        {user.isGuest === 'yes' && sessionData.tempPoints > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-orange-800 mb-2">Save Your Progress!</h3>
            <p className="text-orange-700 mb-4">
              You have {sessionData.tempPoints} temporary points. Create an account to save them permanently!
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all"
            >
              Create Account & Save Points
            </Link>
          </motion.div>
        )}
      </div>

      {/* Quiz Interface */}
      {quizData && activeChallenge && (
        <QuizInterface
          quizData={quizData}
          challenge={activeChallenge}
          onComplete={handleQuizComplete}
          onClose={handleCloseChallenge}
        />
      )}

      {/* Moderator Code Modal */}
      {showModeratorModal && activeChallenge && (
        <ModeratorCodeModal
          challenge={activeChallenge}
          onSubmit={handleChallengeSubmit}
          onClose={handleCloseChallenge}
          isSubmitting={submittingChallenge}
        />
      )}
    </div>
  );
}