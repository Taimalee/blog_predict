const API_URL = 'http://localhost:8000/api/v1';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'An error occurred');
  }
  return response.json();
};

export const api = {
  // Auth
  signup: async ({ email, password }) => {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    console.log('Signup response:', data);
    return data;
  },

  login: async ({ email, password }) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    console.log('Login response:', data);
    return data;
  },

  logout: async () => {
    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Posts
  getPosts: async (userId) => {
    const response = await fetch(`${API_URL}/posts?user_id=${userId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getPost: async (postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  saveDraft: async (data) => {
    const response = await fetch(`${API_URL}/posts/draft`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        user_id: data.userId,
        title: data.title || "Untitled Post",
        content: data.content,
        status: data.status || 'draft'
      }),
    });
    return handleResponse(response);
  },

  updatePost: async (postId, data) => {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        status: data.status
      }),
    });
    return handleResponse(response);
  },

  getDrafts: async () => {
    const userId = localStorage.getItem('userId');
    const response = await fetch(`${API_URL}/posts/drafts/${userId}`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
  },

  deletePost: async (postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Predictions
  predictBasic: async (text, numWords = 5) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }
    const response = await fetch(`${API_URL}/predict/basic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, num_words: numWords, user_id: userId }),
    });
    return handleResponse(response);
  },

  predictAdvanced: async (text, numWords = 5) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }
    const response = await fetch(`${API_URL}/predict/advanced`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, num_words: numWords, user_id: userId }),
    });
    return handleResponse(response);
  },

  spellCheck: async (text) => {
    const response = await fetch(`${API_URL}/predict/spellcheck`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },

  trackSuggestion: async (data) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }
    const response = await fetch(`${API_URL}/predict/track`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...data, user_id: userId }),
    });
    return handleResponse(response);
  },

  getSuggestionStats: async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }
    const response = await fetch(`${API_URL}/predict/stats/${userId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getWritingStats: async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not logged in');
    }
    const response = await fetch(`${API_URL}/posts/stats/${userId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
}; 