import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PostList from './PostList';
import { useAuth } from '../contexts/AuthContext';
import { createLoggingUtils } from '../utils/loggingUtils';
import { Principal } from '@dfinity/principal';
import { backend } from '../declarations/backend';

const logging = createLoggingUtils('Profile');

function Profile({ contentActor }) {
  const { userProfile, isLoggedIn, userPrincipal, socialGraphActor } = useAuth();
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [username, contentActor]);

  const checkFollowStatus = async () => {
    logging.logLifecycle('checkFollowStatus called', {
      socialGraphActor: !!socialGraphActor,
      userPrincipal,
      isOwnProfile,
      profileData: profileData?.name
    });

    if (!socialGraphActor || !userPrincipal || isOwnProfile) {
      logging.logWarning('checkFollowStatus early return', {
        noSocialGraphActor: !socialGraphActor,
        noUserPrincipal: !userPrincipal,
        isOwnProfile
      });
      return;
    }

    try {
      // Convert string principal to Principal object
      const currentUserPrincipal = Principal.fromText(userPrincipal);
      logging.logInfo('Current user principal created', { principal: currentUserPrincipal.toText() });
      
      // Get the principal for the target user
      logging.logInfo('Fetching principal for username', { username: profileData.name });
      const principalResult = await backend.getPrincipalByUsername(profileData.name);
      logging.logDebug('Principal result', { principalResult });
      
      if ('ok' in principalResult) {
        const targetPrincipal = principalResult.ok;
        logging.logDebug('Target principal details', {
          targetPrincipalType: typeof targetPrincipal,
          targetPrincipalValue: targetPrincipal,
          currentUserPrincipalType: typeof currentUserPrincipal,
          currentUserPrincipalValue: currentUserPrincipal.toText()
        });
        
        // Convert targetPrincipal to Principal object if it's a string
        let targetPrincipalObj = targetPrincipal;
        if (typeof targetPrincipal === 'string') {
          targetPrincipalObj = Principal.fromText(targetPrincipal);
          logging.logInfo('Converted target principal to Principal object', { principal: targetPrincipalObj.toText() });
        }
        
        logging.logInfo('Calling socialGraphActor.isFollowing', {
          currentUser: currentUserPrincipal.toText(),
          targetUser: targetPrincipalObj.toText()
        });
        const result = await socialGraphActor.isFollowing(currentUserPrincipal, targetPrincipalObj);
        logging.logInfo('isFollowing result', { result });
        setIsFollowing(result);
      } else {
        logging.logWarning('Could not find principal for user', { username: profileData.name });
        logging.logError('Principal result error', principalResult.err);
        setIsFollowing(false);
      }
    } catch (err) {
      logging.logError('Error checking follow status', err);
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    logging.logUserAction('handleFollow called', {
      socialGraphActor: !!socialGraphActor,
      userPrincipal,
      isOwnProfile,
      profileData: profileData?.name,
      isFollowing
    });

    if (!socialGraphActor || !userPrincipal || isOwnProfile) {
      logging.logWarning('handleFollow early return', {
        noSocialGraphActor: !socialGraphActor,
        noUserPrincipal: !userPrincipal,
        isOwnProfile
      });
      return;
    }

    setIsFollowLoading(true);
    try {
      // Convert string principal to Principal object
      const currentUserPrincipal = Principal.fromText(userPrincipal);
      logging.logInfo('Current user principal created', { principal: currentUserPrincipal.toText() });
      
      // Get the principal for the target user
      logging.logInfo('Fetching principal for username', { username: profileData.name });
      const principalResult = await backend.getPrincipalByUsername(profileData.name);
      logging.logDebug('Principal result', { principalResult });
      
      if ('ok' in principalResult) {
        const targetPrincipal = principalResult.ok;
        logging.logDebug('Target principal details', {
          targetPrincipalType: typeof targetPrincipal,
          targetPrincipalValue: targetPrincipal
        });
        
        // Convert targetPrincipal to Principal object if it's a string
        let targetPrincipalObj = targetPrincipal;
        if (typeof targetPrincipal === 'string') {
          targetPrincipalObj = Principal.fromText(targetPrincipal);
          logging.logInfo('Converted target principal to Principal object', { principal: targetPrincipalObj.toText() });
        }
        
        if (isFollowing) {
          logging.logFollowAction('unfollow', currentUserPrincipal, targetPrincipalObj);
          const result = await socialGraphActor.unfollowUser(targetPrincipalObj);
          logging.logInfo('Unfollow result', { result });
          
          if ('ok' in result) {
            logging.logFollowAction('unfollow', currentUserPrincipal, targetPrincipalObj, result);
            setIsFollowing(false);
            if (window.showToast) {
              window.showToast({
                message: `Unfollowed ${profileData.name}`,
                type: 'success',
                duration: 3000
              });
            }
          } else {
            logging.logFollowAction('unfollow', currentUserPrincipal, targetPrincipalObj, null, result.err);
            if (window.showToast) {
              window.showToast({
                message: `Failed to unfollow: ${result.err}`,
                type: 'error',
                duration: 5000
              });
            }
          }
        } else {
          logging.logFollowAction('follow', currentUserPrincipal, targetPrincipalObj);
          const result = await socialGraphActor.followUser(targetPrincipalObj);
          logging.logInfo('Follow result', { result });
          
          if ('ok' in result) {
            logging.logFollowAction('follow', currentUserPrincipal, targetPrincipalObj, result);
            setIsFollowing(true);
            if (window.showToast) {
              window.showToast({
                message: `Started following ${profileData.name}`,
                type: 'success',
                duration: 3000
              });
            }
          } else {
            logging.logFollowAction('follow', currentUserPrincipal, targetPrincipalObj, null, result.err);
            if (window.showToast) {
              window.showToast({
                message: `Failed to follow: ${result.err}`,
                type: 'error',
                duration: 5000
              });
            }
          }
        }
      } else {
        logging.logWarning('Could not find principal for user', { username: profileData.name });
        logging.logError('Principal result error', principalResult.err);
        if (window.showToast) {
          window.showToast({
            message: `Could not find user: ${profileData.name}`,
            type: 'error',
            duration: 5000
          });
        }
      }
    } catch (err) {
      logging.logError('Error following/unfollowing', err);
      if (window.showToast) {
        window.showToast({
          message: `Error: ${err.message}`,
          type: 'error',
          duration: 5000
        });
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  useEffect(() => {
    logging.debug('Profile useEffect triggered', {
      profileData: !!profileData,
      userPrincipal: !!userPrincipal,
      isOwnProfile,
      socialGraphActor: !!socialGraphActor
    });
    
    if (profileData && userPrincipal && !isOwnProfile && socialGraphActor) {
      logging.info('Calling checkFollowStatus');
      checkFollowStatus();
    } else {
      logging.debug('Not calling checkFollowStatus', {
        noProfileData: !profileData,
        noUserPrincipal: !userPrincipal,
        isOwnProfile,
        noSocialGraphActor: !socialGraphActor
      });
    }
  }, [profileData, userPrincipal, isOwnProfile, socialGraphActor]);

  const loadProfileData = async () => {
    logging.info('loadProfileData called', {
      contentActor: !!contentActor,
      username,
      userProfile: userProfile?.name
    });

    if (!contentActor) {
      logging.warn('loadProfileData early return: no contentActor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logging.debug('Current userProfile', { userProfile });
      logging.info('Looking for username', { username });
      
      // First, try to get the user's profile from the backend
      let foundProfile = null;
      try {
        console.log('🔍 Searching for profile in backend:', username);
        const profileResult = await backend.getUserProfileByUsername(username);
        console.log('📋 Backend profile result:', profileResult);
        if ('ok' in profileResult) {
          console.log('✅ Found profile in backend:', profileResult.ok);
          foundProfile = profileResult.ok;
        }
      } catch (backendErr) {
        console.error('❌ Error fetching profile from backend:', backendErr);
      }

      // If we found a profile, use it
      if (foundProfile) {
        setProfileData(foundProfile);
        setIsOwnProfile(userProfile && userProfile.name === username);
      } else {
        // Check if it's the current user's profile
        if (userProfile && userProfile.name === username) {
          console.log('✅ Found own profile:', userProfile);
          setProfileData(userProfile);
          setIsOwnProfile(true);
        } else {
          // User profile not found, check if they have posts
          const result = await contentActor.getPosts(50, 0);
          if ('ok' in result) {
            const userPosts = result.ok.filter(post => post.authorName === username);
            if (userPosts.length > 0) {
              // User exists but has no profile, create default profile
              setProfileData({
                name: username,
                bio: 'This user has not set a bio yet.',
                id: 'user-' + username
              });
            } else {
              // User doesn't exist
              setProfileData({
                name: username,
                bio: 'This user has not set a bio yet.',
                id: 'unknown-user'
              });
            }
          } else {
            setProfileData({
              name: username,
              bio: 'This user has not set a bio yet.',
              id: 'unknown-user'
            });
          }
          setIsOwnProfile(false);
        }
      }

      // Load user's posts
      const result = await contentActor.getPosts(20, 0);
      if ('ok' in result) {
        setUserPosts(result.ok.filter(post => post.authorName === username));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error loading profile: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-8">
              <p className="text-gray-600">🔄 Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-8">
              <p className="text-red-600">❌ {error}</p>
              <Link to="/" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to feed
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {profileData?.name?.slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profileData?.name || 'Unknown User'}</h1>
                <p className="text-gray-500">@{profileData?.name?.toLowerCase()}</p>
                <p className="text-sm text-gray-500 mt-1">Joined March 2025</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isOwnProfile ? (
                <Link 
                  to="/"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit Profile
                </Link>
              ) : isLoggedIn && userProfile ? (
                <button
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      : 'bg-blue-500 text-white border border-blue-500 hover:bg-blue-600'
                  } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isFollowing ? 'Unfollowing...' : 'Following...'}
                    </>
                  ) : (
                    <>
                      {isFollowing ? (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Following
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Follow
                        </>
                      )}
                    </>
                  )}
                </button>
              ) : null}
              <button className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-gray-900 mb-4">
            {profileData?.bio === 'This user has not set a bio yet.' ? 
              <span className="text-gray-500 italic">{profileData.bio}</span> : 
              profileData?.bio || 'No bio available'
            }
          </p>

          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="font-semibold text-gray-900">0</span>
              <span className="text-gray-500 ml-1">Following</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">0</span>
              <span className="text-gray-500 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">{userPosts.length}</span>
              <span className="text-gray-500 ml-1">Posts</span>
            </div>
          </div>
        </div>

        {/* Profile posts section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts</h2>
          
          {userPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {isOwnProfile ? "You haven't posted anything yet." : `${profileData?.name} hasn't posted anything yet.`}
              </p>
              {isOwnProfile && (
                <Link 
                  to="/"
                  className="mt-4 inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Your First Post
                </Link>
              )}
            </div>
          ) : (
            <PostList 
              contentActor={contentActor}
              userProfile={userProfile}
              posts={userPosts}
              showUserPostsOnly={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile; 