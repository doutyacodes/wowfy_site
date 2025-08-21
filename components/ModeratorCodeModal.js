'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ModeratorCodeModal({ challenge, onSubmit, onClose, isSubmitting }) {
  const [moderatorCode, setModeratorCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!moderatorCode.trim()) {
      setError('Please enter the moderator code');
      return;
    }
    
    setError('');
    onSubmit({
      moderatorCode: moderatorCode.trim(),
      submissionType: challenge.challengeType
    });
  };

  const getChallengeInstructions = () => {
    switch (challenge.challengeType) {
      case 'purchase':
        return 'Complete your purchase and ask the staff for the verification code.';
      case 'photo':
        return 'Take the required photo and show it to the staff for verification.';
      case 'location':
        return 'Complete the location-based task and get the code from the staff.';
      case 'checkin':
        return 'Complete the check-in requirement and ask for verification.';
      default:
        return 'Complete the challenge and ask the staff for the verification code.';
    }
  };

  const getExampleCode = () => {
    switch (challenge.challengeType) {
      case 'purchase':
        return 'e.g., MAIN10OFF or DOUBLE2FREE';
      default:
        return `e.g., MOD_${challenge.id}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Complete Challenge</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {challenge.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {challenge.description}
            </p>
            
            {/* Challenge Type Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="capitalize">{challenge.challengeType} Challenge</span>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-800 mb-2">Instructions:</h4>
              <p className="text-yellow-700 text-sm">
                {getChallengeInstructions()}
              </p>
            </div>

            {/* Points Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Reward:</span>
                <span className="text-green-600 font-bold text-lg">
                  +{challenge.pointsReward} points
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="moderatorCode" className="block text-sm font-medium text-gray-700 mb-2">
                Moderator Verification Code
              </label>
              <input
                type="text"
                id="moderatorCode"
                value={moderatorCode}
                onChange={(e) => setModeratorCode(e.target.value.toUpperCase())}
                placeholder={getExampleCode()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-mono text-lg tracking-wider"
                disabled={isSubmitting}
                autoComplete="off"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the code provided by the staff after completing the challenge
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
              >
                {error}
              </motion.div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !moderatorCode.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Submit Challenge'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}