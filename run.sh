#!/bin/bash

clear
echo "============================================================"
echo "ROBE MIDI Player Setup"
echo "============================================================"
echo ""
sleep 2
clear

echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from https://python.org"
    read -p "Press Enter to exit..."
    exit 1
fi

python3 --version
echo ""
sleep 2
clear

echo "Creating directories..."
mkdir -p uploads
echo "Created uploads directory"
echo ""
sleep 2
clear

echo "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created"
else
    echo "Virtual environment already exists"
fi
echo ""
sleep 2
clear

echo "Activating virtual environment..."
source venv/bin/activate
echo "Virtual environment activated"
echo ""
sleep 2
clear

echo "Installing Python dependencies..."
pip install -r scripts/requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies"
    read -p "Press Enter to exit..."
    exit 1
fi
echo "Dependencies installed successfully"
echo ""
sleep 2
clear

echo "============================================================"
echo "ROBE MIDI Player Setup Complete!"
echo "============================================================"
echo ""
echo "How to use:"
echo ""
echo "- Backend server will start here in this terminal"
echo "- Frontend will start in a new terminal (Next.js)"
echo ""
echo "Important Notes:"
echo "- Backend runs on port 8000 (http://localhost:8000)"
echo "- Frontend runs on port 3000 (http://localhost:3000)"
echo "- Keep both terminals open for full functionality"
echo "- MIDI notes are mapped to QWERTY keys"
echo ""
echo "============================================================"
echo ""
sleep 4
clear

echo "Starting frontend..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && ./start-frontend.sh\""
else
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && ./start-frontend.sh; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && ./start-frontend.sh; exec bash" &
    else
        echo "Please open a new terminal and run: ./start-frontend.sh"
    fi
fi
echo "Frontend started in new terminal"
echo ""
sleep 2
clear

echo "Starting ROBE backend server with full debug output..."
python3 -u scripts/main.py
