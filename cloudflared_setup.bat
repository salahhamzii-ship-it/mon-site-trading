@echo off
title Cloudflared - Service Windows Auto-Start SC-Bridge
color 0A
echo.
echo ============================================================
echo   INSTALLATION SERVICE WINDOWS CLOUDFLARED SC-BRIDGE
echo ============================================================
echo.

:: Verifier droits admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Lancer en ADMINISTRATEUR
    echo Clic droit sur ce fichier -^> "Executer en tant qu'administrateur"
    pause
    exit /b 1
)

set BRIDGE_DIR=%USERPROFILE%\Desktop\sc-bridge
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"

:: Lire le token depuis cf_token.txt
set CF_TOKEN=
if exist "%BRIDGE_DIR%\cf_token.txt" (
    set /p CF_TOKEN=<"%BRIDGE_DIR%\cf_token.txt"
    echo [OK] Token lu depuis cf_token.txt
) else (
    echo [ERREUR] cf_token.txt introuvable dans %BRIDGE_DIR%
    echo.
    echo Creez le fichier manuellement :
    echo   1. Ouvrez Notepad
    echo   2. Collez votre token cloudflared
    echo   3. Sauvegardez sous : %BRIDGE_DIR%\cf_token.txt
    echo.
    pause
    exit /b 1
)

:: Chercher cloudflared
set CF_EXE=
for /f "delims=" %%f in ('where cloudflared 2^>nul') do set CF_EXE=%%f
if not defined CF_EXE (
    if exist "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe" (
        set CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe
    )
)
if not defined CF_EXE (
    echo [1/2] cloudflared pas trouve - installation via winget...
    winget install Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
    for /f "delims=" %%f in ('where cloudflared 2^>nul') do set CF_EXE=%%f
    if not defined CF_EXE set CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe
) else (
    echo [1/2] cloudflared : %CF_EXE%
)

:: Creer config.yml local
set CF_CONFIG=%BRIDGE_DIR%\cf_config.yml
(
echo ingress:
echo   - service: http://localhost:8766
) > "%CF_CONFIG%"

:: Installer le service Windows cloudflared
echo [2/2] Installation service Windows cloudflared...
"%CF_EXE%" service install %CF_TOKEN%
if %errorlevel% equ 0 (
    echo    Service installe avec succes
) else (
    echo    [INFO] Service peut-etre deja installe
)

:: Copier startup_bridge.bat dans demarrage Windows
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
if exist "%BRIDGE_DIR%\startup_bridge.bat" (
    copy /Y "%BRIDGE_DIR%\startup_bridge.bat" "%STARTUP_DIR%\startup_bridge.bat" >nul
    echo    Demarrage auto: OK
)

echo.
echo ============================================================
echo   INSTALLATION TERMINEE
echo ============================================================
echo.
echo URL PERMANENTE:
echo   https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com
echo.
echo PROCHAINE ETAPE:
echo   Double-cliquez sur startup_bridge.bat sur le Bureau
echo.
pause
