# 🚀 Justfile for Chained Social ICP Project

# 🛠️ Setup: Complete project initialization and deployment
setup:
    @echo "🚀 Setting up Chained Social project..."
    @echo "📦 Installing frontend dependencies..."
    just install-frontend
    @echo "📝 Creating stub declarations for build..."
    just create-stub-declarations
    @echo "🏗️ Building frontend assets..."
    just build-frontend
    @echo "🚀 Starting dfx and deploying canisters..."
    dfx stop || true
    dfx start --background --clean
    dfx deploy
    @echo "🔄 Generating type declarations..."
    dfx generate
    @echo "✅ Setup complete! Your project is ready."
    just urls

# 📦 Install frontend dependencies
install-frontend:
    cd frontend && npm install

# 🛠️ Build frontend assets
build-frontend:
    @echo "🏗️ Building frontend assets..."
    cd frontend && npm run build

# 🛠️ Build frontend assets (without type declarations)
build-frontend-no-types:
    @echo "🏗️ Building frontend assets (without type declarations)..."
    cd frontend && npm run build -- --mode development

# 🛠️ Create stub declarations for build
create-stub-declarations:
    @echo "📝 Creating stub declarations for build..."
    mkdir -p src/declarations/content
    mkdir -p src/declarations/backend
    mkdir -p src/declarations/frontend
    echo 'export const content = { createPost: async () => ({ err: "Not available" }), getPosts: async () => ({ err: "Not available" }), getPost: async () => ({ err: "Not available" }), getUserPosts: async () => ({ err: "Not available" }), likePost: async () => ({ err: "Not available" }), addComment: async () => ({ err: "Not available" }), getPostCount: async () => 0 };' > src/declarations/content/index.js
    echo 'export const backend = { setUserProfile: async () => ({ err: "Not available" }), getUserProfile: async () => ({ err: "Not available" }), getUserProfileByUsername: async () => ({ err: "Not available" }), addUserResult: async () => ({ err: "Not available" }), getUserResults: async () => ({ err: "Not available" }), outcall_ai_model_for_sentiment_analysis: async () => ({ err: "Not available" }) };' > src/declarations/backend/index.js
    echo 'export const canisterId = "stub-canister-id";' >> src/declarations/backend/index.js
    echo 'export const createActor = (canisterId, options) => ({ stub: true });' >> src/declarations/backend/index.js
    echo 'export const frontend = {};' > src/declarations/frontend/index.js

# 🏗️ Build: Build frontend and generate types
build:
    just build-frontend
    just generate

# 🔄 Regenerate type declarations
generate:
    @echo "🔄 Generating type declarations..."
    dfx generate || @echo "⚠️ Type generation failed - canisters may not be deployed yet"

# 🚢 Deploy all canisters (backend & frontend)
deploy-canisters:
    dfx start --background
    dfx deploy
    just generate

# 🧹 Clean deploy all canisters
deploy-canisters-clean:
    dfx stop
    dfx start --background --clean
    dfx deploy
    just generate

# 🌟 Full deploy: install, build, and deploy everything
deploy:
    just start-dfx | echo "dfx already running"
    just install-frontend
    just deploy-canisters-clean
    just generate
    just build-frontend
    just urls

# Start dfx on background
start-dfx:
    dfx start --background

start-dfx-clean:
    dfx stop
    dfx start --background --clean
    dfx identity use m

# Deploy to playground
deploy-playground:
    dfx stop
    dfx deploy backend --playground
    dfx deploy content --playground
    @echo "Backend: $(dfx canister id backend --playground)"
    @echo "Content: $(dfx canister id content --playground)"

# Deploy to mainnet
deploy-mainnet:
    dfx stop
    export DFX_WARNING=-mainnet_plaintext_identity
    dfx deploy --network ic
    @echo "Frontend: https://$(dfx canister id frontend --network ic).ic0.app"
    @echo "Backend: $(dfx canister id backend --network ic)"
    @echo "Content: $(dfx canister id content --network ic)"

# Check balance
check-balance:
    dfx wallet --network ic balance

# 🚀 Start development server
dev:
    @echo "🚀 Starting development server..."
    cd frontend && npm run dev

# Convert ICP to cycles
convert-cycles:
    dfx cycles convert --amount=0.5 --network ic

# 🔧 Reset: Clean everything and start fresh
reset:
    @echo "🧹 Cleaning everything..."
    dfx stop
    rm -rf .dfx
    rm -rf frontend/dist
    rm -rf src/declarations
    @echo "✅ Clean complete. Run 'just setup' to start fresh."

# 🔍 Status: Check project status
status:
    @echo "📊 Project Status:"
    @echo "DFX Status:"
    dfx ping
    @echo ""
    @echo "Canister IDs:"
    @echo "Backend: $(dfx canister id backend 2>/dev/null || echo 'Not deployed')"
    @echo "Content: $(dfx canister id content 2>/dev/null || echo 'Not deployed')"
    @echo "Frontend: $(dfx canister id frontend 2>/dev/null || echo 'Not deployed')"
    @echo ""
    @echo "Network: $(dfx info identity 2>/dev/null || echo 'Not configured')"



# 🌐 URLs: Show current canister URLs
urls:
    chmod +x scripts/urls.sh
    ./scripts/urls.sh

# 🚀 Codespaces: Setup port forwarding for GitHub Codespaces
codespaces-setup:
    @echo "🚀 Setting up GitHub Codespaces port forwarding..."
    @echo "📋 Add these ports to your Codespaces configuration:"
    @echo "  - Port 4943 (dfx replica)"
    @echo "  - Port 5173 (vite dev server)"
    @echo ""
    @echo "💡 In VS Code:"
    @echo "  1. Go to Ports tab"
    @echo "  2. Click '+' to add port 4943"
    @echo "  3. Set visibility to 'Public'"
    @echo "  4. Repeat for port 5173 if using dev server"
    @echo ""
    @echo "🌐 After setup, run 'just urls' to get the correct URLs"
    @echo ""
    @echo "📝 URL Types Explained:"
    @echo "  - Frontend URL: Direct access to your web app"
    @echo "  - Backend/Content Candid URLs: API interface for testing"
    @echo "  - Use Frontend URL for normal browsing"
    @echo "  - Use Candid URLs for API testing and debugging"

# 📝 Explain URL types
explain-urls:
    @echo "📝 Understanding the Different URL Types:"
    @echo ""
    @echo "🌐 Frontend URL:"
    @echo "  - This is your main web application"
    @echo "  - Use this for normal browsing and user interaction"
    @echo "  - Local: http://canister-id.localhost:4943/"
    @echo "  - Codespaces: https://codespace-4943.github.dev/?canisterId=canister-id"
    @echo ""
    @echo "🔧 Backend/Content Candid URLs:"
    @echo "  - These are API interfaces for testing canister functions"
    @echo "  - Use these for debugging and API testing"
    @echo "  - Example: https://codespace-4943.github.dev/?canisterId=umunu-kh777-77774-qaaca-cai&id=backend-id"
    @echo ""
    @echo "💡 Important Codespaces Note:"
    @echo "  - Frontend URLs MUST include canisterId parameter in Codespaces"
    @echo "  - Direct access (without canisterId) returns HTTP 400 error"
    @echo ""
    @echo "💡 When to use which:"
    @echo "  - For normal usage: Use the Frontend URL"
    @echo "  - For development/testing: Use the Candid URLs"
    @echo "  - For debugging: Use 'just troubleshoot'"

# 🔧 Troubleshoot: Check deployment and connectivity
troubleshoot:
    @echo "🔧 Troubleshooting deployment issues..."
    @echo ""
    @echo "📊 Current Status:"
    @echo "dfx ping"
    dfx ping
    @echo ""
    @echo "🏗️ Canister Status:"
    @echo "dfx canister status backend 2>/dev/null || echo 'Backend: Not deployed'"
    dfx canister status backend 2>/dev/null || echo "Backend: Not deployed"
    @echo "dfx canister status content 2>/dev/null || echo 'Content: Not deployed'"
    dfx canister status content 2>/dev/null || echo "Content: Not deployed"
    @echo "dfx canister status frontend 2>/dev/null || echo 'Frontend: Not deployed'"
    dfx canister status frontend 2>/dev/null || echo "Frontend: Not deployed"
    @echo ""
    @echo "🌐 Current URLs:"
    just urls
    @echo ""
    @echo "💡 If canisters show 'Not deployed', run:"
    @echo "  just setup"
    @echo ""
    @echo "💡 If URLs show 'not-deployed', run:"
    @echo "  just deploy"

# 🔧 Codespaces-specific troubleshooting
codespaces-troubleshoot:
    @echo "🔧 Codespaces-specific troubleshooting..."
    @echo ""
    @echo "📋 Environment Check:"
    @echo "CODESPACES: ${CODESPACES:-'Not set'}"
    @echo "CODESPACE_NAME: ${CODESPACE_NAME:-'Not set'}"
    @echo "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: ${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-'Not set'}"
    @echo ""
    @echo "🌐 Port Forwarding Check:"
    @echo "Make sure port 4943 is forwarded and set to 'Public'"
    @echo ""
    @echo "🔗 Alternative URL Formats to Try:"
    @echo "1. Direct: https://your-codespace-4943.github.dev/"
    @echo "2. With canisterId: https://your-codespace-4943.github.dev/?canisterId=FRONTEND_ID"
    @echo "3. Local fallback: http://127.0.0.1:4943/?canisterId=FRONTEND_ID"
    @echo ""
    @echo "💡 If none work, try:"
    @echo "  just reset"
    @echo "  just setup"
    @echo ""
    @echo "🌐 For Frontend Issues:"
    @echo "1. Check the Ports tab in VS Code"
    @echo "2. Look for port 4943 and click 'Open in Browser'"
    @echo "3. Or try: just codespaces-frontend-fix"

# 🔧 Fix Codespaces frontend access
codespaces-frontend-fix:
    @echo "🔧 Fixing Codespaces frontend access..."
    @echo ""
    @echo "📋 Current Frontend Canister ID:"
    @echo "$(dfx canister id frontend)"
    @echo ""
    @echo "✅ Working Codespaces Frontend URL:"
    @echo "https://your-codespace-4943.github.dev/?canisterId=$(dfx canister id frontend)"
    @echo ""
    @echo "💡 Key Finding:"
    @echo "In Codespaces, frontend URLs MUST include the canisterId parameter"
    @echo "Direct access (without canisterId) returns HTTP 400 error"
    @echo ""
    @echo "🔧 Alternative URLs (if the above doesn't work):"
    @echo "1. Port 4943 in VS Code Ports tab → 'Open in Browser'"
    @echo "2. http://127.0.0.1:4943/?canisterId=$(dfx canister id frontend)"
    @echo ""
    @echo "💡 If still not working:"
    @echo "  just start-dfx"
    @echo "  just deploy"
    @echo "  just codespaces-setup"

# 🆘 Help: Show available commands
help:
    @echo "🚀 Chained Social - Available Commands:"
    @echo ""
    @echo "📋 Setup Commands:"
    @echo "  just setup        - Complete project setup and deployment"
    @echo "  just reset        - Clean everything and start fresh"
    @echo ""
    @echo "🛠️ Development Commands:"
    @echo "  just deploy       - Full deployment (install, build, deploy)"
    @echo "  just build        - Build frontend and generate types"
    @echo "  just dev          - Start development server"
    @echo ""
    @echo "🚀 Deployment Commands:"
    @echo "  just deploy-mainnet - Deploy to mainnet"
    @echo "  just deploy-playground - Deploy to playground"
    @echo ""
    @echo "📊 Utility Commands:"
    @echo "  just status       - Check project status"
    @echo "  just urls         - Show current canister URLs"
    @echo "  just explain-urls - Explain different URL types"
    @echo "  just troubleshoot - Troubleshoot deployment issues"
    @echo "  just codespaces-setup - Setup GitHub Codespaces port forwarding"
    @echo "  just codespaces-troubleshoot - Codespaces-specific troubleshooting"
    @echo "  just codespaces-frontend-fix - Fix Codespaces frontend access issues"
    @echo "  just check-balance - Check wallet balance"
    @echo "  just convert-cycles - Convert ICP to cycles"
    @echo ""
    @echo "💡 Run 'just help' to see this message again"