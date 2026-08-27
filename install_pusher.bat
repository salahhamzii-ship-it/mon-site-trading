@echo off
:: ============================================================
::  install_pusher.bat
::  Installe sc_pusher.py comme tâche Windows au démarrage
::  Lance-le UNE SEULE FOIS en tant qu'administrateur
:: ============================================================
title SC Pusher — Installation

set "DIR=%~dp0"
set "SCRIPT=%DIR%sc_pusher.py"
set "TASK=SierraBridgePusher"

echo.
echo ============================================================
echo   Installation SC Pusher
echo ============================================================
echo.

:: Vérifier Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR : Python non trouvé. Installe Python depuis python.org
    pause & exit /b 1
)

:: Installer paramiko
echo [1/3] Installation de paramiko...
pip install paramiko --quiet
if errorlevel 1 (
    echo ERREUR : pip install paramiko a échoué
    pause & exit /b 1
)
echo        OK

:: Créer la tâche planifiée
echo [2/3] Création tâche planifiée "%TASK%"...
schtasks /delete /tn "%TASK%" /f >nul 2>&1
schtasks /create ^
  /tn "%TASK%" ^
  /tr "pythonw \"%SCRIPT%\"" ^
  /sc ONLOGON ^
  /rl HIGHEST ^
  /f ^
  >nul
if errorlevel 1 (
    echo ERREUR : impossible de créer la tâche planifiée
    pause & exit /b 1
)
echo        OK

:: Démarrer immédiatement
echo [3/3] Démarrage immédiat...
schtasks /run /tn "%TASK%" >nul
echo        OK

echo.
echo ============================================================
echo   Pusher installé et démarré
echo   Démarre automatiquement à chaque connexion Windows
echo.
echo   Log   : %DIR%pusher.log
echo   Stop  : schtasks /end /tn SierraBridgePusher
echo   Start : schtasks /run /tn SierraBridgePusher
echo ============================================================
echo.
pause
