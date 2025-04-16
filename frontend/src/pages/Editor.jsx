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
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAutoCompleteEnabled, setIsAutoCompleteEnabled] = useState(true);
  const [isSpellCheckEnabled, setIsSpellCheckEnabled] = useState(true);
  const [isAdvancedModel, setIsAdvancedModel] = useState(true);
  const [isVoiceInputEnabled, setIsVoiceInputEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const suggestionsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const recognitionRef = useRef(null);
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
            setContent(post.content || '');
            if (editorRef.current) {
              editorRef.current.value = post.content || '';
            }
          }
        } catch (error) {
          console.error('Error fetching draft:', error);
          alert('Could not load the draft. Please try again.');
        }
      }
    };

    fetchDraft();
  }, [postId]);

  // Debounced prediction function
  const debouncedPredict = useCallback(
    debounce(async (text) => {
      if (!isAutoCompleteEnabled) return;
      
      try {
        const textarea = editorRef.current;
        if (!textarea) return;
        
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = text.slice(0, cursorPos);
        
        // Get the current word being typed
        let startPos = cursorPos;
        while (startPos > 0 && text[startPos - 1] !== ' ' && text[startPos - 1] !== '\n') {
          startPos--;
        }
        const currentWord = text.slice(startPos, cursorPos);
        
        // Count words before cursor
        const wordsBeforeCursor = textBeforeCursor.trim().split(/\s+/).filter(word => word.length > 0);
        
        console.log('Prediction debug:', {
          currentWord,
          textBeforeCursor,
          cursorPos,
          startPos,
          wordCount: wordsBeforeCursor.length
        });
        
        // Only predict if we have at least two words and are typing a new word
        if (wordsBeforeCursor.length >= 2 && currentWord.length > 0) {
          // Choose the prediction function based on the toggle state
          const predictionFunction = isAdvancedModel ? api.predictAdvanced : api.predictBasic;
          const predictions = await predictionFunction(textBeforeCursor);
          console.log('API predictions:', predictions);
          
          if (predictions && predictions.length > 0) {
            // For single-word predictions, just use them directly
            const suggestions = predictions.map(pred => pred);
            console.log('Final suggestions:', suggestions);
            setSuggestions(suggestions);
            setSelectedIndex(0);
          } else {
            setSuggestions([]);
          }
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Prediction error:', error);
        setSuggestions([]);
      }
    }, 150),
    [isAutoCompleteEnabled, isAdvancedModel]
  );

  // Debounced spell check function
  const debouncedSpellCheck = useCallback(
    debounce(async (text) => {
      if (!isSpellCheckEnabled) return;
      
      try {
        const textarea = editorRef.current;
        if (!textarea) return;
        
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = text.slice(0, cursorPos);
        
        // Split text into words and get the word before the current one
        const words = textBeforeCursor.split(/\s+/);
        const currentWordIndex = words.length - 1;
        const lastWord = currentWordIndex > 0 ? words[currentWordIndex - 1] : '';
        
        // Skip if the last word is empty or contains special characters
        if (!lastWord || !/^[a-zA-Z]+$/.test(lastWord) || 
            lastWord.toLowerCase().includes('fix') || 
            lastWord.toLowerCase().includes('spell') || 
            lastWord.toLowerCase().includes('grammar') ||
            lastWord.toLowerCase().includes('error') ||
            lastWord.toLowerCase().includes('corrected')) {
          return;
        }
        
        const result = await api.spellCheck(lastWord);
        
        if (result.corrected && 
            result.corrected !== lastWord && 
            result.corrected.toLowerCase() !== lastWord.toLowerCase() &&
            /^[a-zA-Z]+$/.test(result.corrected)) {
          
          // Find the position of the last word
          const lastWordStartPos = textBeforeCursor.lastIndexOf(lastWord);
          if (lastWordStartPos === -1) return;
          
          // Replace the word while preserving cursor position
          const beforeLastWord = text.slice(0, lastWordStartPos);
          const afterLastWord = text.slice(lastWordStartPos + lastWord.length);
          const newContent = beforeLastWord + result.corrected + afterLastWord;
          
          // Calculate new cursor position
          const cursorOffset = cursorPos - (lastWordStartPos + lastWord.length);
          const newCursorPos = lastWordStartPos + result.corrected.length + cursorOffset;
          
          // Update content and maintain cursor position
          setContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
          }, 0);
        }
      } catch (error) {
        console.error('Spell check error:', error);
      }
    }, 500), // Reduced debounce time for more responsive spell checking
    [isSpellCheckEnabled]
  );

  // Handle key events
  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Tab':
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setSuggestions([]);
          break;
        default:
          break;
      }
    }
  };

  // Function to insert a suggestion
  const insertSuggestion = async (suggestion) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const beforeText = content.slice(0, cursorPos);
    
    // Find the start of the last word
    let startPos = cursorPos;
    while (startPos > 0 && beforeText[startPos - 1] !== ' ' && beforeText[startPos - 1] !== '\n') {
        startPos--;
    }
    
    // Get the last word being typed
    const lastWord = content.slice(startPos, cursorPos);
    
    // Determine the case
    let newContent;
    
    // Check if the suggestion is a completion of the current word
    // For example: "witho" + "ut" = "without"
    if (suggestion.length <= lastWord.length) {
        // If suggestion is shorter than the current word, it's likely a completion
        // Check if the suggestion is a substring of the current word
        if (lastWord.includes(suggestion)) {
            // Case A: Completion
            newContent = content.slice(0, startPos) + suggestion + content.slice(cursorPos);
        } else {
            // Case B: Replacement
            newContent = content.slice(0, startPos) + suggestion + content.slice(cursorPos);
        }
    } else if (suggestion.startsWith(lastWord)) {
        // Case C: Suggestion starts with the current word
        newContent = content.slice(0, startPos) + suggestion + content.slice(cursorPos);
    } else {
        // Case D: New Word
        newContent = content.slice(0, cursorPos) + ' ' + suggestion + content.slice(cursorPos);
    }
    
    setContent(newContent);
    setSuggestions([]);
    
    // Move cursor after the inserted suggestion
    const newCursorPos = startPos + suggestion.length + (suggestion.startsWith(lastWord) ? 0 : 1);
    setTimeout(() => {
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (index) => {
    insertSuggestion(suggestions[index]);
  };

  // Handle suggestion hover
  const handleSuggestionHover = (index) => {
    setSelectedIndex(index);
  };

  // Handle editor input
  const handleInput = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Update cursor position
    const textarea = editorRef.current;
    if (textarea) {
      const rect = textarea.getBoundingClientRect();
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = newContent.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const currentLineText = lines[currentLine];
      
      // Find the start of the current word
      let startPos = cursorPos;
      while (startPos > 0 && newContent[startPos - 1] !== ' ' && newContent[startPos - 1] !== '\n') {
        startPos--;
      }
      
      // Calculate position based on the current word position
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      
      // Create a temporary span to measure text width accurately
      const span = document.createElement('span');
      span.style.font = window.getComputedStyle(textarea).font;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      
      // Get the text up to the start of the current word
      const textToCurrentWord = currentLineText.slice(0, startPos - (cursorPos - currentLineText.length));
      span.textContent = textToCurrentWord;
      document.body.appendChild(span);
      
      // Calculate the x position based on the width of text before the current word
      const x = rect.left + span.offsetWidth - scrollLeft;
      const y = rect.top + (currentLine * lineHeight) - scrollTop;
      
      document.body.removeChild(span);
      setCursorPosition({ x, y });
      
      console.log('Cursor position:', { x, y });
      console.log('Suggestions state:', suggestions);
    }
    
    // Handle predictions if content exists and auto-complete is enabled
    if (newContent.trim() && isAutoCompleteEnabled) {
      debouncedPredict(newContent);
    } else {
      setSuggestions([]);
    }

    // Handle spell check independently if content exists and spell check is enabled
    if (newContent.trim() && isSpellCheckEnabled) {
      debouncedSpellCheck(newContent);
    }
  };

  // Add cursor position update on selection change
  useEffect(() => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const handleSelectionChange = () => {
      const rect = textarea.getBoundingClientRect();
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const currentLineText = lines[currentLine];
      
      // Find the start of the current word
      let startPos = cursorPos;
      while (startPos > 0 && content[startPos - 1] !== ' ' && content[startPos - 1] !== '\n') {
        startPos--;
      }
      
      // Calculate position based on the current word position
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      
      // Create a temporary span to measure text width accurately
      const span = document.createElement('span');
      span.style.font = window.getComputedStyle(textarea).font;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      
      // Get the text up to the start of the current word
      const textToCurrentWord = currentLineText.slice(0, startPos - (cursorPos - currentLineText.length));
      span.textContent = textToCurrentWord;
      document.body.appendChild(span);
      
      // Calculate the x position based on the width of text before the current word
      const x = rect.left + span.offsetWidth - scrollLeft;
      const y = rect.top + (currentLine * lineHeight) - scrollTop;
      
      document.body.removeChild(span);
      setCursorPosition({ x, y });
    };

    textarea.addEventListener('select', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('select', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, [content]);

  // Setup speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          if (suggestions.includes(transcript)) {
            insertSuggestion(transcript);
          } else {
            setContent((prevContent) => prevContent + ' ' + transcript);
            debouncedPredict(content + ' ' + transcript);
          }
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognitionRef.current = recognition;
  }, [debouncedPredict, suggestions]);

  const handleVoiceInputToggle = () => {
    setIsVoiceInputEnabled(!isVoiceInputEnabled);
  };

  const handleMicToggle = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

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

      setNotificationMessage('Saved Draft');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
      
      // Refresh drafts list in Dashboard
      if (window.refreshDrafts) {
        window.refreshDrafts();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handlePublish = async () => {
    try {
      if (postId) {
        // Update existing post to published
        await api.updatePost(postId, {
          title: title || "Untitled Post",
          content,
          status: 'published'
        });
      } else {
        // Create new published post
        const userId = localStorage.getItem('userId');
        await api.saveDraft({
          userId,
          title: title || "Untitled Post",
          content,
          status: 'published'
        });
      }

      setNotificationMessage('Blog Published');
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
        navigate('/posts'); // Navigate to posts page after publishing
      }, 2000);
      
    } catch (error) {
      console.error('Error publishing post:', error);
    }
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

      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
          {notificationMessage}
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
              <button 
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              className="w-full h-[calc(100vh-200px)] p-4 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 resize-none"
              style={{ 
                fontSize: `${fontSize}px`,
                fontFamily: `${fontFamily === 'sans' ? 'ui-sans-serif' : fontFamily === 'serif' ? 'ui-serif' : 'ui-monospace'}`,
                textAlign: textAlign
              }}
            />
            
            {/* Suggestions Popup */}
            {suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[1000]"
                style={{
                  left: `${cursorPosition.x}px`,
                  top: `${cursorPosition.y + 25}px`,
                  minWidth: '200px',
                  maxWidth: '300px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transform: 'translateY(0)',
                  opacity: 1,
                  transition: 'opacity 0.2s ease-in-out'
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                      index === selectedIndex ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleSuggestionClick(index)}
                    onMouseEnter={() => handleSuggestionHover(index)}
                  >
                    <span className="text-gray-800">{suggestion}</span>
                  </div>
                ))}
              </div>
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

            {activeTab === 'predictions' && (
              <div className="space-y-4">
                {/* Advanced GPT Model Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Advanced GPT Model</h3>
                    <p className="text-sm text-gray-500">Use our advanced model</p>
                  </div>
                  <button
                    onClick={() => setIsAdvancedModel(!isAdvancedModel)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      isAdvancedModel ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isAdvancedModel ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Predictions Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Predictions</h3>
                    <p className="text-sm text-gray-500">Automatically predict words</p>
                  </div>
                  <button
                    onClick={() => setIsAutoCompleteEnabled(!isAutoCompleteEnabled)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      isAutoCompleteEnabled ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isAutoCompleteEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Voice Input Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Voice Input</h3>
                    <p className="text-sm text-gray-500">Enable voice-to-text</p>
                  </div>
                  <button
                    onClick={handleVoiceInputToggle}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      isVoiceInputEnabled ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isVoiceInputEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Microphone Button (only shown when voice input is enabled) */}
                {isVoiceInputEnabled && (
                  <button
                    onClick={handleMicToggle}
                    className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md ${
                      isListening
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {isListening ? 'Stop Recording' : 'Start Recording'}
                  </button>
                )}
              </div>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor; 