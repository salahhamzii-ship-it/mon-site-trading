@echo off
echo Installation SC Bridge au démarrage Windows...
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS=C:\SierraChart_CME\Data\start_bridge.vbs
copy /Y "%VBS%" "%STARTUP%\start_bridge.vbs"
if %errorlevel% == 0 (
    echo OK — SC Bridge demarrera automatiquement.
) else (
    echo ERREUR — verifier que start_bridge.vbs existe.
)
pause
