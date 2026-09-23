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

REM --- Installer les dépendances si manquantes ---
if not exist "%~dp0node_modules\ws" (
    echo [DEP] Installation des dependances npm...
    cd /d "%~dp0"
    call npm install --prefer-offline >nul 2>&1
    if errorlevel 1 (
        echo [DEP] npm install echoue — nouvelle tentative en ligne...
        call npm install >nul 2>&1
        if errorlevel 1 (
            echo [ERREUR] npm install a echoue. Verifiez votre connexion internet.
            pause
            exit /b 1
        )
    )
    echo [DEP] OK — ws installe.
) else (
    echo [DEP] Dependances presentes.
)

REM --- Libérer le port 8766 (tuer TOUS les process node + python sur ce port) ---
echo [PORTS] Liberation du port 8766...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8766 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
REM Tuer aussi nq_bridge.py qui pourrait occuper 8766
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /fo csv 2^>nul') do (
    taskkill /PID %%~a /F >nul 2>&1
)
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq pythonw.exe" /fo csv 2^>nul') do (
    taskkill /PID %%~a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM --- Vérifier que 8766 est libre ---
netstat -aon 2>nul | findstr ":8766 " >nul 2>&1
if not errorlevel 1 (
    echo [WARN] Port 8766 encore occupe — attente supplementaire...
    timeout /t 3 /nobreak >nul
)

REM --- Libérer le port 8765 (WebSocket) ---
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8765 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM --- Lancer sc_bridge.js ---
echo [BRIDGE] Lancement du bridge Sierra Chart...
cd /d "%~dp0"
start "SC Bridge" /min node legacy\sc_bridge.js

REM --- Attendre que le bridge réponde ---
echo [WAIT] Attente du bridge (max 15s)...
set /a attempts=0
:wait_loop
timeout /t 1 /nobreak >nul
set /a attempts+=1
curl -s --max-time 2 http://localhost:8766/health >nul 2>&1
if not errorlevel 1 goto bridge_ok
if %attempts% geq 15 goto bridge_timeout
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
echo.
echo   Si vous voyez ERR_INVALID_PACKAGE_CONFIG :
echo   Supprimez le fichier C:\Users\%USERNAME%\package.json
echo   puis relancez ce bat.
echo.
echo Ouverture du cockpit quand meme...
start "" "http://localhost:8766/#/cockpit"
echo.

:end
pause
