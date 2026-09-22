@echo off
title NQ Bridge Python
color 0A

echo ============================================================
echo   NQ BRIDGE PYTHON — localhost:8766
echo ============================================================

:: Chercher python dans l'ordre : py launcher, python3, python
set PYTHON=
where py     >nul 2>&1 && set PYTHON=py
if not defined PYTHON (
    where python3 >nul 2>&1 && set PYTHON=python3
)
if not defined PYTHON (
    where python  >nul 2>&1 && set PYTHON=python
)
if not defined PYTHON (
    echo [ERREUR] Python introuvable. Installer depuis https://python.org
    pause
    exit /b 1
)

:: Localiser nq_bridge.py dans le même dossier que ce .bat
set SCRIPT=%~dp0nq_bridge.py
if not exist "%SCRIPT%" (
    echo [ERREUR] nq_bridge.py introuvable dans %~dp0
    pause
    exit /b 1
)

echo [OK] Python : %PYTHON%
echo [OK] Script : %SCRIPT%
echo.
echo Lancement bridge...
echo.

%PYTHON% "%SCRIPT%"

echo.
echo Bridge arrêté.
pause
