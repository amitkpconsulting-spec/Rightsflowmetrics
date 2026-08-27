@echo off
title RightsFlow Metrics - Control Center

:: Ensure working directory is the script directory
cd /d "%~dp0"

:MAIN_MENU
cls
echo ===============================================================================
echo                   RightsFlow Metrics - Control Center
echo ===============================================================================
echo.
echo   Please select an option from the menu below:
echo.
echo     [1] Run Local Server   - Auto-detects free port and opens browser
echo     [2] Run Docker Setup   - Executes docker compose up -d --build
echo     [3] Stop Docker Setup  - Executes docker compose down
echo     [4] Re-run Setup       - Calls Setup.bat to verify dependencies
echo     [5] Exit
echo.
echo ===============================================================================

set "CHOICE="
set /p "CHOICE=Enter choice 1-5 [Default is 1]: "
if "%CHOICE%"=="" set "CHOICE=1"

if "%CHOICE%"=="1" goto RUN_LOCAL_SERVER
if "%CHOICE%"=="2" goto RUN_DOCKER_UP
if "%CHOICE%"=="3" goto RUN_DOCKER_DOWN
if "%CHOICE%"=="4" goto RERUN_SETUP
if "%CHOICE%"=="5" goto EXIT_PROGRAM

echo.
echo [ERROR] Invalid selection! Please enter a number between 1 and 5.
timeout /t 2 >nul
goto MAIN_MENU

:: -----------------------------------------------------------------------------
:: Helper: Verify Prerequisites Before Launching
:: -----------------------------------------------------------------------------
:CHECK_PREREQUISITES
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not available in PATH.
    echo Please install Node.js v18 or higher from https://nodejs.org/
    pause
    goto MAIN_MENU
)

if not exist ".env" (
    echo [INFO] .env not found. Generating default from template...
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul 2>&1
    ) else (
        (echo PORT=3000) > .env
    )
)

if not exist "node_modules" (
    echo [WARNING] Dependencies not detected in node_modules.
    echo Automatically invoking Setup.bat...
    echo.
    call Setup.bat
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Setup failed. Please inspect the log above.
        pause
        goto MAIN_MENU
    )
)
goto :eof

:: -----------------------------------------------------------------------------
:: Option 1: Run Local Server (With Dynamic Port Auto-Assignment)
:: -----------------------------------------------------------------------------
:RUN_LOCAL_SERVER
cls
echo ===============================================================================
echo                Launching RightsFlow Metrics - Local Server
echo ===============================================================================
echo.

call :CHECK_PREREQUISITES

:: Ensure production server.cjs exists, or compile it
if not exist "server.cjs" (
    echo [INFO] Building application bundle: server.cjs and dist...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Build returned non-zero code. Attempting direct dev server...
    )
)

echo.
echo [INFO] Checking network port availability...

:: Auto-detect free port starting from 3000
set "APP_PORT=3000"
for /f "tokens=*" %%p in ('node scripts/find-port.js 2^>nul') do set "APP_PORT=%%p"

if "%APP_PORT%"=="3000" (
    echo [OK] Port 3000 is available.
) else (
    echo [INFO] Port 3000 is currently in use. Auto-assigned to available port: %APP_PORT%
)

:: Export PORT environment variable for server process
set "PORT=%APP_PORT%"

echo.
echo ===============================================================================
echo [INFO] Starting RightsFlow Metrics on http://localhost:%APP_PORT%
echo [INFO] Press Ctrl+C in this console to stop the server at any time.
echo ===============================================================================
echo.

:: Launch browser in background with 2-second buffer for port binding
start /b cmd /c "timeout /t 2 >nul & start http://localhost:%APP_PORT%" >nul 2>&1

:: Run server directly with Node
if exist "server.cjs" goto LAUNCH_CJS
if exist "server.js" goto LAUNCH_JS
goto LAUNCH_DEV

:LAUNCH_CJS
call node server.cjs
if %ERRORLEVEL% NEQ 0 goto LAUNCH_DEV
goto MAIN_MENU

:LAUNCH_JS
call node server.js
if %ERRORLEVEL% NEQ 0 goto LAUNCH_DEV
goto MAIN_MENU

:LAUNCH_DEV
echo.
echo [WARNING] Production bundle execution stopped or not found.
echo Attempting development mode fallback...
call npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server could not be started on port %APP_PORT%.
    echo Please check for firewall restrictions or conflicting background services.
    pause
)
goto MAIN_MENU

:: -----------------------------------------------------------------------------
:: Option 2: Run Docker Setup
:: -----------------------------------------------------------------------------
:RUN_DOCKER_UP
cls
echo ===============================================================================
echo           Launching RightsFlow Metrics - Docker Container [Port 3000]
echo ===============================================================================
echo.

docker -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not available in your system PATH!
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    goto MAIN_MENU
)

echo [INFO] Building and starting Docker container in background...
docker compose up -d --build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] RightsFlow Metrics container is running in background!
    echo [INFO] Access the application at: http://localhost:3000
    start /b cmd /c "timeout /t 2 >nul & start http://localhost:3000" >nul 2>&1
) else (
    echo.
    echo [ERROR] Docker Compose failed to build or start containers.
)
echo.
pause
goto MAIN_MENU

:: -----------------------------------------------------------------------------
:: Option 3: Stop Docker Setup
:: -----------------------------------------------------------------------------
:RUN_DOCKER_DOWN
cls
echo ===============================================================================
echo           Stopping RightsFlow Metrics - Docker Container
echo ===============================================================================
echo.

docker -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed or not available in your system PATH!
    echo.
    pause
    goto MAIN_MENU
)

echo [INFO] Stopping and cleaning up containers...
docker compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Docker services stopped cleanly.
) else (
    echo.
    echo [ERROR] Docker Compose encountered an error while stopping services.
)
echo.
pause
goto MAIN_MENU

:: -----------------------------------------------------------------------------
:: Option 4: Re-run Setup
:: -----------------------------------------------------------------------------
:RERUN_SETUP
cls
call Setup.bat
goto MAIN_MENU

:: -----------------------------------------------------------------------------
:: Option 5: Exit
:: -----------------------------------------------------------------------------
:EXIT_PROGRAM
cls
echo.
echo Thank you for using RightsFlow Metrics.
echo Exiting Control Center...
timeout /t 1 >nul
exit /b 0
