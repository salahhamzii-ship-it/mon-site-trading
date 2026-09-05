@echo off
title SC Bridge + Cloudflare Tunnel
color 0A

:: Attendre que le reseau soit pret (utile au demarrage Windows)
timeout /t 8 /nobreak >nul

cd /d "%USERPROFILE%\Desktop\sc-bridge"
if not exist sc_bridge.js (
    echo [ERREUR] sc_bridge.js introuvable dans %USERPROFILE%\Desktop\sc-bridge
    echo Lancez d'abord install.bat
    pause
    exit /b 1
)

:: Lire le token depuis cf_token.txt (cree par cloudflared_setup.bat)
set CF_TOKEN=
if exist cf_token.txt (
    set /p CF_TOKEN=<cf_token.txt
) else (
    echo [ERREUR] cf_token.txt introuvable
    echo Lancez d'abord cloudflared_setup.bat en administrateur
    pause
    exit /b 1
)

:: Creer config.yml pour le tunnel
set CF_CONFIG=%USERPROFILE%\Desktop\sc-bridge\cf_config.yml
(
echo ingress:
echo   - service: http://localhost:8766
) > "%CF_CONFIG%"

:: Chercher cloudflared.exe
set CF_EXE=
for /f "delims=" %%f in ('where cloudflared 2^>nul') do set CF_EXE=%%f
if not defined CF_EXE (
    if exist "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe" (
        set CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe
    )
)

echo ============================================================
echo   SC BRIDGE + CLOUDFLARE TUNNEL - DEMARRAGE
echo ============================================================
echo.
echo [1/2] Demarrage SC Bridge (Node.js :8766)...
start "" /B node sc_bridge.js > sc_bridge.log 2>&1
timeout /t 3 /nobreak >nul

echo [2/2] Demarrage tunnel Cloudflare (tunnel permanent sc-bridge)...
if defined CF_EXE (
    start "" /B "%CF_EXE%" tunnel run --token %CF_TOKEN% --config "%CF_CONFIG%" > cf_tunnel.log 2>&1
    echo    OK - tunnel en cours de connexion...
) else (
    echo [ERREUR] cloudflared.exe introuvable
    echo Installez cloudflared: winget install Cloudflare.cloudflared
)

timeout /t 6 /nobreak >nul
echo.
echo ============================================================
echo   STATUT
echo ============================================================
echo   Bridge local  : http://localhost:8766/health
echo   URL publique  : https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/health
echo   Log bridge    : %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo   Log tunnel    : %USERPROFILE%\Desktop\sc-bridge\cf_tunnel.log
echo ============================================================
echo.
echo Services actifs. Ne pas fermer cette fenetre.
echo Pour arreter: fermer cette fenetre ou Ctrl+C
echo.
pause
