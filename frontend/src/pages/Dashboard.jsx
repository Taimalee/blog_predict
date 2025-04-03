import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [suggestionStats, setSuggestionStats] = useState(null);
  const [writingStats, setWritingStats] = useState({ drafts: 0, published: 0, words: 0 });
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  const fetchDrafts = async () => {
    try {
      const drafts = await api.getDrafts();
      // Sort drafts by creation date in descending order (newest first)
      const sortedDrafts = drafts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPosts(sortedDrafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    }
  };

  const fetchSuggestionStats = async () => {
    try {
      const stats = await api.getSuggestionStats();
      setSuggestionStats(stats);
    } catch (error) {
      console.error('Error fetching suggestion stats:', error);
    }
  };

  const fetchWritingStats = async () => {
    try {
      const stats = await api.getWritingStats();
      setWritingStats(stats);
    } catch (error) {
      console.error('Error fetching writing stats:', error);
    }
  };

  useEffect(() => {
    fetchDrafts();
    fetchSuggestionStats();
    fetchWritingStats();
    window.refreshDrafts = fetchDrafts;
    return () => {
      delete window.refreshDrafts;
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      // Clear user data from localStorage
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      // Redirect to welcome page
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset hours to start of day for both dates
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const postDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Get time difference in milliseconds
    const diffTime = today.getTime() - postDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // For posts created today, show relative time
      const hours = Math.floor((now - date) / (1000 * 60 * 60));
      if (hours < 1) {
        const minutes = Math.floor((now - date) / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const calculateWordCount = (content) => {
    return content.trim().split(/\s+/).length;
  };

  const stats = {
    drafts: posts.length,
    published: 0, // We'll keep this hardcoded for now as requested
    words: posts.reduce((total, post) => total + calculateWordCount(post.content), 0)
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">W-Rite Expedite</h1>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-gray-700 hover:text-black"
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/editor')}
            className="text-gray-700 hover:text-black"
          >
            New Post
          </button>
          <button 
            onClick={() => navigate('/posts')}
            className="text-gray-700 hover:text-black"
          >
            My Posts
          </button>
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="ml-4 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm text-gray-600 truncate">
                    {localStorage.getItem('userEmail') || 'user@example.com'}
                  </p>
                </div>
                <div className="py-1">
                  <button onClick={() => navigate('/profile')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>
                  <button onClick={() => navigate('/posts')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-.586-1.414l-4.5-4.5A2 2 0 0015.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z" />
                    </svg>
                    My Posts
                  </button>
                  <button onClick={() => navigate('/settings')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    Settings
                  </button>
                </div>
                <div className="border-t border-gray-200 pt-1">
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Start writing or continue with your drafts.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white rounded-lg p-7 mb-4 border border-gray-200">
              <h2 className="text-lg font-semibold mb-1">Start Writing</h2>
              <p className="text-gray-600 mb-3">Create a new blog post</p>
              <div className="border-2 border-dashed border-gray-200 rounded-lg h-[80px] mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <button 
                onClick={() => navigate('/editor')}
                className="w-full bg-black text-white py-2 rounded-md flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Post
              </button>
            </div>

            <div className="bg-white rounded-lg p-7 border border-gray-200">
              <h2 className="text-lg font-semibold mb-1">Recent Drafts</h2>
              <p className="text-gray-600 mb-3">Continue where you left off</p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {posts.map(post => (
                  <div key={post.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <h3 className="font-medium">{post.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatDate(post.created_at)}</span>
                        <span>•</span>
                        <span>{calculateWordCount(post.content)} words</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/editor/${post.id}`)}
                      className="text-black hover:underline"
                    >
                      Continue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="bg-white rounded-lg p-7 border border-gray-200">
              <h2 className="text-lg font-semibold mb-1">Recent Activity</h2>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Your writing stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-3xl font-bold">{writingStats.drafts}</div>
                    <div className="text-sm text-gray-500">Drafts</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{writingStats.published}</div>
                    <div className="text-sm text-gray-500">Published</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{writingStats.words}</div>
                    <div className="text-sm text-gray-500">Words</div>
                  </div>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Suggestion Stats</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold">{suggestionStats?.shownCount || 0}</p>
                  <p className="text-gray-600">Shown</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">{suggestionStats?.acceptedCount || 0}</p>
                  <p className="text-gray-600">Accepted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">
                    {suggestionStats ? Math.round(suggestionStats.acceptanceRate * 100) : 0}%
                  </p>
                  <p className="text-gray-600">Rate</p>
                </div>
              </div>
              
              <button 
                onClick={() => navigate('/posts')}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm border rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View All Posts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 