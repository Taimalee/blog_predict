import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    console.log('handleSubmit called', { isLogin, email });
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        // Login flow
        const response = await api.login({ email, password });
        console.log('Login response:', response);
        if (response && response.id) {
          localStorage.setItem('userId', response.id);
          localStorage.setItem('userEmail', email);
          console.log('Navigating to dashboard...');
          navigate('/dashboard');
        } else {
          throw new Error('Invalid login response');
        }
      } else {
        // Signup flow
        const response = await api.signup({ email, password });
        console.log('Signup response:', response);
        if (response && response.id) {
          localStorage.setItem('userId', response.id);
          localStorage.setItem('userEmail', email);
          console.log('Navigating to dashboard...');
          navigate('/dashboard');
        } else {
          throw new Error('Invalid signup response');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.detail || 'An error occurred during authentication');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Enter your credentials to access your account'
              : 'Sign up to start writing better blogs'}
          </p>
        </div>

        <div className="mt-4 bg-gray-100 rounded-lg p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className={`py-2 text-sm font-medium rounded-md transition-colors ${
                isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              type="button"
              className={`py-2 text-sm font-medium rounded-md transition-colors ${
                !isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>

            <p className="text-xs text-center text-gray-600">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 