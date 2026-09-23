@echo off
chcp 65001 >nul
title Cockpit NQ — sc_bridge

echo.
echo ========================================
echo   COCKPIT NQ — DEMARRAGE
echo ========================================
echo.

REM --- Vérifier que Node.js est installé ---
where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js introuvable.
    echo Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

REM --- Libérer le port 8766 si occupé ---
echo [1/4] Liberation du port 8766...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8766 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM --- Libérer le port 8765 (WebSocket) ---
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8765 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM --- Lancer sc_bridge.js ---
echo [2/4] Lancement du bridge Sierra Chart...
cd /d "%~dp0"
start "SC Bridge" /min node legacy\sc_bridge.js

REM --- Attendre que le bridge réponde ---
echo [3/4] Attente du bridge (max 10s)...
set /a attempts=0
:wait_loop
timeout /t 1 /nobreak >nul
set /a attempts+=1
curl -s --max-time 2 http://localhost:8766/health >nul 2>&1
if not errorlevel 1 goto bridge_ok
if %attempts% geq 10 goto bridge_timeout
goto wait_loop

:bridge_ok
echo.
echo ========================================
echo   COCKPIT PRET
echo   http://localhost:8766/#/cockpit
echo ========================================
echo.
echo [4/4] Ouverture du navigateur...
start "" "http://localhost:8766/#/cockpit"
echo.
echo Laissez cette fenetre ouverte.
echo Pour arreter : double-cliquez sur STOP-COCKPIT.bat
echo.
goto end

:bridge_timeout
echo.
echo [AVERTISSEMENT] Bridge lent a repondre — verifiez la fenetre SC Bridge.
echo Ouverture du cockpit quand meme...
start "" "http://localhost:8766/#/cockpit"
echo.

:end
pause
