@echo off
title ROBE MIDI Player Setup

REM ============================================================
REM ROBE MIDI Player Setup Script
REM ============================================================

echo Setting up ROBE MIDI Player...
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Check if Python is installed
REM ------------------------------------------------------------
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do echo Python version: %%i
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Create required directories
REM ------------------------------------------------------------
echo Creating directories...
if not exist "uploads" mkdir uploads
echo Created uploads directory
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Virtual environment setup
REM ------------------------------------------------------------
echo Setting up virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Activate virtual environment
REM ------------------------------------------------------------
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo Virtual environment activated
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Install Python dependencies
REM ------------------------------------------------------------
echo Installing Python dependencies...
pip install -r scripts\requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Final info before servers start
REM ------------------------------------------------------------
echo ============================================================
echo ROBE MIDI Player Setup Complete!
echo ============================================================
echo.
echo How to use:
echo.
echo - Backend server will start here in this window
echo - Frontend will start in a new window (Next.js)
echo.
echo Important Notes:
echo - Backend runs on port 8000 (http://localhost:8000)
echo - Frontend runs on port 3000 (http://localhost:3000)
echo - Keep both windows open for full functionality
echo - MIDI notes are mapped to QWERTY keys
echo.
echo ============================================================
echo.
timeout /t 4 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Start frontend by calling start-frontend.bat in a new CMD window
REM ------------------------------------------------------------
echo Starting frontend...
REM Adjust the path if start-frontend.bat is in scripts folder
set FRONTEND_BATCH=%~dp0start-frontend.bat
start "" cmd /k "%FRONTEND_BATCH%"
echo Frontend started in new window
echo.
timeout /t 2 /nobreak >nul
cls

REM ------------------------------------------------------------
REM Start backend server in current window
REM ------------------------------------------------------------
echo Starting ROBE backend server with full debug output...
python -u scripts\main.py
