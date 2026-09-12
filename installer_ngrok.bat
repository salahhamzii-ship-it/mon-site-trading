@echo off
title Installer ngrok - Une seule fois
color 0E

echo ============================================================
echo   INSTALLATION NGROK - UNE SEULE FOIS
echo ============================================================
echo.

set DEST=%USERPROFILE%\Desktop\sc-bridge

:: Verifier si deja installe
if exist "%DEST%\ngrok.exe" (
    echo [OK] ngrok.exe deja present dans sc-bridge
    goto :test_ngrok
)

where ngrok >nul 2>&1
if not errorlevel 1 (
    echo [OK] ngrok deja dans PATH
    goto :test_ngrok
)

echo [1/3] Tentative via winget...
winget install ngrok.ngrok --accept-source-agreements --accept-package-agreements >nul 2>&1
if not errorlevel 1 (
    echo       OK - ngrok installe par winget
    goto :copy_from_path
)

echo       winget echoue — tentative via PowerShell...

echo [2/3] Telechargement ngrok.zip...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { ^
    $url='https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip'; ^
    $out='%TEMP%\ngrok.zip'; ^
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing; ^
    Write-Host '[DL OK]' ^
  } catch { Write-Host '[DL ECHEC]' $_.Exception.Message }"

if not exist "%TEMP%\ngrok.zip" (
    echo       [ERREUR] Telechargement impossible - pas de connexion ?
    goto :echec
)

echo [3/3] Extraction...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -Path '%TEMP%\ngrok.zip' -DestinationPath '%DEST%' -Force"

if exist "%DEST%\ngrok.exe" (
    echo       OK - ngrok.exe extrait dans sc-bridge
    goto :test_ngrok
)

:echec
echo.
echo [ERREUR] Installation impossible.
echo   Telechargez manuellement depuis : https://ngrok.com/download
echo   Placez ngrok.exe dans : %DEST%\
echo.
pause
exit /b 1

:copy_from_path
for /f "delims=" %%p in ('where ngrok 2^>nul') do (
    copy "%%p" "%DEST%\ngrok.exe" >nul 2>&1
    echo [OK] Copie dans sc-bridge
    goto :test_ngrok
)

:test_ngrok
echo.
echo [TEST] Verification ngrok...
if exist "%DEST%\ngrok.exe" (
    "%DEST%\ngrok.exe" version
    echo.
    echo [OK] ngrok pret.
    echo.
    echo ============================================================
    echo   NGROK INSTALLE - RELANCEZ startup_bridge.bat
echo ============================================================
) else (
    ngrok version 2>nul
)
echo.
pause
