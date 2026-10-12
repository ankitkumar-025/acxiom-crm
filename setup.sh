#!/usr/bin/env bash
# ==============================================================================
# AcxiomCRM - Automated Environment Setup & Dependency Installer
# Supported on: Linux, macOS, WSL, and Git Bash on Windows
# ==============================================================================

set -e

# Color formatting helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}${BOLD}======================================================${NC}"
echo -e "${CYAN}${BOLD}       AcxiomCRM Automated Setup & Launcher          ${NC}"
echo -e "${CYAN}${BOLD}======================================================${NC}\n"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Check Node.js runtime
echo -e "${BLUE}[1/6] Checking Node.js runtime...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}[ERROR] Node.js is not installed or not in your PATH.${NC}"
  echo -e "${YELLOW}Please install Node.js (v18.0.0 or later):${NC}"
  echo -e "  - Official website: https://nodejs.org/"
  echo -e "  - Ubuntu / Debian:   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  echo -e "  - macOS (Homebrew):  brew install node"
  echo -e "  - Node Version Mgr:  nvm install --lts && nvm use --lts"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION}${NC}"

# 2. Check npm package manager
echo -e "\n${BLUE}[2/6] Checking npm package manager...${NC}"
if ! command -v npm &> /dev/null; then
  echo -e "${RED}[ERROR] npm is not installed.${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm detected: v${NPM_VERSION}${NC}"

# 3. Create .env configuration if missing
echo -e "\n${BLUE}[3/6] Configuring environment variables...${NC}"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from .env.example template.${NC}"
  else
    cat <<EOF > .env
PORT=3000
NODE_ENV=development
JWT_SECRET=acxiom-crm-super-secure-production-secret-key-2026
CSRF_SECRET=acxiom-anti-forgery-token-secret-2026
DATABASE_PATH=./acxiom_crm.db
EOF
    echo -e "${GREEN}✓ Generated default .env file.${NC}"
  fi
else
  echo -e "${GREEN}✓ Existing .env configuration found.${NC}"
fi

# 4. Install npm dependencies
echo -e "\n${BLUE}[4/6] Installing all required dependencies (npm install)...${NC}"
npm install --no-audit

echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"

# 5. Seed initial database records
echo -e "\n${BLUE}[5/6] Initializing and seeding SQLite database...${NC}"
npm run seed

echo -e "${GREEN}✓ Database schema initialized and seeded.${NC}"

# 6. Run test suite to verify system integrity
echo -e "\n${BLUE}[6/6] Running acceptance test suite (15 verification scenarios)...${NC}"
npm test

# Completion summary
echo -e "\n${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD}      ACXIOMCRM SETUP COMPLETED SUCCESSFULLY!         ${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}\n"

echo -e "${BOLD}Default Demonstration Accounts:${NC}"
echo -e "  • ${CYAN}Admin:${NC}           admin@acxiomcrm.com   / Admin@123"
echo -e "  • ${CYAN}Manager:${NC}         manager@acxiomcrm.com / Manager@123"
echo -e "  • ${CYAN}Sales Executive:${NC} sales@acxiomcrm.com   / Sales@123\n"

echo -e "${BOLD}Application URL:${NC}  ${GREEN}http://localhost:3000${NC}"
echo -e "${BOLD}REST API Base:${NC}    ${GREEN}http://localhost:3000/api${NC}\n"

if [ "$1" == "--install-only" ] || [ "$1" == "--no-start" ]; then
  echo -e "${YELLOW}Install-only mode specified. Exiting without launching server.${NC}"
  echo -e "Run '${BOLD}npm start${NC}' whenever you want to start the application.\n"
  exit 0
fi

echo -e "${YELLOW}Starting AcxiomCRM server now (Press Ctrl+C to stop)...${NC}\n"
npm start
