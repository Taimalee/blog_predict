import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="max-w-4xl w-full px-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
         W-Rite Expedite
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Our AI-powered tool helps you write engaging<br />
          posts with smart predictions.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-white text-black border-2 border-black rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 