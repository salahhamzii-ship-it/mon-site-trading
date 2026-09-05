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

:: Créer package.json ESM si absent (requis par Node.js pour les import ESM)
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

echo [2/2] Demarrage tunnel ngrok permanent...
start "" /B ngrok http --domain=hatbox-placidly-crabmeat.ngrok-free.dev 8766 > "%USERPROFILE%\Desktop\sc-bridge\ngrok.log" 2>&1
timeout /t 5 /nobreak >nul

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
echo Services actifs. Ne pas fermer cette fenetre.
echo.
pause
