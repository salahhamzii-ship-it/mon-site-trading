@echo off
echo ================================================
echo   Installation SC Bridge au demarrage Windows
echo ================================================
echo.

:: Chemins
set "REPO=%~dp0"
set "VBS_SRC=%REPO%start_bridge.vbs"
set "VBS_DST=C:\SierraChart_CME\Data\start_bridge.vbs"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Etape 1 — verifier que start_bridge.vbs est dans le repo
if not exist "%VBS_SRC%" (
    echo ERREUR — start_bridge.vbs introuvable dans le repo.
    echo Verifiez que git pull a bien fonctionne.
    goto :fin
)
echo [1/3] start_bridge.vbs trouve dans le repo... OK

:: Etape 2 — copier vers SierraChart_CME\Data\
if not exist "C:\SierraChart_CME\Data\" (
    echo ERREUR — Dossier C:\SierraChart_CME\Data\ introuvable.
    echo Verifiez que Sierra Chart est installe.
    goto :fin
)
copy /Y "%VBS_SRC%" "%VBS_DST%" >nul
echo [2/3] Copie vers C:\SierraChart_CME\Data\... OK

:: Etape 3 — installer dans Startup Windows
copy /Y "%VBS_DST%" "%STARTUP%\start_bridge.vbs" >nul
if %errorlevel% == 0 (
    echo [3/3] Installation dans Startup Windows... OK
    echo.
    echo ================================================
    echo   SC Bridge demarrera automatiquement au
    echo   prochain demarrage de Windows.
    echo ================================================
) else (
    echo ERREUR — impossible d'ecrire dans le dossier Startup.
    echo Essayez de relancer ce .bat en tant qu'administrateur.
)

:fin
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
