@echo off
setlocal EnableDelayedExpansion

echo ======================================================
echo        AcxiomCRM Automated Windows Setup ^& Launcher
echo ======================================================
echo.

:: 1. Check Node.js
echo [1/6] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js (v18.0.0 or later) from https://nodejs.org/
    pause
    exit /b 1
)
node -v

:: 2. Check npm
echo.
echo [2/6] Checking npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in your PATH.
    pause
    exit /b 1
)
call npm -v

:: 3. Configure .env
echo.
echo [3/6] Configuring environment variables...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env from .env.example
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=development >> .env
        echo JWT_SECRET=acxiom-crm-super-secure-production-secret-key-2026 >> .env
        echo CSRF_SECRET=acxiom-anti-forgery-token-secret-2026 >> .env
        echo DATABASE_PATH=./acxiom_crm.db >> .env
        echo [OK] Created default .env
    )
) else (
    echo [OK] Existing .env file found.
)

:: 4. Install Dependencies
echo.
echo [4/6] Installing dependencies (npm install)...
call npm install --no-audit

:: 5. Initialize and seed database
echo.
echo [5/6] Initializing and seeding database...
call npm run seed

:: 6. Run Verification Tests
echo.
echo [6/6] Running acceptance test suite...
call npm test

echo.
echo ======================================================
echo       ACXIOMCRM SETUP COMPLETED SUCCESSFULLY!
echo ======================================================
echo.
echo Default Demo Accounts:
echo   - Admin:           admin@acxiomcrm.com   / Admin@123
echo   - Manager:         manager@acxiomcrm.com / Manager@123
echo   - Sales Executive: sales@acxiomcrm.com   / Sales@123
echo.
echo Application URL:  http://localhost:3000
echo REST API Base:    http://localhost:3000/api
echo.

if "%1"=="--install-only" (
    echo Installation complete. Exiting without launching server.
    exit /b 0
)

echo Starting AcxiomCRM server now (Press Ctrl+C to stop)...
echo.
call npm start
pause
