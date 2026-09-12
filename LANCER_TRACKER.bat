@echo off
title NQ SD Tracker — Bridge Sierra Chart
echo.
echo ==========================================
echo    NQ SD TRACKER — DEMARRAGE
echo ==========================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERREUR : Node.js non installe.
  echo Installer depuis https://nodejs.org
  pause
  exit /b 1
)

if not exist "sc_bridge.js" (
  echo ERREUR : sc_bridge.js introuvable dans ce dossier.
  echo Placer ce fichier .bat dans le meme dossier que sc_bridge.js
  pause
  exit /b 1
)

echo Demarrage du bridge...
echo Le tracker s'ouvrira automatiquement dans 3 secondes.
echo Laisser cette fenetre ouverte pendant toute la session.
echo.

start "" /B node sc_bridge.js
timeout /t 3 /nobreak >nul

start "" http://localhost:8766

echo Bridge actif. Fermer cette fenetre = arreter le tracker.
echo.
node sc_bridge.js
