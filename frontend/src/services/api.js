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
    return handleResponse(response);
  },

  login: async ({ email, password }) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
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
        status: 'draft'
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

  // Predictions
  predictBasic: async (text, numWords = 5) => {
    const response = await fetch(`${API_URL}/predict/basic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, num_words: numWords }),
    });
    return handleResponse(response);
  },

  predictAdvanced: async (text, numWords = 5) => {
    const response = await fetch(`${API_URL}/predict/advanced`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, num_words: numWords }),
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
}; 