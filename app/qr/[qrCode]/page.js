'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function QRAccessPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableCode, setTableCode] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [joining, setJoining] = useState(false);
  const [step, setStep] = useState('page'); // 'page', 'code', 'joining'
  const [redirecting, setRedirecting] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const qrCode = params.qrCode; // This will be the page/venue code

  // Reset states when qrCode changes
  useEffect(() => {
    setPageData(null);
    setError('');
    setTableCode('');
    setSelectedTable(null);
    setStep('page');
    setLoading(true);
    setRedirecting(false);
  }, [qrCode]);

  // Handle authentication and data fetching
  useEffect(() => {
    if (!authLoading && !redirecting) {
      if (!user) {
        // Only redirect if we're sure there's no user and we have a qrCode
        if (qrCode) {
          setRedirecting(true);
          const currentUrl = `/qr/${qrCode}`;
          router.push(`/auth/signup?redirect=${encodeURIComponent(currentUrl)}`);
        }
      } else if (qrCode) {
        // User is authenticated, fetch page data
        fetchPageData();
      }
    }
  }, [user, authLoading, qrCode, redirecting]);

  const fetchPageData = async () => {
    setLoading(true);
    setError('');

    try {
      // Use venues API endpoint to get page by code
      const response = await fetch(`/api/venues/${qrCode}`);
      const data = await response.json();

      if (response.ok) {
        setPageData(data);
        setStep('code');
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const handleTableCodeSubmit = async (e) => {
    e.preventDefault();
    if (!tableCode || !pageData) return;

    setJoining(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/venues/${qrCode}/join-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tableCode: tableCode.trim().toUpperCase()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedTable(data.table);
        setStep('joining');
        // Redirect to session after a brief success animation
        setTimeout(() => {
          router.push(`/session/${data.session.id}`);
        }, 2000);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join table');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {redirecting ? 'Redirecting to signup...' : 'Loading venue...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-green-600">
            WOWFY
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user.username}</span>
            <div className="text-sm text-green-600 font-medium">
              {user.isGuest === 'yes' ? (
                <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs">
                  Guest ({user.totalPoints} temp points)
                </span>
              ) : (
                `${user.totalPoints} points`
              )}
            </div>
          </div>
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {error && (
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
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Venue Not Found</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              
              <div className="space-y-4">
                <button 
                  onClick={fetchPageData}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Try Again
                </button>
                <Link 
                  href="/" 
                  className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}

          {step === 'code' && pageData && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              {/* Page Banner */}
              {pageData.page.banner && (
                <div className="h-32 bg-gradient-to-r from-green-400 to-blue-400 relative overflow-hidden">
                  <img 
                    src={pageData.page.banner} 
                    alt={pageData.page.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                </div>
              )}

              <div className="p-8">
                {/* Page Info */}
                <div className="flex items-start space-x-4 mb-8">
                  {pageData.page.logo && (
                    <img 
                      src={pageData.page.logo} 
                      alt={pageData.page.name}
                      className="w-16 h-16 rounded-xl object-cover shadow-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {pageData.page.name}
                    </h1>
                    <p className="text-green-600 capitalize font-medium mb-2">
                      {pageData.page.pageType}
                    </p>
                    {pageData.page.description && (
                      <p className="text-gray-600 text-sm mb-3">
                        {pageData.page.description}
                      </p>
                    )}
                    {pageData.page.location && (
                      <p className="text-gray-500 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {pageData.page.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Table Code Entry */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Enter Table Code</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Ask your server for the table code to join your table session
                  </p>
                  
                  <form onSubmit={handleTableCodeSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={tableCode}
                        onChange={(e) => setTableCode(e.target.value.toUpperCase())}
                        placeholder="Enter table code"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                        maxLength={10}
                        required
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={joining || !tableCode.trim()}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Joining Table...
                        </div>
                      ) : (
                        'Join Table'
                      )}
                    </motion.button>
                  </form>
                </div>

                {/* Help Info */}
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm">
                    <strong>Need help?</strong> Ask your server for the table code or scan a table-specific QR code if available.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'joining' && selectedTable && (
            <motion.div
              key="joining"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Table {selectedTable.tableNumber}!</h2>
              <p className="text-gray-600 mb-6">
                You've successfully joined the table session. Redirecting to your session...
              </p>

              <div className="animate-pulse bg-green-50 rounded-lg p-4">
                <p className="text-green-700 font-medium">Starting your challenge experience...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}