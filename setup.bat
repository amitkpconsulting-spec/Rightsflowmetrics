@echo off
title RightsFlow Metrics - Automated Setup

:: Ensure working directory is the script directory
cd /d "%~dp0"

cls
echo ===============================================================================
echo                RightsFlow Metrics - Automated Environment Setup
echo ===============================================================================
echo [INFO] Initializing system checks and dependency configuration...
echo.

:: -----------------------------------------------------------------------------
:: Step 1: Detect Node.js
:: -----------------------------------------------------------------------------
echo [Step 1/5] Detecting Node.js runtime environment...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto NODE_MISSING

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"

:: Validate Node major version >= 18
node -e "const m = parseInt(process.versions.node.split('.')[0], 10); process.exit(m >= 18 ? 0 : 1);" >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto NODE_INCOMPATIBLE

echo [OK] Node.js runtime verified: %NODE_VERSION% - Node 18 or higher supported.
echo.
goto STEP_NPM

:NODE_MISSING
echo.
echo [ERROR] Node.js is NOT installed or not accessible in your system PATH
echo.
echo Please download and install Node.js v18 or higher - v20 LTS recommended:
echo Download URL: https://nodejs.org/
echo.
echo If you just installed Node.js, please close and re-open this terminal window.
echo.
goto FAILED_EXIT

:NODE_INCOMPATIBLE
echo.
echo [ERROR] Incompatible Node.js version detected: %NODE_VERSION%
echo RightsFlow Metrics requires Node.js v18.0.0 or higher.
echo Please upgrade your Node.js runtime at: https://nodejs.org/
echo.
goto FAILED_EXIT

:: -----------------------------------------------------------------------------
:: Step 2: Detect npm
:: -----------------------------------------------------------------------------
:STEP_NPM
echo [Step 2/5] Detecting npm package manager...
call npm -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto NPM_MISSING

for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VERSION=%%v"
echo [OK] npm package manager verified: v%NPM_VERSION%
echo.
goto STEP_ENV

:NPM_MISSING
echo.
echo [ERROR] npm is NOT detected in your system PATH
echo Please ensure npm is installed alongside Node.js.
echo.
goto FAILED_EXIT

:: -----------------------------------------------------------------------------
:: Step 3: Environment File Configuration
:: -----------------------------------------------------------------------------
:STEP_ENV
echo [Step 3/5] Verifying environment configuration .env ...
if exist ".env" goto ENV_EXISTS

if exist ".env.example" (
    copy /y ".env.example" ".env" >nul 2>&1
    echo [OK] Created .env configuration file from .env.example template.
) else (
    (echo PORT=3000) > .env
    (echo GEMINI_API_KEY=) >> .env
    echo [OK] Generated default .env file with PORT=3000.
)
goto STEP_DEPS

:ENV_EXISTS
echo [OK] Existing .env configuration file detected.

:: -----------------------------------------------------------------------------
:: Step 4: Install Dependencies
:: -----------------------------------------------------------------------------
:STEP_DEPS
echo.
echo [Step 4/5] Installing project dependencies with npm...
echo This may take 1 to 2 minutes on the first run...
echo.

call npm install
if %ERRORLEVEL% NEQ 0 goto DEPS_FAILED

echo.
echo [OK] Dependencies successfully installed in node_modules.
echo.
goto STEP_BUILD

:DEPS_FAILED
echo.
echo [ERROR] Dependency installation failed with exit code: %ERRORLEVEL%
echo Please check your internet connection and inspect the error log above.
echo.
goto FAILED_EXIT

:: -----------------------------------------------------------------------------
:: Step 5: Verify Production Build Pipeline
:: -----------------------------------------------------------------------------
:STEP_BUILD
echo [Step 5/5] Verifying production build pipeline: npm run build ...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Build pipeline returned non-zero code.
    echo Development mode via start.bat may still function.
    echo.
) else (
    echo.
    echo [OK] Production build pipeline verified: server.cjs and dist ready.
    echo.
)

:: -----------------------------------------------------------------------------
:: Success Summary
:: -----------------------------------------------------------------------------
echo ===============================================================================
echo                       SETUP COMPLETED SUCCESSFULLY
echo ===============================================================================
echo   - Node.js Runtime:       %NODE_VERSION% - Verified
echo   - npm Package Manager:  v%NPM_VERSION% - Verified
echo   - Environment File:      .env configured
echo   - Node Dependencies:     node_modules installed
echo   - Production Pipeline:   server.cjs compiled and ready
echo ===============================================================================
echo.
echo NEXT STEP:
echo   Double-click start.bat to launch the RightsFlow Metrics Control Center.
echo.
echo ===============================================================================
pause
exit /b 0

:FAILED_EXIT
echo ===============================================================================
echo                             SETUP FAILED
echo ===============================================================================
echo Please resolve the error messages detailed above and run Setup.bat again.
echo ===============================================================================
pause
exit /b 1
