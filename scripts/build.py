import os
import shutil
import subprocess
import sys
import base64
import json
from pathlib import Path

def find_npm():
    """Find npm executable on the system."""
    # Try common npm locations
    npm_commands = ["npm", "npm.cmd"]
    
    for npm_cmd in npm_commands:
        try:
            result = subprocess.run([npm_cmd, "--version"], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return npm_cmd
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            continue
    
    # Check common installation paths on Windows
    if sys.platform == "win32":
        common_paths = [
            os.path.expanduser("~\\AppData\\Roaming\\npm\\npm.cmd"),
            "C:\\Program Files\\nodejs\\npm.cmd",
            "C:\\Program Files (x86)\\nodejs\\npm.cmd",
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                return path
    
    return None

def build_application():
    """Build the complete MIDI player application for distribution."""
    print("🎵 Building ROBE MIDI Player...")
    
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Clean previous builds
    if os.path.exists("dist"):
        shutil.rmtree("dist")
    if os.path.exists("build"):
        shutil.rmtree("build")
    
    # Create dist directory
    os.makedirs("dist", exist_ok=True)
    
    npm_cmd = find_npm()
    if not npm_cmd:
        print("❌ npm not found! Please install Node.js from https://nodejs.org/")
        print("   Make sure npm is in your system PATH")
        return False
    
    print(f"✅ Found npm: {npm_cmd}")
    
    if not os.path.exists("package.json"):
        print("❌ package.json not found! Make sure you're in the project root directory")
        return False
    
    # Build Next.js frontend
    print("📦 Building frontend...")
    try:
        print("📥 Installing frontend dependencies...")
        subprocess.run([npm_cmd, "install"], check=True, cwd=".")
        
        subprocess.run([npm_cmd, "run", "build"], check=True, cwd=".")
        
        embed_frontend_files()
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Frontend build failed: {e}")
        print("   Make sure you have Node.js installed and package.json is configured correctly")
        return False
    
    print("🐍 Building backend with Nuitka (secure compilation)...")
    try:
        # Install Nuitka if not present
        try:
            import nuitka
        except ImportError:
            print("📥 Installing Nuitka...")
            subprocess.run([sys.executable, "-m", "pip", "install", "nuitka"], check=True)
        
        scripts_dir = project_root / "scripts"
        os.chdir(scripts_dir)
        
        # Build with Nuitka - single file with embedded frontend
        nuitka_args = [
            sys.executable, "-m", "nuitka",
            "--standalone",
            "--onefile",
            "--output-dir=../dist",
            "--output-filename=midi_player",
            "--include-data-files=config.json=config.json",
            "--include-data-files=embedded_frontend.py=embedded_frontend.py",
            "--enable-plugin=anti-bloat",
            "--assume-yes-for-downloads",
            "--warn-implicit-exceptions",
            "--warn-unusual-code",
            "--remove-output",
            "main.py"
        ]
        
        # Add Windows-specific optimizations
        if sys.platform == "win32":
            nuitka_args.extend([
                "--windows-console-mode=disable",
            ])
            # Add icon if it exists
            icon_path = project_root / "public" / "favicon.ico"
            if icon_path.exists():
                nuitka_args.append(f"--windows-icon-from-ico={icon_path}")
        
        # Remove empty args
        nuitka_args = [arg for arg in nuitka_args if arg]
        
        subprocess.run(nuitka_args, check=True)
        
        # Verify executable was created
        exe_name = "midi_player.exe" if sys.platform == "win32" else "midi_player"
        exe_path = project_root / "dist" / exe_name
        
        if not exe_path.exists():
            print("❌ Backend build failed - executable not found")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Backend build failed: {e}")
        return False
    
    os.chdir(project_root)
    
    # Create distribution README
    create_distribution_readme()
    
    print("✅ Build complete! Single executable created.")
    print("📁 Distribution files:")
    for item in os.listdir("dist"):
        print(f"   - {item}")
    
    return True

def embed_frontend_files():
    """Embed all frontend files into a Python module for single executable."""
    print("🔗 Embedding frontend files into executable...")
    
    frontend_files = {}
    build_dir = Path(".next")
    
    if not build_dir.exists():
        print("❌ Next.js build directory not found")
        return False
    
    # Collect all built files
    for file_path in build_dir.rglob("*"):
        if file_path.is_file():
            relative_path = file_path.relative_to(build_dir)
            
            # Read file content
            try:
                if file_path.suffix in ['.js', '.css', '.html', '.json', '.txt']:
                    # Text files
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    frontend_files[str(relative_path)] = {
                        'type': 'text',
                        'content': content
                    }
                else:
                    # Binary files
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    frontend_files[str(relative_path)] = {
                        'type': 'binary',
                        'content': base64.b64encode(content).decode('utf-8')
                    }
            except Exception as e:
                print(f"⚠️ Skipping file {file_path}: {e}")
    
    # Also include static files
    static_dir = Path("public")
    if static_dir.exists():
        for file_path in static_dir.rglob("*"):
            if file_path.is_file():
                relative_path = Path("static") / file_path.relative_to(static_dir)
                
                try:
                    if file_path.suffix in ['.js', '.css', '.html', '.json', '.txt', '.svg']:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        frontend_files[str(relative_path)] = {
                            'type': 'text',
                            'content': content
                        }
                    else:
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        frontend_files[str(relative_path)] = {
                            'type': 'binary',
                            'content': base64.b64encode(content).decode('utf-8')
                        }
                except Exception as e:
                    print(f"⚠️ Skipping static file {file_path}: {e}")
    
    # Create embedded frontend module
    embedded_content = f'''# Embedded frontend files for ROBE MIDI Player
import base64
import os
from pathlib import Path

FRONTEND_FILES = {json.dumps(frontend_files, indent=2)}

def extract_frontend_files(extract_dir="temp_frontend"):
    """Extract embedded frontend files to temporary directory."""
    extract_path = Path(extract_dir)
    extract_path.mkdir(exist_ok=True)
    
    for file_path, file_data in FRONTEND_FILES.items():
        full_path = extract_path / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        if file_data['type'] == 'text':
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(file_data['content'])
        else:
            with open(full_path, 'wb') as f:
                f.write(base64.b64decode(file_data['content']))
    
    return str(extract_path)

def get_file_content(file_path):
    """Get content of embedded file."""
    if file_path in FRONTEND_FILES:
        file_data = FRONTEND_FILES[file_path]
        if file_data['type'] == 'text':
            return file_data['content']
        else:
            return base64.b64decode(file_data['content'])
    return None
'''
    
    with open("embedded_frontend.py", "w", encoding='utf-8') as f:
        f.write(embedded_content)
    
    print(f"✅ Embedded {len(frontend_files)} frontend files")
    return True

def create_distribution_readme():
    """Create README for end users."""
    readme_content = '''# ROBE MIDI Player

A powerful MIDI file player with real-time controls and keyboard simulation.

## Quick Start

### Windows
1. Double-click `midi_player.exe`
2. The web interface will open automatically in your browser
3. Upload a MIDI file and start playing!

### Linux/Mac
1. Run `./midi_player` in terminal
2. The web interface will open automatically in your browser
3. Upload a MIDI file and start playing!

## Features

- 🎹 MIDI file playback with real-time controls
- ⌨️ Keyboard simulation for games and applications
- 🎚️ Real-time tempo and velocity control
- 🎯 Window targeting for focused playback
- 🔄 Sustain and velocity toggles
- ⏯️ Play, pause, stop, and seek controls
- 🎵 Direct MIDI output support

## Global Hotkeys

- Space: Play/Pause
- Ctrl+S: Stop
- Ctrl+R: Restart
- Ctrl+↑/↓: Adjust tempo
- Ctrl+Shift+↑/↓: Adjust velocity

## Single Executable

This is a completely standalone application:
- No installation required
- No Python or Node.js needed
- All web files embedded in the executable
- Settings saved automatically

## Troubleshooting

- If the web interface doesn't open automatically, navigate to http://localhost:8000
- Make sure no other applications are using port 8000
- For MIDI output, ensure you have MIDI devices available on your system

## Support

This is a compiled version of ROBE MIDI Player. 
For support, contact the developer.
'''
    
    with open("dist/README.txt", "w") as f:
        f.write(readme_content)

if __name__ == "__main__":
    if build_application():
        print("\n🎉 Build successful!")
        print("📦 Your application is ready for distribution in the 'dist' folder.")
        print("🚀 Users can run it without needing Python, Node.js, or any dependencies!")
        print("🔒 Code is compiled to machine code with embedded frontend!")
        print("📱 Single executable file - just double-click to run!")
    else:
        print("\n❌ Build failed. Check the errors above.")
        sys.exit(1)
