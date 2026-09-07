@echo off
title SC Bridge + ngrok
color 0A

timeout /t 8 /nobreak >nul

cd /d "%USERPROFILE%\Desktop\sc-bridge"
if not exist sc_bridge.js (
    echo [ERREUR] sc_bridge.js introuvable
    pause
    exit /b 1
)

echo ============================================================
echo   SC BRIDGE + NGROK - DEMARRAGE AUTOMATIQUE
echo ============================================================
echo.

if not exist package.json (
    echo {"type":"module"} > package.json
)
if not exist node_modules\ws (
    echo [INSTALL] npm install ws...
    npm install ws --save --prefix . >nul 2>&1
)

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/2] Demarrage SC Bridge...
start "" /B node "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.js" > "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.log" 2>&1
timeout /t 3 /nobreak >nul

:: ─── Trouver ngrok.exe ────────────────────────────────────────────────────────
echo [2/2] Recherche ngrok.exe...
set NGROK_EXE=

if exist "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
if defined NGROK_EXE goto :run_ngrok

if exist "%USERPROFILE%\Desktop\ngrok.exe" set NGROK_EXE=%USERPROFILE%\Desktop\ngrok.exe
if defined NGROK_EXE goto :run_ngrok

if exist "C:\ngrok\ngrok.exe" set NGROK_EXE=C:\ngrok\ngrok.exe
if defined NGROK_EXE goto :run_ngrok

if exist "C:\Program Files\ngrok\ngrok.exe" set "NGROK_EXE=C:\Program Files\ngrok\ngrok.exe"
if defined NGROK_EXE goto :run_ngrok

where ngrok >nul 2>&1
if not errorlevel 1 (set NGROK_EXE=ngrok & goto :run_ngrok)

if exist "%USERPROFILE%\Downloads\ngrok.exe" (
    copy "%USERPROFILE%\Downloads\ngrok.exe" "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" >nul
    set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
    goto :run_ngrok
)

:: Recherche recursive sur C:\
echo   Scan C:\... (peut prendre 30 secondes)
for /f "delims=" %%i in ('dir /s /b "C:\ngrok.exe" 2^>nul') do (
    set NGROK_EXE=%%i
    goto :found_c
)
:found_c
if defined NGROK_EXE (
    echo   [TROUVE] %NGROK_EXE%
    goto :run_ngrok
)

:: ngrok absent — telechargement automatique
echo   [INFO] ngrok absent. Telechargement en cours...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile '$env:TEMP\ngrok.zip' -UseBasicParsing; Expand-Archive -Path '$env:TEMP\ngrok.zip' -DestinationPath '$env:USERPROFILE\Desktop\sc-bridge' -Force; Write-Host '[OK] ngrok.exe telecharge' } catch { Write-Host '[ERREUR] Telechargement echoue:' $_.Exception.Message }"

if exist "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" (
    set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
    goto :run_ngrok
)

echo.
echo ============================================================
echo   [ERREUR] Impossible de trouver ou telecharger ngrok.exe
echo ============================================================
echo   Placez ngrok.exe dans : %USERPROFILE%\Desktop\sc-bridge\
echo   Telechargez depuis    : https://ngrok.com/download
echo ============================================================
goto :show_status

:run_ngrok
echo   [OK] ngrok : %NGROK_EXE%
start "" /B "%NGROK_EXE%" http --url=hatbox-placidly-crabmeat.ngrok-free.dev 8766 > "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>&1
timeout /t 6 /nobreak >nul
echo.
echo --- LOG NGROK ---
type "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>nul
echo --- FIN LOG ---

:show_status
echo.
echo ============================================================
echo   Bridge local  : http://localhost:8766/health
echo   Tunnel ngrok  : https://hatbox-placidly-crabmeat.ngrok-free.dev/health
echo   Log bridge    : %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo   Log ngrok     : %USERPROFILE%\Desktop\sc-bridge\ngrok.log
echo ============================================================
echo.
echo Cette fenetre se ferme dans 25 secondes.
timeout /t 25 /nobreak >nul
