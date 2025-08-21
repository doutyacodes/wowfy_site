'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function VenueCodePage() {
  const [step, setStep] = useState('loading');
  const [venueData, setVenueData] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const venueCode = params.code;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to signup with current URL as redirect
        const currentUrl = `/venue/${venueCode}`;
        router.push(`/auth/signup?redirect=${encodeURIComponent(currentUrl)}`);
      } else {
        // User is logged in, fetch venue data
        fetchVenueData();
      }
    }
  }, [user, authLoading, venueCode, router]);

  const fetchVenueData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/venues/${venueCode.toUpperCase()}`);
      const data = await response.json();

      if (response.ok) {
        setVenueData(data);
        setStep('table');
      } else {
        setError(data.error);
        setStep('error');
      }
    } catch (error) {
      setError('Failed to find venue');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setStep('otp');
  };

  const generateOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/venues/${venueCode.toUpperCase()}/generate-otp`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setGeneratedOtp(data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/venues/${venueCode.toUpperCase()}/join-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: selectedTable.id,
          otpCode: otpCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/session/${data.session.sessionId}`);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join table');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading venue information...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-600">
            WOWFY
          </Link>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.username}</span>
              <div className="text-sm text-green-600 font-medium">
                {user.points} points
              </div>
            </div>
          )}
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {step === 'error' ? 'Venue Not Found' : 'Join Table'}
          </h1>
          <p className="text-gray-600">
            {step === 'error' 
              ? 'The venue code you\'re looking for is not available'
              : 'Select your table and verify with OTP to join the session'
            }
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Venue Code</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              
              <div className="space-y-4">
                <Link 
                  href="/venue" 
                  className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Try Another Code
                </Link>
                <Link 
                  href="/" 
                  className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}

          {step === 'table' && venueData && (
            <motion.div
              key="table"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Your Table</h2>

              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800">{venueData.venue.name}</h3>
                <p className="text-green-600 capitalize">{venueData.venue.type}</p>
                {venueData.venue.location && (
                  <p className="text-green-600 text-sm">{venueData.venue.location}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {venueData.tables.map((table) => (
                  <motion.button
                    key={table.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTableSelect(table)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
                  >
                    <div className="font-semibold text-gray-900">Table {table.tableNumber}</div>
                    <div className="text-sm text-gray-600">Up to {table.capacity} people</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'otp' && selectedTable && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Verify with OTP</h2>
                <button
                  onClick={() => setStep('table')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Change Table
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800">Selected: Table {selectedTable.tableNumber}</h3>
                <p className="text-blue-600">at {venueData.venue.name}</p>
              </div>

              {!generatedOtp && (
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">
                    Ask a staff member to generate an OTP for your table
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={generateOtp}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate OTP (Demo)'}
                  </motion.button>
                </div>
              )}

              {generatedOtp && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                  <p className="text-green-700 font-medium">Generated OTP (Demo):</p>
                  <p className="text-2xl font-mono font-bold text-green-800">{generatedOtp.otp}</p>
                  <p className="text-sm text-green-600">Valid for 5 minutes</p>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleJoinTable} className="space-y-6">
                <div>
                  <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP Code
                  </label>
                  <input
                    id="otpCode"
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-center text-lg font-mono"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || !otpCode || otpCode.length !== 6}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining table...' : 'Join Table'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}