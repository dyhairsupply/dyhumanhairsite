@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DY Deyu - Local Preview

where python >nul 2>nul
if not errorlevel 1 goto RUN_PY
where py >nul 2>nul
if not errorlevel 1 goto RUN_PYLAUNCHER
goto NO_PYTHON

:RUN_PY
start "DY Deyu Preview Server" /min python tools\serve.py 8000
goto OPEN

:RUN_PYLAUNCHER
start "DY Deyu Preview Server" /min py tools\serve.py 8000
goto OPEN

:OPEN
timeout /t 2 >nul
start "" http://localhost:8000/
echo.
echo   DY Deyu preview:  http://localhost:8000/
echo   The server runs in a minimized window. Close that window to stop it.
echo.
timeout /t 6 >nul
exit /b

:NO_PYTHON
echo.
echo   Python 3 was not found on this computer.
echo   Option 1: install Python 3 from https://www.python.org/downloads/ and run this file again.
echo   Option 2: just double-click index.html - it opens in offline preview mode.
echo.
pause
