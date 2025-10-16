@echo off
echo Installing requirements with pre-compiled wheels...
pip install --only-binary=all -r scripts/requirements.txt
if %errorlevel% neq 0 (
    echo Failed with binary-only install, trying with build tools...
    pip install -r scripts/requirements.txt
)
pause
