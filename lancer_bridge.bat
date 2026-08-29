@echo off
title SC Bridge - Trading
echo ================================================
echo   SC Bridge - Mise a jour et lancement
echo ================================================
echo.

:: Dossier du .bat
set "DIR=%~dp0"

echo [1/2] Telechargement de la derniere version du bridge...
curl -s -o "%DIR%sc_bridge.py" "https://raw.githubusercontent.com/salahhamzii-ship-it/mon-site-trading/main/sc_bridge.py"
if errorlevel 1 (
    echo    ERREUR telechargement - utilisation de la version locale
) else (
    echo    OK - bridge mis a jour
)

echo.
echo [2/2] Lancement du bridge (WebSocket port 8765)...
echo    Gardez cette fenetre ouverte pendant le trading
echo    Fermez-la pour arreter le bridge
echo.
echo ================================================
echo.

python "%DIR%sc_bridge.py"

echo.
echo Bridge arrete.
pause
