@echo off
title NQ Alert — Methode Salah
cd /d "%~dp0"
echo.
echo  NQ ALERT — Session OVN 30 Min
echo  Appuyez sur Ctrl+C pour arreter
echo.
python alert.py
pause
