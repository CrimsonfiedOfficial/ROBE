@echo off
title ROBE MIDI Player Frontend

REM Ensure we are in the correct project folder
cd /d %~dp0

echo Starting frontend (Next.js) in a new window...
start "" cmd /k "cd /d %~dp0 && npm install && npm run dev"

REM Exit this batch file immediately
exit
