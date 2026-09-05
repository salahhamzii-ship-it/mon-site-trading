@echo off
title SC Bridge + Tunnel
color 0A

:: Attendre que le reseau soit pret
timeout /t 8 /nobreak >nul

cd /d "%USERPROFILE%\Desktop\sc-bridge"
if not exist sc_bridge.js (
    echo [ERREUR] sc_bridge.js introuvable
    echo Lancez d'abord install.bat
    pause
    exit /b 1
)

echo ============================================================
echo   SC BRIDGE + LOCALTUNNEL - DEMARRAGE
echo ============================================================
echo.

:: Tuer anciens processus
taskkill /F /IM node.exe >nul 2>&1

echo [1/2] Demarrage SC Bridge (Node.js :8766)...
start "" /B node sc_bridge.js > sc_bridge.log 2>&1
timeout /t 3 /nobreak >nul

echo [2/2] Demarrage tunnel public (sc-bridge.loca.lt)...
where lt >nul 2>&1
if %errorlevel% neq 0 (
    echo    Installation localtunnel...
    call npm install -g localtunnel >nul 2>&1
)
start "" /B lt --port 8766 --subdomain sc-bridge > lt_tunnel.log 2>&1

timeout /t 5 /nobreak >nul
echo.
echo ============================================================
echo   STATUT
echo ============================================================
echo   Bridge local  : http://localhost:8766/health
echo   URL publique  : https://sc-bridge.loca.lt/health
echo   Log bridge    : %CD%\sc_bridge.log
echo   Log tunnel    : %CD%\lt_tunnel.log
echo ============================================================
echo.
echo Services actifs. Ne pas fermer cette fenetre.
echo.
pause
