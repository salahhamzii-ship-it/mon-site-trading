@echo off
title Cloudflared - Installation & Tunnel SC-Bridge
color 0A
echo.
echo ============================================================
echo   INSTALLATION CLOUDFLARED + TUNNEL PERMANENT SC-BRIDGE
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

set INSTALL_DIR=C:\cloudflared
set CF_EXE=%INSTALL_DIR%\cloudflared.exe
set CF_MSI=%TEMP%\cloudflared.msi
set BRIDGE_DIR=%USERPROFILE%\Desktop\sc-bridge
set CONFIG_DIR=%USERPROFILE%\.cloudflared

:: Etape 1 - Creer dossier
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

echo [1/5] Telechargement cloudflared...
powershell -NoProfile -Command ^
  "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi' -OutFile '%CF_MSI%' -UseBasicParsing; Write-Host 'OK' } catch { Write-Host 'ERREUR:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo [ERREUR] Echec telechargement. Verifiez votre connexion internet.
    pause
    exit /b 1
)

echo [2/5] Installation cloudflared...
msiexec /i "%CF_MSI%" /quiet /norestart INSTALLDIR="%INSTALL_DIR%"
timeout /t 5 /nobreak >nul

:: Chercher cloudflared.exe (le MSI peut le mettre dans Program Files)
if not exist "%CF_EXE%" (
    for /f "delims=" %%f in ('where cloudflared 2^>nul') do set CF_EXE=%%f
)
if not exist "%CF_EXE%" (
    if exist "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe" (
        set CF_EXE=C:\Program Files\Cloudflare\cloudflared\cloudflared.exe
    )
)
echo    cloudflared : %CF_EXE%

:: Ajouter au PATH pour cette session
set PATH=%INSTALL_DIR%;%PATH%

echo [3/5] Connexion a votre compte Cloudflare...
echo.
echo *** UNE PAGE WEB VA S'OUVRIR ***
echo *** Connectez-vous avec : salahhamzii@gmail.com ***
echo *** Autorisez le certificat puis revenez ici ***
echo.
pause
"%CF_EXE%" tunnel login
if %errorlevel% neq 0 (
    echo [ERREUR] Echec connexion Cloudflare.
    pause
    exit /b 1
)

echo [4/5] Creation du tunnel permanent "sc-bridge"...
"%CF_EXE%" tunnel create sc-bridge
if %errorlevel% neq 0 (
    echo [INFO] Le tunnel existe peut-etre deja - on continue...
)

:: Recuperer l'ID du tunnel
for /f "tokens=*" %%i in ('"%CF_EXE%" tunnel list 2^>nul ^| findstr /i "sc-bridge"') do set TUNNEL_LINE=%%i
echo    Tunnel : %TUNNEL_LINE%

:: Creer config.yml
echo [5/5] Generation config.yml...
(
echo tunnel: sc-bridge
echo credentials-file: %CONFIG_DIR%\sc-bridge.json
echo.
echo ingress:
echo   - hostname: sc-bridge.cfargotunnel.com
echo     service: http://localhost:8766
echo   - service: http_status:404
) > "%CONFIG_DIR%\config.yml"

echo.
echo ============================================================
echo   CREATION DEMARRAGE AUTOMATIQUE
echo ============================================================

:: Creer startup_bridge.bat sur le bureau
(
echo @echo off
echo title SC Bridge + Cloudflare Tunnel
echo color 0A
echo cd /d "%%USERPROFILE%%\Desktop\sc-bridge"
echo echo Demarrage SC Bridge Node.js...
echo start "" /B node sc_bridge.js ^> sc_bridge.log 2^>^&1
echo timeout /t 3 /nobreak ^>nul
echo echo Demarrage tunnel Cloudflare...
echo start "" /B "%CF_EXE%" tunnel --config "%CONFIG_DIR%\config.yml" run sc-bridge ^> cf_tunnel.log 2^>^&1
echo echo.
echo echo SC Bridge: http://localhost:8766/health
echo echo Tunnel   : https://sc-bridge.cfargotunnel.com/health
echo echo.
echo echo Logs: %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo echo Fermer cette fenetre pour arreter les services
echo pause
) > "%USERPROFILE%\Desktop\startup_bridge.bat"

:: Copier dans demarrage Windows (shell:startup)
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /Y "%USERPROFILE%\Desktop\startup_bridge.bat" "%STARTUP_DIR%\startup_bridge.bat" >nul
echo    Demarrage auto: %STARTUP_DIR%\startup_bridge.bat

echo.
echo ============================================================
echo   INSTALLATION TERMINEE
echo ============================================================
echo.
echo FICHIERS CREES:
echo   - %CONFIG_DIR%\config.yml
echo   - %USERPROFILE%\Desktop\startup_bridge.bat
echo   - %STARTUP_DIR%\startup_bridge.bat (demarrage auto)
echo.
echo PROCHAINES ETAPES:
echo   1. Double-cliquez sur startup_bridge.bat sur le Bureau
echo   2. Verifiez: http://localhost:8766/health
echo   3. URL PERMANENTE: https://sc-bridge.cfargotunnel.com
echo.
echo IMPORTANT: Communiquez l'URL permanente a votre assistant
echo   https://sc-bridge.cfargotunnel.com
echo.
pause
