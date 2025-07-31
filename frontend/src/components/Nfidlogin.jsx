import { useState } from "react";
import { NFID } from "@nfid/embed";
import { HttpAgent } from "@dfinity/agent";
import { AnonymousIdentity } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import {
  canisterId,
  createActor,
} from "../declarations/backend";

function NfidLogin({ setBackendActor }) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [nfidInitialized, setNfidInitialized] = useState(false);
  
  // Store NFID instance once initialized
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
        console.log(`🔄 Attempting NFID initialization (attempt ${retryCount + 1}/${maxRetries})`);
        nfid = await NFID.init(nfidConfig);
        console.log("✅ NFID initialized successfully");
        
        setNfidInitialized(true);
        setNfidInstance(nfid);
        return nfid;
      } catch (initError) {
        retryCount++;
        console.warn(`⚠️ NFID init attempt ${retryCount} failed:`, initError);
        
        if (retryCount >= maxRetries) {
          throw new Error(`NFID initialization failed after ${maxRetries} attempts: ${initError.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  async function handleLogin() {
    setIsLoggingIn(true);
    setLoginError(null);
    
    console.log("🔍 Starting login process...");
    
    try {
      // Environment detection
      const isLocal = window.location.hostname.includes('localhost') || 
                     window.location.hostname.includes('127.0.0.1');
      const isCodespaces = window.location.hostname.includes('github.dev') ||
                          window.location.hostname.includes('app.github.dev');
      
      console.log(`🌍 Environment: ${isLocal ? 'Local' : isCodespaces ? 'Codespaces' : 'Production'}`);
      console.log(`📍 Hostname: ${window.location.hostname}`);
      console.log(`🔗 URL: ${window.location.href}`);
      
      let agent;
      let principal;
      
      if (isLocal || isCodespaces) {
        // For local development and Codespaces, create a persistent identity
        console.log("✅ Using persistent identity for development");
        
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
        console.log("🔄 Fetching local root key...");
        try {
          await agent.fetchRootKey();
          console.log("✅ Root key fetched successfully");
        } catch (rootKeyError) {
          console.error("❌ Root key fetch failed:", rootKeyError);
          throw new Error(`Local replica unavailable. Please run: dfx start --clean\n${rootKeyError.message}`);
        }
        
        // Test the connection
        console.log("🔄 Testing connection...");
        try {
          await agent.status();
          console.log("✅ Agent connection verified");
        } catch (statusError) {
          console.error("❌ Agent status check failed:", statusError);
          throw new Error(`Connection test failed: ${statusError.message}`);
        }
        
        principal = identity.getPrincipal().toText();
        
      } else {
        // For production, use NFID
        console.log("🚀 Using NFID for production");
        
        // Use promise-based initialization
        const nfid = await initializeNFID();
        
        // Try delegation with retry mechanism
        let delegationIdentity;
        let delegationRetries = 0;
        const maxDelegationRetries = 3;
        
        while (delegationRetries < maxDelegationRetries) {
          try {
            console.log(`🔄 Attempting delegation (attempt ${delegationRetries + 1}/${maxDelegationRetries})`);
            delegationIdentity = await nfid.getDelegation({
              maxTimeToLive: BigInt(8) * BigInt(3_600_000_000_000),
            });
            console.log("✅ Delegation acquired");
            break;
          } catch (delegationError) {
            delegationRetries++;
            console.warn(`⚠️ Delegation attempt ${delegationRetries} failed:`, delegationError);
            
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
      
      console.log("✅ Login successful, Principal:", principal);
      setBackendActor(backendActor, principal);
      
    } catch (error) {
      console.error("❌ Login error:", error);
      
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
  }

  return (
    <div>
      <button
        id="loginBtn"
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-none rounded-lg cursor-pointer shadow-sm transition-all duration-300 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {isLoggingIn ? "🔄 Connecting..." : "Connect to start posting"}
      </button>
      
      {/* Show Codespaces info */}
      {window.location.hostname.includes('github.dev') && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          💡 <strong>Codespaces Mode:</strong> Using anonymous identity for development
        </div>
      )}
      
      {loginError && (
        <div className="absolute top-16 right-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 max-w-xs">
          <p className="text-red-800 text-sm">❌ {loginError}</p>
          {loginError.includes("dfx start") && (
            <p className="text-red-600 text-xs mt-1">
              💡 Try running: <code className="bg-red-100 px-1 rounded">dfx start --clean</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default NfidLogin;
