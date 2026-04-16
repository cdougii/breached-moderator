@echo off
REM Automated GitHub Setup Script for Breached Demo
REM Run this script from Command Prompt in the project directory

echo === Breached Demo - GitHub Setup ===
echo.

REM Check if git is available
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not found in PATH.
    echo Please install Git from https://git-scm.com/download/win
    echo Or add Git to your PATH and run this script again.
    pause
    exit /b 1
)

echo [OK] Git found

REM Initialize git repository if needed
if not exist .git (
    echo Initializing git repository...
    git init
    echo [OK] Repository initialized
) else (
    echo [OK] Git repository already exists
)

REM Add all files
echo Adding files to git...
git add .
echo [OK] Files added

REM Commit changes
echo Committing changes...
git commit -m "Initial commit: Breached night phase moderation app

- Role selection with Human/Alien team support
- Night phase flow with alternating team roles
- Day phase with team toggle controls
- Captain always acts regardless of team selection
- Spooky futuristic alien invasion theme"
echo [OK] Changes committed

REM Check for existing remote
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Remote repository already configured.
    echo.
    echo To push to GitHub, run:
    echo   git push -u origin main
) else (
    echo.
    echo === Next Steps ===
    echo.
    echo 1. Create a new repository on GitHub:
    echo    https://github.com/new
    echo.
    echo 2. After creating the repository, run:
    echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    echo    git branch -M main
    echo    git push -u origin main
)

echo.
echo === Setup Complete ===
pause
