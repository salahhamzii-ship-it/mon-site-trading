@echo off
title Installation NQ Alert
cd /d "%~dp0"
echo.
echo  Installation des dependances Python...
echo.
pip install -r requirements.txt
echo.
echo  Installation terminee.
echo  Editez config.json puis lancez LANCER_ALERT.bat
echo.
pause
