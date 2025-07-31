import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLogin } from '../hooks/useLogin';
import { createLogger } from '../utils/logger';
import { canisterId as socialGraphCanisterId, createActor as createSocialGraphActor } from '../declarations/socialgraph';

const logger = createLogger('AuthContext');

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [backendActor, setBackendActor] = useState(null);
  const [userPrincipal, setUserPrincipal] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [socialGraphActor, setSocialGraphActor] = useState(null);
  const [profileForm, setProfileForm] = useState({ username: '', bio: '' });
  const [usernameAvailability, setUsernameAvailability] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSettingProfile, setIsSettingProfile] = useState(false);

  const handleBackendActorSet = async (actor, principal, agent) => {
    logger.info('Setting backend actor', { principal });
    setBackendActor(actor);
    setUserPrincipal(principal);
    setIsLoggedIn(true);

    // Create socialGraphActor with the same identity
    try {
      logger.info('Creating socialGraphActor with user identity');
      const socialGraphActor = createSocialGraphActor(socialGraphCanisterId, { agent });
      setSocialGraphActor(socialGraphActor);
      logger.info('SocialGraphActor created with user identity');
    } catch (socialGraphError) {
      logger.error('Failed to create socialGraphActor', { error: socialGraphError.message });
    }

    // Try to load existing user profile
    try {
      logger.info('Loading existing user profile');
      const profileResult = await actor.getCurrentUserProfile();
      logger.debug('Profile result', { profileResult });
      
      if ('ok' in profileResult) {
        logger.info('Found existing profile', {
          profile: profileResult.ok,
          profileIdType: typeof profileResult.ok.id,
          profileIdValue: profileResult.ok.id
        });
        setUserProfile(profileResult.ok);
        logger.info('User profile set in context');
        window.showToast?.({
          message: `Welcome back, ${profileResult.ok.name}!`,
          type: 'success',
          duration: 4000
        });
      } else {
        logger.info('No existing profile found, user needs to set up profile');
        logger.error('Profile error', { error: profileResult.err });
        window.showToast?.({
          message: `Logged in successfully!\nPrincipal: ${principal}\nPlease set up your profile.`,
          type: 'success',
          duration: 4000
        });
      }
    } catch (profileError) {
      logger.info('Error loading profile (user may not have one yet)', { error: profileError.message });
      window.showToast?.({
        message: `Logged in successfully!\nPrincipal: ${principal}\nPlease set up your profile.`,
        type: 'success',
        duration: 4000
      });
    }
  };

  const handleLogout = () => {
    // Clear all user state
    setBackendActor(null);
    setUserPrincipal(null);
    setIsLoggedIn(false);
    setUserProfile(null);
    setProfileForm({ username: '', bio: '' });
    setUsernameAvailability(null);

    // Clear localStorage session key for fresh identity on next login
    localStorage.removeItem('chainedsocial_session_key');

    // Show logout message
    window.showToast?.({
      message: 'Logged out successfully!',
      type: 'success',
      duration: 3000
    });
  };

  // Use shared login hook
  const { handleLogin, isLoggingIn, loginError, setLoginError } = useLogin(handleBackendActorSet);

  // Show login errors as toasts
  useEffect(() => {
    if (loginError) {
      window.showToast?.({
        message: loginError,
        type: 'error',
        duration: 5000
      });
      setLoginError(null); // Clear the error after showing toast
    }
  }, [loginError, setLoginError]);

  // Check username availability with debouncing
  const checkUsernameAvailability = async (username) => {
    if (!backendActor || !username.trim()) {
      setUsernameAvailability(null);
      return;
    }

    // Don't check if it's the current user's username
    if (userProfile && userProfile.name === username) {
      setUsernameAvailability('current');
      return;
    }

    setIsCheckingUsername(true);
    try {
      const result = await backendActor.isUsernameAvailable(username);
      setUsernameAvailability(result);
    } catch (error) {
      console.error('Error checking username availability:', error);
      setUsernameAvailability(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSetProfile = async (e) => {
    e.preventDefault();
    if (!backendActor || !profileForm.username.trim()) return;

    setIsSettingProfile(true);
    try {
      console.log("🔄 Setting profile with:", { username: profileForm.username, bio: profileForm.bio });
      const result = await backendActor.setUserProfile(profileForm.username, profileForm.bio);
      console.log("✅ Profile set result:", result);
      if ('ok' in result) {
        console.log("✅ Profile set result:", result.ok);
        console.log("🔍 Set Profile ID type:", typeof result.ok.id);
        console.log("🔍 Set Profile ID value:", result.ok.id);
        setUserProfile(result.ok);
        setProfileForm({ username: '', bio: '' });
        window.showToast?.({
          message: 'Profile saved successfully!',
          type: 'success',
          duration: 3000
        });
      } else {
        window.showToast?.({
          message: `❌ Failed to save profile: ${result.err}`,
          type: 'error',
          duration: 5000
        });
      }
    } catch (error) {
      console.error("❌ Error setting profile:", error);
      window.showToast?.({
        message: `❌ Error setting profile: ${error.message}`,
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsSettingProfile(false);
    }
  };

  const value = {
    // State
    backendActor,
    socialGraphActor,
    isLoggedIn,
    userPrincipal,
    userProfile,
    profileForm,
    setProfileForm,
    usernameAvailability,
    isCheckingUsername,
    isSettingProfile,
    isLoggingIn,
    loginError,
    
    // Functions
    handleLogin,
    handleLogout,
    checkUsernameAvailability,
    handleSetProfile,
    setLoginError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    logger.error('useAuth called outside of AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Log authentication state when useAuth is called
  logger.debug('useAuth called with state', {
    isLoggedIn: context.isLoggedIn,
    userPrincipal: context.userPrincipal,
    userProfile: context.userProfile?.name,
    isLoggingIn: context.isLoggingIn
  });
  
  return context;
} 