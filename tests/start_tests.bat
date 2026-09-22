@echo off
title NQ Bridge — Tests
color 0B
chcp 65001 >nul 2>&1

echo ============================================================
echo   NQ BRIDGE — SMOKE TESTS
echo ============================================================
echo.

set PYTHON=
where py      >nul 2>&1 && set PYTHON=py
if not defined PYTHON (where python3 >nul 2>&1 && set PYTHON=python3)
if not defined PYTHON (where python  >nul 2>&1 && set PYTHON=python)
if not defined PYTHON (
    echo [ERREUR] Python introuvable.
    pause & exit /b 1
)

cd /d %~dp0..
%PYTHON% tests\test_bridge.py -v

if errorlevel 1 (
    echo.
    echo [ECHEC] Certains tests ont echoue.
) else (
    echo.
    echo [OK] Tous les tests sont passes.
)
echo.
pause
