import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import '../index.css';

import PostForm from './components/PostForm';
import PostList from './components/PostList';
import Header from './components/Header';
import Toast from './components/Toast';
import Profile from './components/Profile';
import HeroSection from './components/HeroSection';
import AuthUI from './components/AuthUI';
import PostingInterface from './components/PostingInterface';
import { AuthProvider } from './contexts/AuthContext';
import { content, createActor } from './declarations/content';

function App() {
  const [error, setError] = useState(null);
  const [contentActor, setContentActor] = useState(null);
  const [toast, setToast] = useState(null);

  // Expose toast function globally for components to use
  useEffect(() => {
    window.showToast = (toastConfig) => {
      setToast(toastConfig);
    };

    return () => {
      delete window.showToast;
    };
  }, []);




  // Initialize content actor for everyone (not just logged in users)
  useEffect(() => {
    const initContentActor = async () => {
      try {
        console.log('🔄 Initializing content actor...');

        let contentActorInstance = content;

        // If content is undefined, try to create it manually
        if (!contentActorInstance) {
          console.log('⚠️ Content actor is undefined, trying to create manually...');
          const canisterId = "u6s2n-gx777-77774-qaaba-cai";
          contentActorInstance = createActor(canisterId);
          console.log('🔧 Created content actor manually with canister ID:', canisterId);
        }

        if (!contentActorInstance) {
          console.error('❌ Failed to create content actor');
          return;
        }

        setContentActor(contentActorInstance);

        // Test the connection
        try {
          const testResult = await contentActorInstance.getPosts(1, 0);
          console.log('✅ Content actor initialized successfully:', testResult);
        } catch (testErr) {
          console.error('⚠️ Content actor connection test failed:', testErr);
          console.error('This might be due to:');
          console.error('1. DFX not running');
          console.error('2. Canister not deployed');
          console.error('3. Network connectivity issues');
        }
      } catch (err) {
        console.error('❌ Failed to initialize content actor:', err);
        console.error('Error details:', err.message);
      }
    };
    initContentActor();
  }, []);







  const handlePostCreated = async (newPost) => {
    console.log('✅ Post created successfully:', newPost);
    setToast({
      message: 'Post created successfully!',
      type: 'success',
      duration: 3000
    });
    // The PostList component will handle refreshing itself
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />

          <Routes>
            <Route path="/profile/:username" element={
              <Profile
                contentActor={contentActor}
              />
            } />
            <Route path="/" element={
              <div className="w-full max-w-4xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  {/* Landing Page Hero Section - Only show when not logged in */}
                  <HeroSection />

                  {/* Authentication UI */}
                  <AuthUI />

                  {/* Debug Info for Codespaces */}
                  {window.location.hostname.includes('github.dev') && (
                    <div className="mb-6 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                      <h3 className="text-yellow-800 font-medium mb-2">🔧 Codespaces Debug Info</h3>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <p>• Content Actor: {contentActor ? '✅ Loaded' : '❌ Not loaded'}</p>
                        <p>• Environment: Codespaces (Anonymous Identity)</p>
                      </div>
                    </div>
                  )}

                  {/* Posting Interface */}
                  <PostingInterface contentActor={contentActor} onPostCreated={handlePostCreated} />

                  {/* Posts Display - Now visible to everyone */}
                  {contentActor && (
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">📰 Recent Posts</h2>
                      <PostList
                        contentActor={contentActor}
                        onPostCreated={handlePostCreated}
                      />
                    </div>
                  )}

                  <p className="text-center text-gray-600 mt-6">
                    A social network hosted onchain on ICP.
                  </p>

                  {error && <p className="mt-4 text-center text-red-500">Error: {error}</p>}
                </div>
              </div>
            } />
          </Routes>

          {/* Toast Notification */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
