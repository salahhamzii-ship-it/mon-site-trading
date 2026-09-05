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

:: Chercher cloudflared
set CF_EXE=C:\cloudflared\cloudflared.exe
if not exist "%CF_EXE%" set CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe
if not exist "%CF_EXE%" (
    for /f "delims=" %%f in ('where cloudflared 2^>nul') do set CF_EXE=%%f
)
set CF_CONFIG=%USERPROFILE%\.cloudflared\config.yml

echo ============================================================
echo   SC BRIDGE + CLOUDFLARE TUNNEL - DEMARRAGE
echo ============================================================
echo.
echo [1/2] Demarrage SC Bridge (Node.js :8766)...
start "" /B node sc_bridge.js > sc_bridge.log 2>&1
timeout /t 3 /nobreak >nul

echo [2/2] Demarrage tunnel Cloudflare...
if exist "%CF_EXE%" (
    if exist "%CF_CONFIG%" (
        start "" /B "%CF_EXE%" tunnel --config "%CF_CONFIG%" run sc-bridge > cf_tunnel.log 2>&1
        echo    URL: https://sc-bridge.cfargotunnel.com
    ) else (
        echo [WARN] config.yml absent - lancer cloudflared_setup.bat d'abord
    )
) else (
    echo [WARN] cloudflared.exe absent - lancer cloudflared_setup.bat d'abord
)

timeout /t 5 /nobreak >nul
echo.
echo ============================================================
echo   STATUT
echo ============================================================
echo   Bridge local  : http://localhost:8766/health
echo   URL publique  : https://sc-bridge.cfargotunnel.com/health
echo   Log bridge    : %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo   Log tunnel    : %USERPROFILE%\Desktop\sc-bridge\cf_tunnel.log
echo ============================================================
echo.
echo Services actifs. Ne pas fermer cette fenetre.
echo Pour arreter: fermer cette fenetre ou Ctrl+C
echo.
pause
