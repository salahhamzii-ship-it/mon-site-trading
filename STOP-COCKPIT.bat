@echo off
setlocal
title Arret Cockpit NQ

echo.
echo  === ARRET DU COCKPIT NQ ===
echo.

set "FOUND=0"

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8766 "') do (
    if not "%%a"=="0" (
        echo  Arret du processus PID %%a...
        taskkill /PID %%a /F >nul 2>&1
        set "FOUND=1"
    )
)

if "%FOUND%"=="0" (
    echo  Aucun processus trouve sur le port 8766.
    echo  Le bridge n'etait probablement pas lance.
) else (
    echo  Cockpit arrete.
)

echo.
timeout /t 2 /nobreak >nul
endlocal
