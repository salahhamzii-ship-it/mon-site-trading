@echo off
title INSTALLATION AUTO-DEMARRAGE — NQ TRACKER
echo.
echo ==========================================
echo    NQ TRACKER — INSTALLATION AUTO-START
echo ==========================================
echo.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "HERE=%~dp0"

echo Installation dans le dossier Demarrage Windows...
copy /Y "%HERE%send_csv_silent.vbs" "%STARTUP%\send_csv_silent.vbs" >nul 2>&1

if %errorlevel% neq 0 (
  echo ERREUR : Impossible de copier dans le dossier Demarrage.
  echo Verifier les droits d'acces.
  pause
  exit /b 1
)

echo.
echo [OK] send_csv_silent.vbs installe dans :
echo      %STARTUP%
echo.
echo ==> A chaque demarrage Windows, l'envoi CSV demarre AUTOMATIQUEMENT.
echo ==> Aucune intervention requise.
echo.
echo Lancement immediat du bridge...
wscript "%HERE%send_csv_silent.vbs"
echo.
echo Bridge actif. Cette fenetre peut etre fermee.
timeout /t 5
