@echo off
setlocal
title UQUDCM Visual Lab
set "LAB_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%LAB_PYTHON%" (
  "%LAB_PYTHON%" "%~dp0start-lab.py"
  exit /b
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0start-lab.py"
  exit /b
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0start-lab.py"
  exit /b
)
echo Python 3 was not found. Install Python 3 and run this file again.
pause
exit /b 1
