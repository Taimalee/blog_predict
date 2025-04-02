import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import debounce from 'lodash/debounce';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [modelType, setModelType] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const post = await api.getPost(id);
      setContent(post.content);
    } catch (error) {
      console.error('Failed to fetch post:', error);
    }
  };

  const debouncedPredict = useCallback(
    debounce(async (text) => {
      if (!text.trim()) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      try {
        const words = text.split(' ').slice(-3).join(' ');
        const response = await (modelType === 'basic'
          ? api.predictBasic(words)
          : api.predictAdvanced(words));
        setPredictions(response);
      } catch (error) {
        console.error('Failed to get predictions:', error);
      } finally {
        setLoading(false);
      }
    }, 500),
    [modelType]
  );

  useEffect(() => {
    debouncedPredict(content);
    return () => debouncedPredict.cancel();
  }, [content, debouncedPredict]);

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    try {
      if (id) {
        await api.updatePost(id, { content, status });
      } else {
        await api.createPost({ content, status });
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePredictionClick = (prediction) => {
    setContent((prev) => prev + ' ' + prediction);
    setPredictions([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-2xl font-bold">
                    {id ? 'Edit Post' : 'New Post'}
                  </h1>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleSave('draft')}
                      disabled={saving}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => handleSave('published')}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Prediction Model
                  </label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="basic">Basic (Trigram)</option>
                    <option value="advanced">Advanced (GPT-3.5)</option>
                  </select>
                </div>

                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-64 p-4 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Start writing your post..."
                  />
                </div>

                {loading && (
                  <div className="text-sm text-gray-500">Getting predictions...</div>
                )}

                {predictions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Suggested words:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {predictions.map((prediction, index) => (
                        <button
                          key={index}
                          onClick={() => handlePredictionClick(prediction)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                        >
                          {prediction}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor; 