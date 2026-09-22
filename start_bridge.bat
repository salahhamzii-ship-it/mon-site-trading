@echo off
title NQ Bridge v2 — localhost:8766
color 0A
chcp 65001 >nul 2>&1

echo ============================================================
echo   NQ BRIDGE — LANCEMENT
echo ============================================================
echo.

:: ── 1. Python ──────────────────────────────────────────────────
set PYTHON=
where py      >nul 2>&1 && set PYTHON=py
if not defined PYTHON (
    where python3 >nul 2>&1 && set PYTHON=python3
)
if not defined PYTHON (
    where python  >nul 2>&1 && set PYTHON=python
)
if not defined PYTHON (
    echo [ERREUR] Python introuvable.
    echo Installez Python depuis https://python.org ^(cocher "Add to PATH"^)
    pause & exit /b 1
)
echo [OK] Python : %PYTHON%

:: ── 2. nq_bridge.py ────────────────────────────────────────────
set SCRIPT=%~dp0nq_bridge.py
if not exist "%SCRIPT%" (
    echo [ERREUR] nq_bridge.py introuvable dans %~dp0
    pause & exit /b 1
)
echo [OK] Script : %SCRIPT%

:: ── 3. config.json (validation JSON basique) ───────────────────
set CONFIG=%~dp0config.json
if not exist "%CONFIG%" (
    echo [WARN] config.json absent — valeurs par defaut utilisees
) else (
    %PYTHON% -c "import json,sys; json.load(open(sys.argv[1]))" "%CONFIG%" >nul 2>&1
    if errorlevel 1 (
        echo [ERREUR] config.json invalide ^(JSON mal forme^). Corriger avant de relancer.
        pause & exit /b 1
    )
    echo [OK] config.json valide
)

:: ── 4. Port 8766 libre ? ───────────────────────────────────────
netstat -ano | findstr ":8766 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARN] Port 8766 deja utilise.
    echo        Pour liberer : stop_bridge.bat ou Task Manager.
    echo        Le bridge detectera le conflit et affichera une erreur.
    echo.
)

:: ── 5. Lancement ───────────────────────────────────────────────
echo.
echo Lancement bridge sur http://localhost:8766 ...
echo Ctrl+C pour arreter.
echo.

:: Ouvrir Chrome sur le cockpit apres 2s (si Chrome installe)
timeout /t 2 /nobreak >nul 2>&1
start "" "http://localhost:8766/cockpit" >nul 2>&1

%PYTHON% "%SCRIPT%"

echo.
echo Bridge arrete. Appuyer sur une touche pour fermer.
pause >nul
