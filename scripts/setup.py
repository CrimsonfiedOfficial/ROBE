#!/usr/bin/env python3
"""
Setup script for ROBE MIDI Player
This script installs dependencies and provides setup instructions
"""

import subprocess
import sys
import os
import platform

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version}")
    return True

def install_requirements():
    """Install required packages"""
    print("\n📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_system_requirements():
    """Check system-specific requirements"""
    system = platform.system()
    print(f"\n🖥️  System: {system}")
    
    if system == "Linux":
        print("📝 Note: On Linux, you may need to install additional packages:")
        print("   sudo apt-get install python3-tk python3-dev")
        print("   For keyboard simulation, you may need to run with sudo")
    elif system == "Darwin":  # macOS
        print("📝 Note: On macOS, you may need to grant accessibility permissions")
        print("   Go to System Preferences > Security & Privacy > Privacy > Accessibility")
        print("   Add your terminal application to the list")
    elif system == "Windows":
        print("📝 Note: On Windows, keyboard simulation should work without additional setup")
    
    return True

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    os.makedirs("uploads", exist_ok=True)
    print("✅ Created uploads directory")

def print_usage_instructions():
    """Print usage instructions"""
    print("\n" + "="*60)
    print("🎹 ROBE MIDI Player Setup Complete!")
    print("="*60)
    print("\n📋 How to use:")
    print("1. Start the backend server:")
    print("   python run_server.py")
    print("\n2. In another terminal, start the frontend:")
    print("   cd .. (go back to project root)")
    print("   npm run dev")
    print("\n3. Open your browser to:")
    print("   http://localhost:3000")
    print("\n4. Upload a MIDI file and start playing!")
    print("\n⚠️  Important Notes:")
    print("- Make sure both frontend (port 3000) and backend (port 8000) are running")
    print("- The app will simulate keyboard presses, so focus the target application")
    print("- MIDI notes are mapped to QWERTY keys (C4=A, D4=S, E4=D, etc.)")
    print("- Use tempo control to speed up or slow down playback")

def main():
    """Main setup function"""
    print("🚀 Setting up ROBE MIDI Player...")
    
    if not check_python_version():
        return False
    
    if not install_requirements():
        return False
    
    check_system_requirements()
    create_directories()
    print_usage_instructions()
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ Setup completed successfully!")
        else:
            print("\n❌ Setup failed. Please check the errors above.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error during setup: {e}")
        sys.exit(1)
