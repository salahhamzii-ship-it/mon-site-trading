@echo off
chcp 65001 >nul
title Migration Bridge NQ

echo.
echo ========================================
echo   MIGRATION BRIDGE NQ
echo   git repo → Desktop\sc-bridge
echo ========================================
echo.

REM --- Chemins ---
set "REPO=%~dp0"
set "DEST=%USERPROFILE%\Desktop\sc-bridge"
set "SRC=%REPO%legacy\sc_bridge.js"

REM --- Vérifications ---
if not exist "%SRC%" (
    echo [ERREUR] Fichier source introuvable :
    echo   %SRC%
    echo Vérifiez que le git pull est fait.
    pause
    exit /b 1
)

if not exist "%DEST%" (
    echo [ERREUR] Dossier cible introuvable :
    echo   %DEST%
    echo Le dossier Desktop\sc-bridge doit exister.
    pause
    exit /b 1
)

echo [1/4] Arrêt du bridge en cours...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8766 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv 2^>nul ^| findstr /i "node"') do (
    taskkill /PID %%~a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo     OK.

echo [2/4] Copie sc_bridge.js...
copy /Y "%SRC%" "%DEST%\sc_bridge.js" >nul
if errorlevel 1 (
    echo [ERREUR] Copie échouée.
    pause
    exit /b 1
)
echo     OK — %DEST%\sc_bridge.js mis à jour.

echo [3/4] npm install dans %DEST%...
cd /d "%DEST%"
call npm install --prefer-offline >nul 2>&1
if errorlevel 1 (
    call npm install >nul 2>&1
)
echo     OK.

echo [4/4] Relancement du bridge...
if exist "%DEST%\start_bridge.bat" (
    start "SC Bridge" /min cmd /c "%DEST%\start_bridge.bat"
) else (
    start "SC Bridge" /min node "%DEST%\sc_bridge.js"
)
timeout /t 3 /nobreak >nul

REM --- Vérification health ---
curl -s --max-time 3 http://localhost:8766/health >nul 2>&1
if not errorlevel 1 (
    echo.
    echo ========================================
    echo   MIGRATION OK
    echo   http://localhost:8766/health répond
    echo   http://localhost:8766/data → vérifier NQ
    echo ========================================
) else (
    echo.
    echo [WARN] Bridge lent à répondre — attendre 10s puis vérifier
    echo   http://localhost:8766/health
)

echo.
pause
