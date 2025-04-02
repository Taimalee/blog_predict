import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import debounce from 'lodash/debounce';

const Editor = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Post');
  const [activeTab, setActiveTab] = useState('predictions');
  const [fontSize, setFontSize] = useState(16);
  const [textAlign, setTextAlign] = useState('left');
  const [fontFamily, setFontFamily] = useState('sans');
  const [suggestion, setSuggestion] = useState('');
  const [isAutoCompleteEnabled, setIsAutoCompleteEnabled] = useState(true);
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(true);
  const [isAdvancedModel, setIsAdvancedModel] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const suggestionRef = useRef(null);
  const profileMenuRef = useRef(null);
  const { id: postId } = useParams(); // Get post ID from URL if editing

  const fontFamilies = [
    { value: 'sans', label: 'Sans-serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' }
  ];

  const handleFormat = (command) => {
    document.execCommand(command, false, null);
  };

  // Clear initial content when component mounts
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.textContent = '';
    }
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

  // Fetch existing draft if editing
  useEffect(() => {
    const fetchDraft = async () => {
      if (postId) {
        try {
          const post = await api.getPost(postId);
          if (post) {
            setTitle(post.title || '');
            if (editorRef.current) {
              editorRef.current.textContent = post.content || '';
              // Trigger input event to initialize content state
              const event = new Event('input', { bubbles: true });
              editorRef.current.dispatchEvent(event);
            }
          }
        } catch (error) {
          console.error('Error fetching draft:', error);
          // Show error to user
          alert('Could not load the draft. Please try again.');
        }
      }
    };

    fetchDraft();
  }, [postId]);

  // Debounced prediction function
  const debouncedPredict = useCallback(
    debounce(async (text) => {
      if (!isAutoCompleteEnabled || !text.trim()) return;
      
      try {
        const modelType = isAdvancedModel ? 'advanced' : 'basic';
        const predictions = await api.predictWords(text, 5, modelType);
        console.log('Predictions:', predictions); // Debug log
        if (predictions && predictions.length > 0) {
          setSuggestion(predictions[0]);
        } else {
          setSuggestion('');
        }
      } catch (error) {
        console.error('Prediction error:', error);
        setSuggestion('');
      }
    }, 500),
    [isAutoCompleteEnabled, isAdvancedModel]
  );

  // Debounced spell check function
  const debouncedSpellCheck = useCallback(
    debounce(async (text) => {
      if (!isSpellCheckEnabled) return;
      
      try {
        const result = await api.spellCheck(text);
        console.log('Spell check result:', result); // Debug log
        if (result.corrected && result.corrected !== text) {
          setContent(result.corrected);
        }
      } catch (error) {
        console.error('Spell check error:', error);
      }
    }, 500),
    [isSpellCheckEnabled]
  );

  // Handle editor input
  const handleInput = (e) => {
    const newContent = e.currentTarget.textContent || '';
    setContent(newContent);
    
    // Only trigger predictions if there's actual content
    if (newContent.trim()) {
      debouncedPredict(newContent);
      if (isSpellCheckEnabled) {
        debouncedSpellCheck(newContent);
      }
    } else {
      setSuggestion('');
    }
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const text = editorRef.current.textContent;
      const cursorPos = range.startOffset;
      
      // Get the current word
      let startPos = cursorPos;
      while (startPos > 0 && text[startPos - 1] !== ' ' && text[startPos - 1] !== '\n') {
        startPos--;
      }
      const currentWord = text.slice(startPos, cursorPos);
      
      // Check if we're completing a partial word
      const isPartialWord = suggestion.toLowerCase().startsWith(currentWord.toLowerCase()) && currentWord.length < suggestion.length;
      
      if (isPartialWord) {
        // Replace the partial word with the full suggestion
        const newRange = document.createRange();
        newRange.setStart(range.startContainer, startPos);
        newRange.setEnd(range.startContainer, cursorPos);
        selection.removeAllRanges();
        selection.addRange(newRange);
        const textNode = document.createTextNode(suggestion + ' ');
        newRange.deleteContents();
        newRange.insertNode(textNode);
        
        // Move cursor after the inserted text
        const newPosition = document.createRange();
        newPosition.setStartAfter(textNode);
        newPosition.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(newPosition);
        
        // Force cursor position update
        updateCursorPosition();
      } else {
        // Handle complete word case (add suggestion after)
        const hasSpaceBefore = cursorPos > 0 && text[cursorPos - 1] === ' ';
        const textNode = document.createTextNode(
          (hasSpaceBefore ? '' : ' ') + suggestion + ' '
        );
        range.insertNode(textNode);
        
        // Move cursor after the inserted text
        const newPosition = document.createRange();
        newPosition.setStartAfter(textNode);
        newPosition.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(newPosition);
        
        // Force cursor position update
        updateCursorPosition();
      }
      
      // Update content state with new content
      if (editorRef.current) {
        const newContent = editorRef.current.textContent;
        setContent(newContent);
        // Trigger prediction for next word after a short delay
        setTimeout(() => {
          debouncedPredict(newContent);
          // Update cursor position again after prediction
          updateCursorPosition();
        }, 10);
      }
      
      setSuggestion('');
    }
  };

  // Update cursor position
  const updateCursorPosition = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      // Only show suggestion if cursor is inside the editor
      if (range.startContainer === editorRef.current || editorRef.current.contains(range.startContainer)) {
        setCursorPosition({
          x: rect.right - editorRect.left,
          y: rect.top - editorRect.top
        });
      } else {
        // Hide suggestion if cursor is outside editor
        setSuggestion('');
      }
    }
  };

  // Effect to update cursor position and handle focus
  useEffect(() => {
    document.addEventListener('selectionchange', updateCursorPosition);
    
    // Hide suggestion when editor loses focus
    const handleBlur = () => {
      setSuggestion('');
    };
    
    editorRef.current?.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('selectionchange', updateCursorPosition);
      editorRef.current?.removeEventListener('blur', handleBlur);
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

  const handleSaveDraft = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const content = editorRef.current.textContent;
      
      if (postId) {
        // Update existing draft
        await api.updatePost(postId, {
          title: title || "Untitled Post",
          content,
          status: 'draft'
        });
      } else {
        // Create new draft
        await api.saveDraft({
          userId,
          title: title || "Untitled Post",
          content
        });
      }

      setShowSaveNotification(true);
      setTimeout(() => {
        setShowSaveNotification(false);
      }, 2000);
      
      // Refresh drafts list in Dashboard
      if (window.refreshDrafts) {
        window.refreshDrafts();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">BlogPredict</h1>
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
            onClick={() => navigate('/dashboard')}
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

      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
          Saved Draft
        </div>
      )}

      {/* Main Content */}
      <div className="flex">
        {/* Editor Section */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 
              className="text-3xl font-bold outline-none"
              contentEditable={true}
              onBlur={(e) => setTitle(e.currentTarget.textContent || 'Untitled Post')}
              suppressContentEditableWarning={true}
            >
              {title}
            </h1>
            <div className="flex gap-3">
              <button 
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Draft
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </button>
            </div>
          </div>
          <div className="relative">
            <div 
              ref={editorRef}
              className="w-full h-[calc(100vh-200px)] p-4 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 relative"
              style={{ 
                fontSize: `${fontSize}px`,
                fontFamily: `${fontFamily === 'sans' ? 'ui-sans-serif' : fontFamily === 'serif' ? 'ui-serif' : 'ui-monospace'}`,
                textAlign: textAlign
              }}
              contentEditable={true}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
            />
            {suggestion && (
              <span
                ref={suggestionRef}
                className="absolute text-gray-400 pointer-events-none whitespace-pre"
                style={{
                  left: `${cursorPosition.x}px`,
                  top: `${cursorPosition.y}px`,
                  fontSize: `${fontSize}px`,
                  fontFamily: `${fontFamily === 'sans' ? 'ui-sans-serif' : fontFamily === 'serif' ? 'ui-serif' : 'ui-monospace'}`,
                  lineHeight: 'inherit'
                }}
              >
                {` ${suggestion}`}
              </span>
            )}
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="w-80 border-l border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Settings</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Toggle Buttons */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button 
                onClick={() => setActiveTab('predictions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  activeTab === 'predictions' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Predictions</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  activeTab === 'settings' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>

            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Font Size Control */}
                <div>
                  <h3 className="text-base font-medium mb-4">Font Size</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      -
                    </button>
                    <div className="flex-1 px-4 py-2 text-center rounded-lg border border-gray-200">
                      {fontSize}px
                    </div>
                    <button 
                      onClick={() => setFontSize(prev => Math.min(24, prev + 2))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Text Formatting */}
                <div>
                  <h3 className="text-base font-medium mb-4">Text Formatting</h3>
                  <div className="space-y-4">
                    {/* Basic Formatting */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFormat('bold')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 font-bold"
                      >
                        B
                      </button>
                      <button
                        onClick={() => handleFormat('italic')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 italic"
                      >
                        I
                      </button>
                      <button
                        onClick={() => handleFormat('underline')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 underline"
                      >
                        U
                      </button>
                    </div>

                    {/* Font Family */}
                    <div>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-200"
                      >
                        {fontFamilies.map(font => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Text Alignment */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTextAlign('left')}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 ${textAlign === 'left' ? 'bg-gray-100' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h12" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setTextAlign('center')}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 ${textAlign === 'center' ? 'bg-gray-100' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M6 12h12M5 18h14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setTextAlign('right')}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 ${textAlign === 'right' ? 'bg-gray-100' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h12M6 18h14" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setTextAlign('justify')}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 ${textAlign === 'justify' ? 'bg-gray-100' : ''}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFormat('insertUnorderedList')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M8 6v.01M8 12v.01M8 18v.01" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleFormat('insertOrderedList')}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h16M7 12h16M7 18h16M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spell Check */}
                <div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-medium">Spell Check</h3>
                      <p className="text-sm text-gray-500">Check spelling as you type</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isSpellCheckEnabled}
                        onChange={(e) => setIsSpellCheckEnabled(e.target.checked)}
                      />
                      <div className="w-[52px] h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'predictions' && (
              <>
                {/* Predictions Content */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-medium">Advanced GPT Model</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isAdvancedModel}
                        onChange={(e) => setIsAdvancedModel(e.target.checked)}
                      />
                      <div className="w-[52px] h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">Use our advanced model for better predictions</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-medium">Auto-Complete</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isAutoCompleteEnabled}
                        onChange={(e) => setIsAutoCompleteEnabled(e.target.checked)}
                      />
                      <div className="w-[52px] h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">Automatically complete sentences</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor; 