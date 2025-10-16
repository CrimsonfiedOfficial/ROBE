# Thank you v0.dev for a less buggier frontend :pray: (yes i coded everything myself, raven your wrong about claude xd)
credit is due where diue is credit idk

CURRENTLY THE TUTORIAL BELOW IS BROKEN, IF YOU ARE MAC THEN..
<img width="1179" height="563" alt="image" src="https://github.com/user-attachments/assets/10a0b23e-1d7e-4014-b0e8-838c25328e2a" />
run 
- chmod +x run.sh
then
- ./run.sh

For windows, just run the "Run.bat" and your all set!

# ROBE MIDI Player

A powerful MIDI-to-keyboard macro player with real-time playback control and direct MIDI output support.

## Features

### Core Features
- ✅ **Open Source** - Free and open source software
- ✅ **MIDI to Keyboard Macros** - Convert MIDI notes to QWERTY keyboard inputs
- ✅ **Velocity Mapping** - Map MIDI velocity to different key combinations
- ✅ **Sustain Pedal Support** - Full sustain pedal (CC64) support
- ✅ **88 Key Support** - Full piano keyboard range support
- ✅ **Direct MIDI Output** - Send MIDI data directly to MIDI output devices
- ✅ **Customizable Hotkeys** - Rebind global keyboard shortcuts (F1-F7 by default)
- ✅ **Real-time Tempo Control** - Adjust playback speed from 25% to 200%
- ✅ **Window Targeting** - Send keystrokes to specific windows (Windows only)
- ✅ **Web-based UI** - Modern, responsive web interface
- ✅ **WebSocket Support** - Real-time updates and communication

### Platform Support
- ✅ **Windows** - Full support with window targeting
- ✅ **macOS** - Supported (users need to configure accessibility permissions)
- ✅ **Linux** - Supported (users need to configure input permissions)

### Not Included
- ❌ **Drums Macro** - Not implemented
- ❌ **Built-in MIDI Hub** - No integration with nanoMIDI.net
- ❌ **Customizable UI** - Fixed UI layout
- ❌ **Random Fail** - No random speed or transposition failures

## Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 18+ (for frontend development)

### Windows Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/CrimsonfiedOfficial/ROBE/
cd newfolder
\`\`\`

2. Install Python dependencies:
\`\`\`bash
install-requirements.bat
\`\`\`

3. Run the application:
\`\`\`bash
run.bat
\`\`\`

The application will automatically open in your default browser at `http://localhost:8000`

### macOS Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd newfolder
\`\`\`

2. Make scripts executable:
\`\`\`bash
chmod +x *.sh
chmod +x scripts/*.sh
\`\`\`

3. Install Python dependencies:
\`\`\`bash
./install-requirements.sh
\`\`\`

4. **IMPORTANT: Grant Accessibility Permissions**
   - Open System Preferences → Security & Privacy → Privacy
   - Select "Accessibility" from the left sidebar
   - Click the lock icon to make changes
   - Add Terminal (or iTerm2 if you use it) to the list
   - Enable the checkbox next to Terminal
   - Select "Input Monitoring" from the left sidebar
   - Add Terminal to this list as well
   - You may need to restart Terminal after granting permissions

5. Run the application:
\`\`\`bash
./run.sh
\`\`\`

The application will open in two terminal windows:
- Backend server (Python) on port 8000
- Frontend development server (Next.js) on port 3000

Open your browser to `http://localhost:3000` to use the application.

### Linux Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd newfolder
\`\`\`

2. Make scripts executable:
\`\`\`bash
chmod +x *.sh
chmod +x scripts/*.sh
\`\`\`

3. Install Python dependencies:
\`\`\`bash
./install-requirements.sh
\`\`\`

4. **IMPORTANT: Configure Input Permissions**
   
   For global keyboard shortcuts to work, you need to grant input permissions:
   
   **Option 1: Add user to input group (recommended)**
   \`\`\`bash
   sudo usermod -a -G input $USER
   \`\`\`
   Then log out and log back in for changes to take effect.
   
   **Option 2: Run with sudo (not recommended for security)**
   \`\`\`bash
   sudo ./run.sh
   \`\`\`

5. Run the application:
\`\`\`bash
./run.sh
\`\`\`

The application will open in two terminal windows:
- Backend server (Python) on port 8000
- Frontend development server (Next.js) on port 3000

Open your browser to `http://localhost:3000` to use the application.

**Note for Linux users:** If you don't have `gnome-terminal`, the script will try to use `xterm`. You can modify `run.sh` to use your preferred terminal emulator.

## Usage

### Basic Playback
1. Upload a MIDI file using the file upload button
2. Click Play to start playback
3. Use the tempo slider to adjust playback speed
4. Use the progress bar to seek to different positions

### Global Keyboard Controls

**The keyboard shortcuts work system-wide** - you don't need to have the app window focused! This means you can control playback while using other applications.

Default keyboard shortcuts:

- **F1** - Play/Resume
- **F2** - Pause/Resume
- **F3** - Stop
- **F4** - Slow Down (-10%)
- **F5** - Speed Up (+10%)
- **F6** - Toggle Sustain
- **F7** - Toggle Velocity

You can customize these bindings in the settings panel.

**Platform Notes:**
- **Windows**: Global keyboard hooks work out of the box (may need to run as Administrator)
- **macOS**: Requires Accessibility and Input Monitoring permissions (see installation instructions)
- **Linux**: Requires user to be in `input` group or run with sudo

## Troubleshooting

### Windows
- **Keyboard shortcuts not working**: Run as Administrator for global keyboard hooks
- **Keys not being sent**: Ensure no antivirus is blocking keyboard simulation
- **Window targeting not working**: Make sure the target window is visible and not minimized

### macOS
- **Keyboard shortcuts not working**: 
  - Grant Accessibility permissions: System Preferences → Security & Privacy → Privacy → Accessibility
  - Grant Input Monitoring permissions: System Preferences → Security & Privacy → Privacy → Input Monitoring
  - Add Terminal (or your terminal app) to both lists
  - Restart Terminal after granting permissions
- **Permission denied errors**: Run `chmod +x *.sh` to make scripts executable
- **Python not found**: Install Python 3.8+ from python.org or use Homebrew: `brew install python3`

### Linux
- **Keyboard shortcuts not working**:
  - Add user to input group: `sudo usermod -a -G input $USER`
  - Log out and log back in
  - Or run with sudo: `sudo python3 scripts/main.py`
- **Terminal not opening**: Install gnome-terminal or xterm: `sudo apt install gnome-terminal`
- **Permission errors**: Run `chmod +x *.sh` to make scripts executable
- **Python not found**: Install Python 3.8+: `sudo apt install python3 python3-pip`

### General Issues
- **WebSocket connection failed**: Make sure the backend server is running on port 8000
- **MIDI file won't upload**: Check file size (max 10MB) and format (.mid or .midi)
- **No MIDI devices found**: Ensure MIDI devices are connected and drivers are installed
- **Playback stuttering**: Try reducing tempo or closing other applications

## Key Mapping

### Main Sequence (Notes 36-99)
\`\`\`
1!2@34$5%6^78*9(0qQwWeErtTyYuiIoOpPasSdDfgGhHjJklLzZxcCvVbBnm
\`\`\`

### Low Notes (Below 36)
Uses Ctrl modifier with keys: `1234567890qwert`

### High Notes (Above 99)
Uses Ctrl modifier with keys: `yuiopasdfghj`

### Velocity Mapping
When velocity is enabled, uses Alt modifier with keys: `1234567890qwertyuiopasdfghjklzxc`

## Configuration

Configuration is stored in `config.json` and includes:
- Tempo settings
- Sustain/velocity enable states
- Keyboard bindings
- Window targeting preferences
- MIDI output settings

## API Endpoints

### Playback Control
- `POST /api/upload` - Upload MIDI file
- `POST /api/play` - Start/resume playback
- `POST /api/pause` - Pause playback
- `POST /api/stop` - Stop playback
- `POST /api/seek` - Seek to position

### Settings
- `POST /api/tempo` - Set tempo (25-200%)
- `POST /api/sustain` - Toggle sustain
- `POST /api/velocity` - Toggle velocity
- `POST /api/window-target` - Set target window
- `POST /api/midi-output` - Toggle MIDI output

### Information
- `GET /api/info` - Get current status
- `GET /api/windows` - List available windows
- `GET /api/midi-devices` - List MIDI devices
- `WS /ws` - WebSocket for real-time updates

## Development

### Frontend Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Backend Development
\`\`\`bash
python scripts/main.py
\`\`\`

The backend runs on port 8000, and the frontend development server runs on port 3000.

## License

Open Source - See LICENSE file for details

## Credits

Inspired by nanoMIDI - A MIDI macro player for rhythm games
