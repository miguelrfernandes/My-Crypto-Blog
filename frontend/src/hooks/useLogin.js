import { useState } from 'react';
import { NFID } from "@nfid/embed";
import { HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { canisterId, createActor } from "../declarations/backend";
import { createLogger } from '../utils/logger';

const logger = createLogger('useLogin');

export function useLogin(setBackendActor) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [nfidInitialized, setNfidInitialized] = useState(false);
  const [nfidInstance, setNfidInstance] = useState(null);

  // Initialize NFID with simple promise-based approach
  const initializeNFID = async () => {
    if (nfidInitialized && nfidInstance) {
      return nfidInstance;
    }
    
    const nfidConfig = {
      application: {
        name: "Chained Social",
        logo: "https://taikai.azureedge.net/g85_fmDME2uOKEmFV0CfFmfcZQCmiDvIFknjOsWr8v8/rs:fit:350:0:0/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3RhaWthaS1zdG9yYWdlL2ltYWdlcy9iYTViMmVhMC04ZDUxLTExZWYtYTI3MS02NTA0MjI1OTI3NGJTcXVlcmUtMiAoMikucG5n",
      },
    };
    
    // Simple wait for DOM to be ready
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }
    
    // Initialize NFID with retry mechanism
    let nfid;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        logger.info(`Attempting NFID initialization`, { attempt: retryCount + 1, maxRetries });
        nfid = await NFID.init(nfidConfig);
        logger.info("NFID initialized successfully");
        
        setNfidInitialized(true);
        setNfidInstance(nfid);
        return nfid;
      } catch (initError) {
        retryCount++;
        logger.warn(`NFID init attempt failed`, { attempt: retryCount, error: initError.message });
        
        if (retryCount >= maxRetries) {
          throw new Error(`NFID initialization failed after ${maxRetries} attempts: ${initError.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    logger.info("Starting login process");
    
    try {
      // Environment detection
      const isLocal = window.location.hostname.includes('localhost') || 
                     window.location.hostname.includes('127.0.0.1');
      const isCodespaces = window.location.hostname.includes('github.dev') ||
                          window.location.hostname.includes('app.github.dev');
      
      logger.info("Environment detected", {
        environment: isLocal ? 'Local' : isCodespaces ? 'Codespaces' : 'Production',
        hostname: window.location.hostname,
        url: window.location.href
      });
      
      let agent;
      let principal;
      
      if (isLocal || isCodespaces) {
        // For local development and Codespaces, create a persistent identity
        logger.info("Using persistent identity for development");
        
        // Create a deterministic identity based on browser session
        const sessionKey = localStorage.getItem('chainedsocial_session_key') || 
                          Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
        localStorage.setItem('chainedsocial_session_key', sessionKey);
        
        // Create a deterministic identity from the session key
        const seed = new Uint8Array(32);
        for (let i = 0; i < sessionKey.length && i < 32; i++) {
          seed[i] = sessionKey.charCodeAt(i);
        }
        
        // Create identity from seed
        const identity = Ed25519KeyIdentity.fromSeed(seed);
        
        agent = new HttpAgent({ 
          identity: identity,
          host: "http://localhost:4943",
          verifyQuerySignatures: false,
          rejectUnauthorized: false,
          callTimeout: 60000
        });
        
        // Fetch root key for local development
        logger.info("Fetching local root key");
        try {
          await agent.fetchRootKey();
          logger.info("Root key fetched successfully");
        } catch (rootKeyError) {
          logger.error("Root key fetch failed", { error: rootKeyError.message });
          throw new Error(`Local replica unavailable. Please run: dfx start --clean\n${rootKeyError.message}`);
        }
        
        // Test the connection
        logger.info("Testing connection");
        try {
          await agent.status();
          logger.info("Agent connection verified");
        } catch (statusError) {
          logger.error("Agent status check failed", { error: statusError.message });
          throw new Error(`Connection test failed: ${statusError.message}`);
        }
        
        principal = identity.getPrincipal().toText();
        
      } else {
        // For production, use NFID
        logger.info("Using NFID for production");
        
        // Use promise-based initialization
        const nfid = await initializeNFID();
        
        // Try delegation with retry mechanism
        let delegationIdentity;
        let delegationRetries = 0;
        const maxDelegationRetries = 3;
        
        while (delegationRetries < maxDelegationRetries) {
          try {
            logger.info("Attempting delegation", { attempt: delegationRetries + 1, maxRetries: maxDelegationRetries });
            delegationIdentity = await nfid.getDelegation({
              maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000),
            });
            logger.info("Delegation acquired");
            break;
          } catch (delegationError) {
            delegationRetries++;
            logger.warn("Delegation attempt failed", { attempt: delegationRetries, error: delegationError.message });
            
            if (delegationRetries >= maxDelegationRetries) {
              throw delegationError;
            }
            
            // Wait before retrying delegation
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        agent = new HttpAgent({ 
          identity: delegationIdentity,
          host: "https://icp-api.io"
        });
        
        principal = delegationIdentity.getPrincipal().toText();
      }

      const backendActor = createActor(canisterId, { agent });
      
      logger.info("Login successful", { principal });
      setBackendActor(backendActor, principal, agent);
      
    } catch (error) {
      logger.error("Login error", { error: error.message });
      
      // Provide specific guidance based on error type
      let userMessage = "Login failed";
      if (error.message.includes("certificate verification failed")) {
        userMessage = "Local development setup issue. Please restart dfx with: dfx start --clean";
      } else if (error.message.includes("Invalid delegation")) {
        userMessage = "Authentication service unavailable. Please try again or check your internet connection.";
      } else if (error.message.includes("fetchRootKey")) {
        userMessage = "Local replica not running. Please start dfx: dfx start --clean";
      } else if (error.message.includes("threshold signature")) {
        userMessage = "Bitcoin service integration issue. This is expected in local development.";
      } else if (error.message.includes("iframe not instantiated") || error.message.includes("NFID iframe not properly instantiated")) {
        userMessage = "🔄 NFID iframe issue detected. Please try again or refresh the page.";
      } else if (error.message.includes("NFID initialization failed")) {
        userMessage = "🔄 NFID is initializing... Please try again in a moment.";
      } else {
        userMessage = `Login failed: ${error.message}`;
      }
      
      setLoginError(userMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return {
    handleLogin,
    isLoggingIn,
    loginError,
    setLoginError
  };
} 