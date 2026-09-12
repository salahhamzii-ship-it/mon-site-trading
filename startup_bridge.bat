@echo off
title SC Bridge + Cloudflared
color 0A

timeout /t 5 /nobreak >nul

cd /d "%USERPROFILE%\Desktop\sc-bridge"
if not exist sc_bridge.js (
    echo [ERREUR] sc_bridge.js introuvable dans %USERPROFILE%\Desktop\sc-bridge\
    pause
    exit /b 1
)

echo ============================================================
echo   SC BRIDGE + CLOUDFLARED - DEMARRAGE
echo ============================================================

if not exist package.json (
    echo {"type":"module"} > package.json
)
if not exist node_modules\ws (
    echo [INSTALL] npm install ws...
    npm install ws --save --prefix . >nul 2>&1
)
if not exist node_modules\@ngrok (
    echo [INSTALL] npm install @ngrok/ngrok ^(tunnel auto^)...
    npm install @ngrok/ngrok --save --prefix . >nul 2>&1
)

:: Tuer anciennes instances Node uniquement (pas cloudflared = service Windows)
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/2] Demarrage SC Bridge (Node.js port 8766)...
start "" /B node "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.js" > "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.log" 2>&1
timeout /t 3 /nobreak >nul

echo [2/2] Verification tunnel cloudflared...

:: Cloudflared installé comme service Windows — doit être auto-démarré
sc query cloudflared >nul 2>&1
if %errorlevel% equ 0 (
    :: Service existe — vérifier s'il tourne
    for /f "tokens=3" %%s in ('sc query cloudflared ^| findstr "STATE"') do set CF_STATE=%%s
    if /i "%CF_STATE%"=="RUNNING" (
        echo   [OK] Service cloudflared ACTIF
        goto :tunnel_ok
    ) else (
        echo   [START] Service cloudflared arrete — demarrage...
        net start cloudflared >nul 2>&1
        timeout /t 3 /nobreak >nul
        echo   [OK] Service cloudflared demarre
        goto :tunnel_ok
    )
) else (
    echo   [INFO] Service cloudflared non installe — tentative directe...
)

:: Fallback: lancer cloudflared.exe directement si disponible
set CF_EXE=
if exist "%USERPROFILE%\Desktop\sc-bridge\cloudflared.exe" set CF_EXE=%USERPROFILE%\Desktop\sc-bridge\cloudflared.exe
if not defined CF_EXE (
    if exist "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe" set "CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe"
)
if not defined CF_EXE (
    where cloudflared >nul 2>&1
    if not errorlevel 1 set CF_EXE=cloudflared
)

if defined CF_EXE (
    echo   [START] Lancement cloudflared tunnel...
    if exist "%USERPROFILE%\Desktop\sc-bridge\cf_token.txt" (
        set /p CF_TOKEN=<"%USERPROFILE%\Desktop\sc-bridge\cf_token.txt"
        start "" /B "%CF_EXE%" tunnel run --token !CF_TOKEN! > "%USERPROFILE%\Desktop\sc-bridge\cf.log" 2>&1
    ) else (
        start "" /B "%CF_EXE%" tunnel --url http://localhost:8766 > "%USERPROFILE%\Desktop\sc-bridge\cf.log" 2>&1
    )
    timeout /t 5 /nobreak >nul
    echo   [OK] cloudflared lance
    goto :tunnel_ok
)

:: Fallback ngrok si cloudflared absent
echo   [FALLBACK] cloudflared absent — recherche ngrok...
set NGROK_EXE=
if exist "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
if not defined NGROK_EXE (
    where ngrok >nul 2>&1
    if not errorlevel 1 set NGROK_EXE=ngrok
)
if defined NGROK_EXE (
    start "" /B "%NGROK_EXE%" http --url=hatbox-placidly-crabmeat.ngrok-free.dev 8766 > "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>&1
    timeout /t 5 /nobreak >nul
    echo   [OK] ngrok lance
    goto :tunnel_ok
)

echo.
echo [ERREUR] Aucun tunnel disponible.
echo   - cloudflared service non installe
echo   - cloudflared.exe absent
echo   - ngrok.exe absent
echo.
echo   SOLUTION: Double-cliquer sur cloudflared_setup.bat (Admin)
echo.

:tunnel_ok
echo.
echo ============================================================
echo   STATUT
echo ============================================================
echo   Bridge local    : http://localhost:8766/health
echo   Tunnel CF       : https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/health
echo   Log bridge      : %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo ============================================================
echo.
echo Fermeture dans 15 secondes.
timeout /t 15 /nobreak >nul
