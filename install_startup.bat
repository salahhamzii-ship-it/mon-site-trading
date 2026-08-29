@echo off
echo ================================================
echo   SETUP COMPLET SC BRIDGE
echo ================================================
echo.

set "REPO=C:\mon-site-trading"
set "SC_DATA=C:\SierraChart_CME\Data"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%REPO%\lancer_bridge.bat"

:: 0 — git pull pour avoir la derniere version
echo [0/6] Mise a jour depuis GitHub...
cd /d "%REPO%"
git pull origin main
echo       OK — code a jour

:: 1 — Installer dependances Python
echo [1/6] Installation dependances Python...
python -m pip install websockets pytz --quiet --no-warn-script-location
echo       OK — websockets + pytz installes

:: 2 — Copier sc_bridge.py vers SierraChart
if not exist "%SC_DATA%\" mkdir "%SC_DATA%"
copy /Y "%REPO%\sc_bridge.py" "%SC_DATA%\sc_bridge.py" >nul
echo [2/6] sc_bridge.py copie dans SierraChart... OK

:: 3 — Copier start_bridge.vbs vers SierraChart
copy /Y "%REPO%\start_bridge.vbs" "%SC_DATA%\start_bridge.vbs" >nul
echo [3/6] start_bridge.vbs copie... OK

:: 4 — Installer dans Startup Windows
copy /Y "%SC_DATA%\start_bridge.vbs" "%STARTUP%\start_bridge.vbs" >nul
echo [4/6] Startup Windows configure... OK

:: 5 — Enregistrer le protocole scbridge://
reg add "HKCU\Software\Classes\scbridge" /ve /d "URL:SC Bridge Protocol" /f >nul
reg add "HKCU\Software\Classes\scbridge" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\scbridge\DefaultIcon" /ve /d "%SystemRoot%\system32\cmd.exe,0" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open\command" /ve /d "\"%LAUNCHER%\"" /f >nul
echo [5/6] Protocole scbridge:// enregistre... OK

:: 6 — Tuer l'ancien bridge et relancer
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul
start "" wscript "%SC_DATA%\start_bridge.vbs"
echo [6/6] Bridge lance en arriere-plan...

timeout /t 5 >nul
tasklist /fi "imagename eq python.exe" 2>nul | find /i "python.exe" >nul
if %errorlevel% == 0 (
    echo.
    echo ================================================
    echo   SUCCES — Bridge actif sur port 8765
    echo   Rechargez le calculateur dans 10 secondes.
    echo ================================================
) else (
    echo.
    echo ================================================
    echo   ATTENTION — python.exe ne tourne pas.
    echo   Verifiez que Python est installe :
    echo   https://www.python.org/downloads/
    echo   Cochez "Add Python to PATH"
    echo ================================================
)
echo.
pause
