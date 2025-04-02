const API_URL = 'http://localhost:8000/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
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
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login/access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password,
      }),
    });
    return handleResponse(response);
  },

  // Posts
  getPosts: async () => {
    const response = await fetch(`${API_URL}/posts`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getPost: async (id) => {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createPost: async (data) => {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updatePost: async (id, data) => {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deletePost: async (id) => {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'DELETE',
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
}; 