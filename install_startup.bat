@echo off
echo ================================================
echo   SETUP COMPLET SC BRIDGE
echo ================================================
echo.

set "REPO=%~dp0"
set "SC_DATA=C:\SierraChart_CME\Data"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LAUNCHER=%REPO%lancer_bridge.bat"

:: 1 — Copier sc_bridge.py vers SierraChart
if not exist "%SC_DATA%\" mkdir "%SC_DATA%"
copy /Y "%REPO%sc_bridge.py" "%SC_DATA%\sc_bridge.py" >nul
echo [1/5] sc_bridge.py copie dans SierraChart... OK

:: 2 — Copier start_bridge.vbs vers SierraChart
copy /Y "%REPO%start_bridge.vbs" "%SC_DATA%\start_bridge.vbs" >nul
echo [2/5] start_bridge.vbs copie dans SierraChart... OK

:: 3 — Installer dans Startup Windows (demarrage automatique)
copy /Y "%SC_DATA%\start_bridge.vbs" "%STARTUP%\start_bridge.vbs" >nul
echo [3/5] Startup Windows configure... OK

:: 4 — Enregistrer le protocole scbridge:// (bouton LANCER BRIDGE)
reg add "HKCU\Software\Classes\scbridge" /ve /d "URL:SC Bridge Protocol" /f >nul
reg add "HKCU\Software\Classes\scbridge" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\scbridge\DefaultIcon" /ve /d "%SystemRoot%\system32\cmd.exe,0" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open\command" /ve /d "\"%LAUNCHER%\"" /f >nul
echo [4/5] Protocole scbridge:// enregistre... OK

:: 5 — Arreter l'ancien bridge si actif, puis relancer proprement
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul
start "" wscript "%SC_DATA%\start_bridge.vbs"
echo [5/5] Bridge Sierra Chart lance en arriere-plan... OK

echo.
echo ================================================
echo   TOUT EST CONFIGURE.
echo   - Bridge demarre maintenant
echo   - Demarrera automatiquement a chaque reboot
echo   - Bouton LANCER BRIDGE actif dans le calculateur
echo.
echo   Attendez 10 secondes puis rechargez le site.
echo ================================================
echo.
timeout /t 10 >nul
