@echo off
title SC Bridge + ngrok
color 0A

:: Attendre que le reseau soit pret
timeout /t 8 /nobreak >nul

cd /d "%USERPROFILE%\Desktop\sc-bridge"
if not exist sc_bridge.js (
    echo [ERREUR] sc_bridge.js introuvable
    echo Telechargez sc_bridge.js depuis GitHub
    pause
    exit /b 1
)

echo ============================================================
echo   SC BRIDGE + NGROK - DEMARRAGE AUTOMATIQUE
echo ============================================================
echo.

:: Créer package.json ESM si absent
if not exist package.json (
    echo {"type":"module"} > package.json
    echo [OK] package.json ESM cree
)

:: Installer ws si absent
if not exist node_modules\ws (
    echo [INSTALL] Installation ws...
    npm install ws --save --prefix . >nul 2>&1
    echo [OK] ws installe
)

:: Tuer anciens processus
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/2] Demarrage SC Bridge (Node.js :8766)...
start "" /B node "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.js" > "%USERPROFILE%\Desktop\sc-bridge\sc_bridge.log" 2>&1
timeout /t 3 /nobreak >nul

:: ─── Trouver ngrok.exe ────────────────────────────────────────────────────────
echo [2/2] Recherche de ngrok.exe...
set NGROK_EXE=

:: 1. Dossier sc-bridge (Desktop)
if exist "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" (
    set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
    echo   [TROUVE] %USERPROFILE%\Desktop\sc-bridge\ngrok.exe
    goto :run_ngrok
)

:: 2. Desktop
if exist "%USERPROFILE%\Desktop\ngrok.exe" (
    set NGROK_EXE=%USERPROFILE%\Desktop\ngrok.exe
    echo   [TROUVE] %USERPROFILE%\Desktop\ngrok.exe
    goto :run_ngrok
)

:: 3. C:\ngrok\
if exist "C:\ngrok\ngrok.exe" (
    set NGROK_EXE=C:\ngrok\ngrok.exe
    echo   [TROUVE] C:\ngrok\ngrok.exe
    goto :run_ngrok
)

:: 4. C:\Program Files\ngrok\
if exist "C:\Program Files\ngrok\ngrok.exe" (
    set "NGROK_EXE=C:\Program Files\ngrok\ngrok.exe"
    echo   [TROUVE] C:\Program Files\ngrok\ngrok.exe
    goto :run_ngrok
)

:: 5. PATH (ngrok dans PATH)
where ngrok >nul 2>&1
if not errorlevel 1 (
    set NGROK_EXE=ngrok
    echo   [TROUVE] ngrok dans PATH
    goto :run_ngrok
)

:: 6. Pas trouve — chercher dans Downloads
if exist "%USERPROFILE%\Downloads\ngrok.exe" (
    copy "%USERPROFILE%\Downloads\ngrok.exe" "%USERPROFILE%\Desktop\sc-bridge\ngrok.exe" >nul
    set NGROK_EXE=%USERPROFILE%\Desktop\sc-bridge\ngrok.exe
    echo   [COPIE] ngrok.exe depuis Downloads vers sc-bridge
    goto :run_ngrok
)

echo.
echo ============================================================
echo   [ERREUR] ngrok.exe INTROUVABLE
echo ============================================================
echo   Telechargez ngrok depuis https://ngrok.com/download
echo   Placez ngrok.exe dans : %USERPROFILE%\Desktop\sc-bridge\
echo   Puis relancez ce script
echo ============================================================
echo.
echo Le bridge local est actif sur http://localhost:8766/health
echo Mais le cockpit Vercel sera OFFLINE sans ngrok.
echo.
goto :show_status

:run_ngrok
echo [2/2] Demarrage tunnel ngrok permanent...
start "" /B "%NGROK_EXE%" http --url=hatbox-placidly-crabmeat.ngrok-free.dev 8766 > "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>&1
timeout /t 5 /nobreak >nul

:: Verifier que ngrok a bien demarre
echo.
echo --- LOG NGROK (5 dernieres lignes) ---
type "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>nul
echo --- FIN LOG ---
echo.

:show_status
echo.
echo ============================================================
echo   STATUT
echo ============================================================
echo   Bridge local  : http://localhost:8766/health
echo   URL PERMANENTE: https://hatbox-placidly-crabmeat.ngrok-free.dev/health
echo   Log bridge    : %USERPROFILE%\Desktop\sc-bridge\sc_bridge.log
echo   Log ngrok     : %USERPROFILE%\Desktop\sc-bridge\ngrok.log
echo ============================================================
echo.
echo VERIFIER: http://localhost:8766/health doit repondre OK
echo.
echo Cette fenetre se ferme dans 20 secondes.
timeout /t 20 /nobreak >nul
