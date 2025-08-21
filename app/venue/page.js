'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function VenuePage() {
  const [step, setStep] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableCode, setTableCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/pages/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to search pages');
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelect = async (page) => {
    setSelectedPage(page);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/venues/${page.pageId}`);
      const data = await response.json();

      if (response.ok) {
        setPageData(data);
        setStep('code');
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load page data');
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
      const response = await fetch(`/api/venues/${selectedPage.pageId}/join-table`, {
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
        router.push(`/session/${data.session.id}`);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join table');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
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
              {user.totalPoints || 0} points
            </div>
          </div>
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Your Venue</h1>
          <p className="text-gray-600">
            Search for restaurants, pubs, cafes and more, or scan a QR code to connect directly
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-center">
            <p className="text-blue-700 text-sm">
              <strong>QR Code Access:</strong> You can scan QR codes or visit URLs like: 
              <br />
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                localhost:3000/qr/GB_F1_001
              </code>
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Search Venues</h2>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSearch} className="space-y-6">
                <div>
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-2">
                    Venue Name
                  </label>
                  <input
                    id="searchQuery"
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="Search for restaurants, pubs, cafes..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || searchQuery.length < 2}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Search Venues'}
                </motion.button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Search Results</h3>
                  <div className="space-y-3">
                    {searchResults.map((page) => (
                      <motion.button
                        key={page.pageId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePageSelect(page)}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          {page.logo && (
                            <img src={page.logo} alt={page.pageName} className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{page.pageName}</h4>
                            <p className="text-sm text-gray-600 capitalize">{page.pageType}</p>
                            {page.location && (
                              <p className="text-sm text-gray-500">{page.location}</p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'code' && pageData && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {pageData.page.name}
                    </h2>
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
                  <button
                    onClick={() => setStep('search')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Table Code Entry */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Enter Table Code</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Ask your server for the table code to join your table session
                  </p>
                  
                  <form onSubmit={handleJoinTable} className="space-y-4">
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
                      disabled={loading || !tableCode.trim()}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
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
                <div className="bg-gray-50 rounded-lg p-4 text-center mt-6">
                  <p className="text-gray-600 text-sm">
                    <strong>Need help?</strong> Ask your server for the table code or scan a table-specific QR code if available.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}