@echo off
title Arret NQ Bridge
color 0C
chcp 65001 >nul 2>&1

echo ============================================================
echo   ARRET NQ BRIDGE (nq_bridge.py uniquement)
echo ============================================================
echo.

:: Tuer UNIQUEMENT les processus python.exe dont la commande contient nq_bridge.py
:: (wmic permet de filtrer par ligne de commande — ne tue pas les autres Python)
set KILLED=0

for /f "tokens=1" %%P in ('wmic process where "name='python.exe' and commandline like '%%nq_bridge%%'" get processid ^| findstr /r "[0-9]"') do (
    echo Arret PID %%P ...
    taskkill /f /pid %%P >nul 2>&1
    set KILLED=1
)

for /f "tokens=1" %%P in ('wmic process where "name='python3.exe' and commandline like '%%nq_bridge%%'" get processid ^| findstr /r "[0-9]"') do (
    echo Arret PID %%P ^(python3^) ...
    taskkill /f /pid %%P >nul 2>&1
    set KILLED=1
)

if "%KILLED%"=="1" (
    echo.
    echo [OK] Bridge arrete.
) else (
    echo [INFO] Aucun processus nq_bridge.py en cours.
)

echo.
pause
