#!/bin/bash

echo "Installing requirements with pre-compiled wheels..."
pip3 install --only-binary=all -r scripts/requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed with binary-only install, trying with build tools..."
    pip3 install -r scripts/requirements.txt
fi
read -p "Press Enter to continue..."
