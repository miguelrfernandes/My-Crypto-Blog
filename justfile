# 🚀 Justfile for Chained Social ICP Project

# 📦 Install frontend dependencies
install-frontend:
    cd frontend && npm install

# 🛠️ Build frontend assets
build-frontend:
    cd frontend && npm run build

# 🔄 Regenerate type declarations
generate:
    dfx generate

# 🚢 Deploy all canisters (backend & frontend)
deploy-canisters:
    just generate
    dfx deploy

# 🌟 Full deploy: install, build, and deploy everything
deploy:
    just install-frontend
    just build-frontend
    just deploy-canisters

# Start dfx on background
start-dfx:
    dfx start --background

start-dfx-clean:
    dfx stop
    dfx start --background --clean
    dfx identity use m